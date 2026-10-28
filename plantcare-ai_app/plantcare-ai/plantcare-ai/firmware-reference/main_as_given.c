#include "stm32f4xx.h"
#include "plant_suitability_v3_model.h"
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#define OLED_ADDR 0x3C

/* Original SW2 plant-selection pushbutton: PB13 to GND, active-low. */
#define PLANT_BUTTON_PIN 13U
#define BUTTON_DEBOUNCE_MS 40U


#define LDR_CHANNEL      1U
#define HUMIDITY_CHANNEL 3U
#define SOIL_CHANNEL     4U

#define SCL_PIN 6U
#define SDA_PIN 7U

/* Example calibration values: adjust using your sensor */
#define HUM_ADC_DRY  4000
#define HUM_ADC_WET  3000

#define SOIL_ADC_DRY 3500
#define SOIL_ADC_WET 1500

static uint8_t framebuffer[1024];

/* =========================================================
   GPIO INITIALIZATION
   ========================================================= */

void GPIO_Init(void)
{
    RCC->AHB1ENR |= (1U << 0) | (1U << 1);
    (void)RCC->AHB1ENR;

    /* PA1, PA2, PA3 and PA4: analog inputs */
    GPIOA->MODER &= ~((3U << 2) | (3U << 4) |
                      (3U << 6) | (3U << 8));

    GPIOA->MODER |=  ((3U << 2) | (3U << 4) |
                      (3U << 6) | (3U << 8));

    GPIOA->PUPDR &= ~((3U << 2) | (3U << 4) |
                      (3U << 6) | (3U << 8));

    /* PB13: plant selection pushbutton, input with internal pull-up. */
    GPIOB->MODER &= ~(3U << (PLANT_BUTTON_PIN * 2U));
    GPIOB->PUPDR &= ~(3U << (PLANT_BUTTON_PIN * 2U));
    GPIOB->PUPDR |=  (1U << (PLANT_BUTTON_PIN * 2U));
    /* No LED, potentiometer or SW1 control. */
}

/* =========================================================
   ADC INITIALIZATION
   ========================================================= */

void ADC_Init(void)
{
    RCC->APB2ENR |= (1U << 8);
    (void)RCC->APB2ENR;

    /* ADC prescaler = PCLK2 / 4 */
    ADC->CCR &= ~(3U << 16);
    ADC->CCR |=  (1U << 16);

    ADC1->CR1 = 0;
    ADC1->CR2 = 0;
    ADC1->SQR1 = 0;

    /* Long sample times for ADC channels 1, 3 and 4 */
    ADC1->SMPR2 &= ~((7U << 3) | (7U << 6) |
                     (7U << 9) | (7U << 12));

    ADC1->SMPR2 |=  ((7U << 3) | (7U << 6) |
                     (7U << 9) | (7U << 12));

    ADC1->CR2 |= 1U;
}

uint16_t ADC_Read(uint8_t channel)
{
    uint32_t timeout = 1000000U;

    ADC1->SQR3 = channel;
    ADC1->SR = 0;
    ADC1->CR2 |= (1U << 30);

    while (!(ADC1->SR & (1U << 1)))
    {
        if (--timeout == 0U)
            return 0;
    }

    return (uint16_t)(ADC1->DR & 0x0FFFU);
}

/* =========================================================
   HUMIDITY PERCENTAGE ESTIMATE
   HR202 ANALOG MODULE
   ========================================================= */

uint8_t HR202_RelativeHumidity(uint16_t adc)
{
    int32_t rh;

    /* Assumes lower ADC means higher humidity */
    if (HUM_ADC_DRY == HUM_ADC_WET)
        return 0;

    if (adc >= HUM_ADC_DRY)
        return 20U;

    if (adc <= HUM_ADC_WET)
        return 95U;

    rh = 20 + ((int32_t)HUM_ADC_DRY - adc) * 75 /
              ((int32_t)HUM_ADC_DRY - HUM_ADC_WET);

    if (rh < 20) rh = 20;
    if (rh > 95) rh = 95;

    return (uint8_t)rh;
}

/* =========================================================
   SOIL MOISTURE PERCENTAGE
   ========================================================= */

