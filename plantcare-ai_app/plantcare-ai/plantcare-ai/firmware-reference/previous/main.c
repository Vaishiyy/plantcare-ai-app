
#include "stm32f4xx.h"
#include "plant_suitability_model.h"
#include <stdint.h>
#include <stdio.h>
#include <string.h>

#define OLED_ADDR 0x3C

#define LED_PIN   8U
#define SW1_PIN   12U
#define SW2_PIN   13U

#define LDR_CHANNEL      1U
#define POT_CHANNEL      2U
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

    /* PA8: LED output */
    GPIOA->MODER &= ~(3U << 16);
    GPIOA->MODER |=  (1U << 16);
    GPIOA->OTYPER &= ~(1U << LED_PIN);
    GPIOA->BSRR = (1U << (LED_PIN + 16U));

    /* PB12 and PB13: active-low switches with pull-ups */
    GPIOB->MODER &= ~((3U << 24) | (3U << 26));
    GPIOB->PUPDR &= ~((3U << 24) | (3U << 26));
    GPIOB->PUPDR |=  ((1U << 24) | (1U << 26));
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

    /* Long sample times for ADC channels 1, 2, 3 and 4 */
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

    /* Assumes PCLK2 = 16 MHz, baud = 9600 */
    USART1->CR1 = 0;
    USART1->CR2 = 0;
    USART1->CR3 = 0;
    USART1->BRR = 0x0683;
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
    OLED_Command(0x20); OLED_Command(0x00);
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
   MAIN
   ========================================================= */

int main(void)
{
    uint16_t ldr, pot, humidity_adc, soil;
    uint8_t sw1, sw2, rh, soil_percent;
    uint8_t previous_sw2 = 0U;
    uint8_t plant_type = 0U; /* 0 = Aloe Vera, 1 = Pothos */
    int prediction;
    float features[5];
    const float assumed_temperature_c = 25.0f;
    char line[24];
    char message[200];
    const char *plant_name;
    const char *prediction_name;

    SystemCoreClockUpdate();

    GPIO_Init();
    ADC_Init();
    USART1_Init();
    I2C1_Init();
    OLED_Init();

    USART1_SendString("STM32 PLANT MONITOR WITH DECISION TREE STARTED\r\n");
    USART1_SendString("SW2 toggles plant: Aloe Vera / Pothos. Temperature assumed 25 C.\r\n");

    while (1)
    {
        ldr          = ADC_Read(LDR_CHANNEL);
        pot          = ADC_Read(POT_CHANNEL);
        humidity_adc = ADC_Read(HUMIDITY_CHANNEL);
        soil         = ADC_Read(SOIL_CHANNEL);

        sw1 = ((GPIOB->IDR & (1U << SW1_PIN)) == 0U);
        sw2 = ((GPIOB->IDR & (1U << SW2_PIN)) == 0U);

        /* SW2 toggles the plant selection on a new press.
           SW1 continues to control the LED. */
        if (sw2 && !previous_sw2)
        {
            plant_type = (uint8_t)(plant_type ^ 1U);

            /* Simple debounce delay. */
            for (volatile uint32_t d = 0; d < 150000U; d++)
            {
            }
        }
        previous_sw2 = sw2;

        rh = HR202_RelativeHumidity(humidity_adc);
        soil_percent = SoilMoisturePercent(soil);

        if (sw1)
            GPIOA->BSRR = (1U << LED_PIN);
        else
            GPIOA->BSRR = (1U << (LED_PIN + 16U));

        /* Decision Tree feature order must match the header:
           [0] plant type, [1] soil %, [2] temperature C,
           [3] air humidity %, [4] raw LDR ADC. */
        features[0] = (float)plant_type;
        features[1] = (float)soil_percent;
        features[2] = assumed_temperature_c;
        features[3] = (float)rh;
        features[4] = (float)ldr;

        prediction = predict_plant_suitability(features);

        if (plant_type == 0U)
            plant_name = "ALOE VERA";
        else
            plant_name = "POTHOS";

        if (prediction == 0)
            prediction_name = "HIGH STRESS";
        else if (prediction == 1)
            prediction_name = "MODERATE STRESS";
        else
            prediction_name = "SUITABLE";

        OLED_Clear();

        OLED_Text(0, 0, "LDR:");
        snprintf(line, sizeof(line), "%u", (unsigned)ldr);
        OLED_Text(30, 0, line);

        OLED_Text(0, 8, "POT:");
        snprintf(line, sizeof(line), "%u", (unsigned)pot);
        OLED_Text(30, 8, line);

        OLED_Text(0, 16, "HUM:");
        snprintf(line, sizeof(line), "%u PCT", (unsigned)rh);
        OLED_Text(30, 16, line);

        OLED_Text(0, 24, "SOIL:");
        snprintf(line, sizeof(line), "%u PCT", (unsigned)soil_percent);
        OLED_Text(36, 24, line);

        OLED_Text(0, 32, "PLANT:");
        OLED_Text(42, 32, plant_name);

        OLED_Text(0, 40, "ML:");
        OLED_Text(18, 40, prediction_name);

        OLED_Text(0, 48, "SW1:");
        OLED_Text(30, 48, sw1 ? "ON" : "OFF");

        OLED_Text(0, 56, "TEMP:25C ASSUMED");

        OLED_Update();

        snprintf(message, sizeof(message),
                 "PLANT=%s,ML_CLASS=%d,ML_STATUS=%s,"
                 "TEMP_C_ASSUMED=25,SOIL_PCT=%u,HUM_RH_EST=%u,"
                 "HUM_ADC=%u,SOIL_RAW=%u,LDR_ADC=%u,POT_ADC=%u,"
                 "SW1=%u,SW2=%u\r\n",
                 plant_type == 0U ? "ALOE_VERA" : "POTHOS",
                 prediction,
                 prediction_name,
                 (unsigned)soil_percent,
                 (unsigned)rh,
                 (unsigned)humidity_adc,
                 (unsigned)soil,
                 (unsigned)ldr,
                 (unsigned)pot,
                 (unsigned)sw1,
                 (unsigned)sw2);

        USART1_SendString(message);

        for (volatile uint32_t i = 0; i < 800000U; i++)
        {
        }
    }
}