uint8_t SoilMoisturePercent(uint16_t adc)
{
    int32_t percent;

    /*
     * Typical analog soil probes give higher ADC when dry
     * and lower ADC when wet. Verify this on your sensor.
     *
     * SOIL_ADC_DRY -> 0%
     * SOIL_ADC_WET -> 100%
     */

    if (SOIL_ADC_DRY == SOIL_ADC_WET)
        return 0;

    percent = ((int32_t)SOIL_ADC_DRY - adc) * 100 /
              ((int32_t)SOIL_ADC_DRY - SOIL_ADC_WET);

    if (percent < 0)
        percent = 0;

    if (percent > 100)
        percent = 100;

    return (uint8_t)percent;
}

/* =========================================================
   USART1 / HC-05
   ========================================================= */

void USART1_Init(void)
{
    RCC->APB2ENR |= (1U << 4);
    (void)RCC->APB2ENR;

    /* PA9 TX, PA10 RX, AF7 */
    GPIOA->MODER &= ~((3U << 18) | (3U << 20));
    GPIOA->MODER |=  ((2U << 18) | (2U << 20));

    GPIOA->AFR[1] &= ~((15U << 4) | (15U << 8));
    GPIOA->AFR[1] |=  ((7U << 4) | (7U << 8));

    /* Assumes PCLK2 = 16 MHz, baud = 115200 (8N1) */
    USART1->CR1 = 0;
    USART1->CR2 = 0;
    USART1->CR3 = 0;
    USART1->BRR = 0x008B;
    USART1->CR1 = (1U << 13) | (1U << 3) | (1U << 2);
}

void USART1_SendString(const char *s)
{
    while (*s)
    {
        while (!(USART1->SR & (1U << 7)))
        {
        }

        USART1->DR = (uint8_t)*s++;
    }
}

/* =========================================================
   I2C1: PB6 SCL, PB7 SDA
   ========================================================= */

void I2C1_Init(void)
{
    RCC->APB1ENR |= (1U << 21);
    (void)RCC->APB1ENR;

    GPIOB->MODER &= ~((3U << 12) | (3U << 14));
    GPIOB->MODER |=  ((2U << 12) | (2U << 14));

    GPIOB->OTYPER |= (1U << 6) | (1U << 7);
    GPIOB->OSPEEDR |= (3U << 12) | (3U << 14);
    GPIOB->PUPDR &= ~((3U << 12) | (3U << 14));

    GPIOB->AFR[0] &= ~((15U << 24) | (15U << 28));
    GPIOB->AFR[0] |=  ((4U << 24) | (4U << 28));

    I2C1->CR1 = (1U << 15);
    I2C1->CR1 = 0;
    I2C1->CR2 = 16U;
    I2C1->CCR = 80U;
    I2C1->TRISE = 17U;
    I2C1->CR1 |= 1U;
}

int I2C_WriteBuffer(uint8_t control,
                    const uint8_t *data,
                    uint16_t length)
{
    uint32_t timeout;

    timeout = 100000U;
    while (I2C1->SR2 & (1U << 1))
    {
        if (--timeout == 0U)
            return 0;
    }

    I2C1->CR1 |= (1U << 8);

    timeout = 100000U;
    while (!(I2C1->SR1 & (1U << 0)))
    {
        if (--timeout == 0U)
            goto error;
    }

    I2C1->DR = (OLED_ADDR << 1);

    timeout = 100000U;
    while (!(I2C1->SR1 & (1U << 1)))
    {
        if (--timeout == 0U)
            goto error;
    }

    (void)I2C1->SR1;
    (void)I2C1->SR2;

    timeout = 100000U;
    while (!(I2C1->SR1 & (1U << 7)))
    {
        if (--timeout == 0U)
            goto error;
    }

    I2C1->DR = control;

    for (uint16_t i = 0; i < length; i++)
    {
        timeout = 100000U;
        while (!(I2C1->SR1 & (1U << 7)))
        {
            if (--timeout == 0U)
                goto error;
        }

        I2C1->DR = data[i];
    }

    timeout = 100000U;
    while (!(I2C1->SR1 & (1U << 2)))
    {
        if (--timeout == 0U)
            goto error;
    }

    I2C1->CR1 |= (1U << 9);
    return 1;

error:
    I2C1->CR1 |= (1U << 9);
    return 0;
}

/* =========================================================
   OLED DRIVER
   ========================================================= */

void OLED_Command(uint8_t cmd)
{
    I2C_WriteBuffer(0x00, &cmd, 1);
}

void OLED_Init(void)
{
    OLED_Command(0xAE);
    OLED_Command(0xD5); OLED_Command(0x80);
    OLED_Command(0xA8); OLED_Command(0x3F);
    OLED_Command(0xD3); OLED_Command(0x00);
    OLED_Command(0x40);
    OLED_Command(0x8D); OLED_Command(0x14);
    OLED_Command(0x20); OLED_Command(0x02); /* page addressing */
    OLED_Command(0xA1);
    OLED_Command(0xC8);
    OLED_Command(0xDA); OLED_Command(0x12);
    OLED_Command(0x81); OLED_Command(0x7F);
    OLED_Command(0xD9); OLED_Command(0xF1);
    OLED_Command(0xDB); OLED_Command(0x40);
    OLED_Command(0xA4);
    OLED_Command(0xA6);
    OLED_Command(0xAF);
}

void OLED_Clear(void)
{
    memset(framebuffer, 0, sizeof(framebuffer));
}

void OLED_Pixel(uint8_t x, uint8_t y)
{
    if (x < 128U && y < 64U)
    {
        framebuffer[(y / 8U) * 128U + x] |=
            (uint8_t)(1U << (y % 8U));
    }
}

static const uint8_t font_digits[10][5] = {
    {62,65,65,65,62}, {0,66,127,64,0},
    {66,97,81,73,70}, {33,65,69,75,49},
    {24,20,18,127,16}, {39,69,69,69,57},
    {60,74,73,73,48}, {1,113,9,5,3},
    {54,73,73,73,54}, {6,73,73,41,30}
};

static const uint8_t font_letters[26][5] = {
    {126,17,17,17,126}, {127,73,73,73,54},
    {62,65,65,65,34}, {127,65,65,34,28},
    {127,73,73,73,65}, {127,9,9,9,1},
    {62,65,73,73,122}, {127,8,8,8,127},
    {0,65,127,65,0}, {32,64,65,63,1},
    {127,8,20,34,65}, {127,64,64,64,64},
    {127,2,12,2,127}, {127,4,8,16,127},
    {62,65,65,65,62}, {127,9,9,9,6},
    {62,65,81,33,94}, {127,9,25,41,70},
    {70,73,73,73,49}, {1,1,127,1,1},
    {63,64,64,64,63}, {31,32,64,32,31},
    {127,32,24,32,127}, {99,20,8,20,99},
    {7,8,112,8,7}, {97,81,73,69,67}
};

static const uint8_t *Font(char c)
{
    static const uint8_t blank[5] = {0,0,0,0,0};
    static const uint8_t colon[5] = {0,54,54,0,0};
    static const uint8_t dash[5] = {8,8,8,8,8};
    static const uint8_t percent[5] = {99,19,8,100,99};

    if (c >= '0' && c <= '9')
        return font_digits[c - '0'];

    if (c >= 'A' && c <= 'Z')
        return font_letters[c - 'A'];

    if (c == ':') return colon;
    if (c == '-') return dash;
    if (c == '%') return percent;

    return blank;
}

void OLED_Char(uint8_t x, uint8_t y, char c)
{
    const uint8_t *glyph = Font(c);

    for (uint8_t col = 0; col < 5; col++)
    {
        for (uint8_t row = 0; row < 7; row++)
        {
            if (glyph[col] & (1U << row))
                OLED_Pixel(x + col, y + row);
        }
    }
}

void OLED_Text(uint8_t x, uint8_t y, const char *s)
{
    while (*s && x <= 122U)
    {
        char c = *s++;

        if (c >= 'a' && c <= 'z')
            c = (char)(c - 'a' + 'A');

        OLED_Char(x, y, c);
        x += 6;
    }
}

void OLED_Update(void)
{
    for (uint8_t page = 0; page < 8; page++)
    {
        uint8_t cmd[3] = {
            (uint8_t)(0xB0U | page), 0x00, 0x10
        };

        I2C_WriteBuffer(0x00, cmd, 3);
        I2C_WriteBuffer(0x40, &framebuffer[page * 128U], 128);
    }
}

/* =========================================================
   CONFIGURATION - CALIBRATE BEFORE RELYING ON ALERTS
   ========================================================= */

/* Select the initial species. NodeMCU may later send PLANT=0 or PLANT=1. */
#define DEFAULT_PLANT 0U  /* 0=Aloe Vera, 1=Pothos */

/* LDR measured ADC at darkest and brightest test conditions. */
#define LDR_ADC_DARK   0U
#define LDR_ADC_BRIGHT 4095U
/* Set to 0 if high raw ADC actually means darkness in your circuit. */
#define LDR_HIGH_IS_BRIGHT 1U

/* Wide prototype ranges; NOT validated physiological limits. */
#define ALOE_SOIL_MIN 10U
#define ALOE_SOIL_MAX 45U
#define POTHOS_SOIL_MIN 20U
#define POTHOS_SOIL_MAX 70U
#define ALOE_AIR_MIN 20U
#define ALOE_AIR_MAX 75U
#define POTHOS_AIR_MIN 30U
#define POTHOS_AIR_MAX 85U

/* LDR percentage thresholds are placeholders needing calibration. */
#define ALOE_LIGHT_MIN_PCT 25U
#define ALOE_LIGHT_MAX_PCT 95U
#define POTHOS_LIGHT_MIN_PCT 15U
#define POTHOS_LIGHT_MAX_PCT 85U

/* Alert only after prolonged daytime exposure. */
#define LOW_LIGHT_WARN_MINUTES 180U
#define HIGH_LIGHT_WARN_MINUTES 120U
#define ASSUMED_TEMPERATURE_C 25.0f  /* No temperature sensor fitted */

/* Incoming NodeMCU UART lines: DAY=1, DAY=0, PLANT=0, PLANT=1.
   PB13 button can also toggle plant locally. */
static int8_t is_daytime = -1; /* -1 = time not provided */
static uint8_t plant_type = DEFAULT_PLANT;
static uint32_t low_light_seconds = 0U;
static uint32_t excessive_light_seconds = 0U;
static volatile uint32_t tick_ms = 0U;

/* Non-blocking debounce: toggle once per stable press, not while held. */
static void PlantButton_Process(void)
{
    static uint8_t initialized = 0U;
    static uint8_t last_raw = 0U;
    static uint8_t stable_pressed = 0U;
    static uint32_t changed_at_ms = 0U;
    uint8_t raw_pressed = ((GPIOB->IDR & (1U << PLANT_BUTTON_PIN)) == 0U) ? 1U : 0U;
    uint32_t now = tick_ms;

    if (!initialized)
    {
        initialized = 1U;
        last_raw = raw_pressed;
        stable_pressed = raw_pressed;
        changed_at_ms = now;
        return;
    }

    if (raw_pressed != last_raw)
    {
        last_raw = raw_pressed;
        changed_at_ms = now;
    }

    if ((uint32_t)(now - changed_at_ms) >= BUTTON_DEBOUNCE_MS &&
        stable_pressed != raw_pressed)
    {
        stable_pressed = raw_pressed;
        if (stable_pressed)
        {
            plant_type ^= 1U;
            /* Do not carry light exposure durations across plant selections. */
            low_light_seconds = 0U;
            excessive_light_seconds = 0U;
        }
    }
}

void SysTick_Handler(void)
{
    tick_ms++;
}

static uint8_t LDR_Percent(uint16_t adc)
{
    int32_t pct;
    int32_t span = (int32_t)LDR_ADC_BRIGHT - (int32_t)LDR_ADC_DARK;
    if (span <= 0) return 0U;
    pct = ((int32_t)adc - (int32_t)LDR_ADC_DARK) * 100 / span;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
#if LDR_HIGH_IS_BRIGHT == 0
    pct = 100 - pct;
#endif
    return (uint8_t)pct;
}

static void UART_ProcessIncoming(void)
{
    static char rxline[24];
    static uint8_t pos = 0U;
    while ((USART1->SR & (1U << 5)) != 0U)
    {
        char c = (char)(USART1->DR & 0xFFU);
        if (c == '\n' || c == '\r')
        {
            rxline[pos] = '\0';
            if (strcmp(rxline, "DAY=1") == 0) is_daytime = 1;
            else if (strcmp(rxline, "DAY=0") == 0) is_daytime = 0;
            else if (strcmp(rxline, "PLANT=0") == 0) plant_type = 0U;
            else if (strcmp(rxline, "PLANT=1") == 0) plant_type = 1U;
            pos = 0U;
        }
        else if (pos < sizeof(rxline) - 1U)
        {
            rxline[pos++] = c;
        }
        else pos = 0U;
    }
}

/* Two warnings fit in the last two OLED rows. Priority: water, light, humidity. */
static void AddWarning(const char **a, const char **b, const char *message)
{
    if (*a == 0) *a = message;
    else if (*b == 0) *b = message;
}

int main(void)
{
    uint16_t ldr_adc, humidity_adc, soil_adc;
    uint8_t sunlight, rh, soil_pct, soil_min, soil_max, air_min, air_max;
    uint8_t light_min, light_max;
    float ml_inputs[7];
    int ml_class;
    const char *warning1;
    const char *warning2;
    const char *plant_name;
    char line[32];
    char message[240];
    uint32_t last_sample_ms;
    uint32_t last_light_tick_ms;

    SystemCoreClockUpdate();
    GPIO_Init();
    ADC_Init();
    USART1_Init();
    I2C1_Init();
    OLED_Init();
    /* SystemCoreClock MUST reflect the actual clock configuration. */
    if (SysTick_Config(SystemCoreClock / 1000U) != 0U)
        while (1) { }

    OLED_Clear();
    OLED_Text(0, 0, "PLANT MONITOR");
    OLED_Text(0, 16, "STARTING...");
    OLED_Update();
    USART1_SendString("PLANT MONITOR V3 READY\r\n");

    last_sample_ms = tick_ms - 1000U;
    last_light_tick_ms = tick_ms;

    while (1)
    {
        uint32_t now;
        uint32_t elapsed_seconds;
        UART_ProcessIncoming();
        PlantButton_Process();
        now = tick_ms;
        if ((uint32_t)(now - last_sample_ms) < 1000U) continue;
        last_sample_ms = now;

        ldr_adc = ADC_Read(LDR_CHANNEL);
        humidity_adc = ADC_Read(HUMIDITY_CHANNEL);
        soil_adc = ADC_Read(SOIL_CHANNEL);
        sunlight = LDR_Percent(ldr_adc);
        rh = HR202_RelativeHumidity(humidity_adc);
        soil_pct = SoilMoisturePercent(soil_adc);

        if (plant_type == 0U)
        {
            plant_name = "ALOE VERA";
            soil_min = ALOE_SOIL_MIN; soil_max = ALOE_SOIL_MAX;
            air_min = ALOE_AIR_MIN; air_max = ALOE_AIR_MAX;
            light_min = ALOE_LIGHT_MIN_PCT; light_max = ALOE_LIGHT_MAX_PCT;
        }
        else
        {
            plant_name = "POTHOS";
            soil_min = POTHOS_SOIL_MIN; soil_max = POTHOS_SOIL_MAX;
            air_min = POTHOS_AIR_MIN; air_max = POTHOS_AIR_MAX;
            light_min = POTHOS_LIGHT_MIN_PCT; light_max = POTHOS_LIGHT_MAX_PCT;
        }

        /* Persistent light history ONLY counts during known daytime. */
        elapsed_seconds = (uint32_t)(now - last_light_tick_ms) / 1000U;
        if (elapsed_seconds > 0U)
        {
            last_light_tick_ms += elapsed_seconds * 1000U;
            if (is_daytime == 1)
            {
                if (sunlight < light_min)
                {
                    low_light_seconds += elapsed_seconds;
                    excessive_light_seconds = 0U;
                }
                else if (sunlight > light_max)
                {
                    excessive_light_seconds += elapsed_seconds;
                    low_light_seconds = 0U;
                }
                else
                {
                    low_light_seconds = 0U;
                    excessive_light_seconds = 0U;
                }
            }
            else
            {
                low_light_seconds = 0U;
                excessive_light_seconds = 0U;
            }
        }

        /* The ML model expects all seven inputs. Temperature is ASSUMED. */
        ml_inputs[0] = (float)plant_type;
        ml_inputs[1] = (float)soil_pct;
        ml_inputs[2] = ASSUMED_TEMPERATURE_C;
        ml_inputs[3] = (float)rh;
        ml_inputs[4] = is_daytime == 1 ? 1.0f : 0.0f;
        ml_inputs[5] = (float)(low_light_seconds / 60U);
        ml_inputs[6] = (float)(excessive_light_seconds / 60U);
        ml_class = predict_plant_suitability_v3(ml_inputs);

        warning1 = 0;
        warning2 = 0;
        if (soil_pct < soil_min) AddWarning(&warning1, &warning2, "NEEDS WATER");
        else if (soil_pct > soil_max) AddWarning(&warning1, &warning2, "SOIL TOO WET");

        /* Display over-brightness immediately, even if day/night is unknown.
           LOW-light alerts stay disabled because darkness may be nighttime.
           This is a provisional LDR threshold, NOT proof of plant damage. */
        if (sunlight > light_max)
            AddWarning(&warning1, &warning2, "TOO MUCH LIGHT");
        if (rh < air_min) AddWarning(&warning1, &warning2, "HUMIDITY LOW");
        else if (rh > air_max) AddWarning(&warning1, &warning2, "HUMIDITY HIGH");

        /* OLED: hide Day/Night only. Keep its internal ML/telemetry logic. */
        /* 128x64 SSD1306, eight 8-pixel rows, two warning slots. */
        OLED_Clear();
        snprintf(line, sizeof(line), "PLANT: %s", plant_name);
        OLED_Text(0, 0, line);
        snprintf(line, sizeof(line), "SUNLIGHT: %u%%", (unsigned)sunlight);
        OLED_Text(0, 8, line);
        snprintf(line, sizeof(line), "SOIL: %u%%", (unsigned)soil_pct);
        OLED_Text(0, 16, line);
        snprintf(line, sizeof(line), "HUMIDITY: %u%%", (unsigned)rh);
        OLED_Text(0, 24, line);
        OLED_Text(0, 32, warning1 ? "STATUS: ATTENTION" : "STATUS:");
        if (warning1)
        {
            OLED_Text(0, 40, warning1);
            if (warning2) OLED_Text(0, 48, warning2);
        }
        else
        {
            OLED_Text(0, 40, "CONDITIONS OPTIMAL");
        }
        OLED_Update();

        /* Retain machine-readable telemetry for NodeMCU/app; ML provisional. */
        snprintf(message, sizeof(message),
                 "PLANT=%s,ML_CLASS=%d,ML_PROVISIONAL=1,DAY=%d,"
                 "SUNLIGHT_PCT=%u,SOIL_PCT=%u,HUM_RH_EST=%u,"
                 "LDR_ADC=%u,HUM_ADC=%u,SOIL_RAW=%u,"
                 "LOW_LIGHT_MIN=%lu,HIGH_LIGHT_MIN=%lu,"
                 "WARN1=%s,WARN2=%s\r\n",
                 plant_type == 0U ? "ALOE_VERA" : "POTHOS",
                 ml_class, (int)is_daytime,
                 (unsigned)sunlight, (unsigned)soil_pct, (unsigned)rh,
                 (unsigned)ldr_adc, (unsigned)humidity_adc, (unsigned)soil_adc,
                 (unsigned long)(low_light_seconds / 60U),
                 (unsigned long)(excessive_light_seconds / 60U),
                 warning1 ? warning1 : "NONE", warning2 ? warning2 : "NONE");
        USART1_SendString(message);
    }
}