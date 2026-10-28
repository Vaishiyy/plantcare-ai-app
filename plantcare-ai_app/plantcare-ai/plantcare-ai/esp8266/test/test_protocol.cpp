// Host-side unit test for protocol.h.
// Build & run:  g++ -std=c++11 -Wall -Wextra -I. test_protocol.cpp -o t && ./t
#include "protocol.h"

static int failures = 0;
#define CHECK(c) do { if (!(c)) { printf("FAIL line %d: %s\n", __LINE__, #c); failures++; } } while (0)

// Produces a line with the *exact* snprintf call used in stm32/main.c (char message[240]).
static void firmwareLine(char *message, size_t cap, unsigned plant_type, int ml_class, int is_daytime,
                         unsigned sunlight, unsigned soil_pct, unsigned rh,
                         unsigned ldr_adc, unsigned humidity_adc, unsigned soil_adc,
                         unsigned long low_s, unsigned long high_s,
                         const char *warning1, const char *warning2) {
  snprintf(message, cap,
           "PLANT=%s,ML_CLASS=%d,ML_PROVISIONAL=1,DAY=%d,"
           "SUNLIGHT_PCT=%u,SOIL_PCT=%u,HUM_RH_EST=%u,"
           "LDR_ADC=%u,HUM_ADC=%u,SOIL_RAW=%u,"
           "LOW_LIGHT_MIN=%lu,HIGH_LIGHT_MIN=%lu,"
           "WARN1=%s,WARN2=%s\r\n",
           plant_type == 0U ? "ALOE_VERA" : "POTHOS",
           ml_class, is_daytime,
           sunlight, soil_pct, rh,
           ldr_adc, humidity_adc, soil_adc,
           low_s / 60U, high_s / 60U,
           warning1 ? warning1 : "NONE", warning2 ? warning2 : "NONE");
}

int main() {
  char line[240], json[640];
  PcReading r;

  // 1. Every plant / class / day combination parses.
  for (unsigned p = 0; p < 2; p++)
    for (int c = 0; c < 3; c++)
      for (int d = -1; d <= 1; d++) {
        firmwareLine(line, sizeof line, p, c, d, 61, 38, 52, 2500, 3610, 2740, 0, 0, 0, 0);
        CHECK(pcParseLine(line, &r) == PC_OK);
        CHECK(r.plant == p && r.mlClass == c && r.day == d && r.mlProvisional == 1);
        CHECK(r.sunlightPct == 61 && r.soilPct == 38 && r.humRhEst == 52);
        CHECK(r.ldrAdc == 2500 && r.humAdc == 3610 && r.soilRaw == 2740);
        CHECK(r.lowLightMin == 0 && r.highLightMin == 0 && r.warn1 == 0 && r.warn2 == 0);
      }

  // Every warning text main.c can send.
  for (int a = 0; a < PC_WARN_COUNT; a++)
    for (int b = 0; b < PC_WARN_COUNT; b++) {
      firmwareLine(line, sizeof line, 0, 1, -1, 10, 5, 20, 400, 4000, 3500, 0, 0,
                   a ? PC_WARN_NAMES[a] : NULL, b ? PC_WARN_NAMES[b] : NULL);
      CHECK(pcParseLine(line, &r) == PC_OK && r.warn1 == a && r.warn2 == b);
    }

  // Worst-case length still fits main.c's 240-byte buffer and our parser.
  firmwareLine(line, sizeof line, 0, 0, -1, 100, 100, 95, 4095, 4095, 4095,
               0xFFFFFFFFUL, 0xFFFFFFFFUL, "NEEDS MORE LIGHT", "HUMIDITY HIGH");
  printf("worst-case line (%zu bytes): %s", strlen(line), line);
  CHECK(strlen(line) < 239);
  CHECK(pcParseLine(line, &r) == PC_OK && r.lowLightMin == 71582788UL);

  // A real line captured from the format, all zeros.
  CHECK(pcParseLine("PLANT=POTHOS,ML_CLASS=0,ML_PROVISIONAL=1,DAY=-1,SUNLIGHT_PCT=0,SOIL_PCT=0,"
                    "HUM_RH_EST=20,LDR_ADC=0,HUM_ADC=4095,SOIL_RAW=4095,LOW_LIGHT_MIN=0,"
                    "HIGH_LIGHT_MIN=0,WARN1=NEEDS WATER,WARN2=NONE", &r) == PC_OK);

  // 2. JSON output.
  firmwareLine(line, sizeof line, 1, 1, -1, 61, 38, 52, 2500, 3610, 2740, 7200, 0, "NEEDS WATER", NULL);
  CHECK(pcParseLine(line, &r) == PC_OK);
  size_t n = pcReadingToJson(&r, 42, 123456, json, sizeof json);
  CHECK(n > 0);
  CHECK(strcmp(json,
    "{\"type\":\"reading\",\"seq\":42,\"esp_uptime_ms\":123456,\"plant\":\"POTHOS\","
    "\"ml_class\":1,\"ml_status\":\"MODERATE STRESS\",\"ml_provisional\":1,\"day\":-1,"
    "\"sunlight_pct\":61,\"soil_pct\":38,\"hum_rh_est\":52,"
    "\"ldr_adc\":2500,\"hum_adc\":3610,\"soil_raw\":2740,"
    "\"low_light_min\":120,\"high_light_min\":0,\"warn1\":\"NEEDS WATER\",\"warn2\":\"NONE\"}") == 0);
  printf("reading json: %s\n", json);
  CHECK(pcReadingToJson(&r, 1, 1, json, 20) == 0);  // overflow detected

  // 3. Banner lines from main.c are ignored, not counted invalid.
  CHECK(pcParseLine("PLANT MONITOR V3 READY\r\n", &r) == PC_IGNORED);
  CHECK(pcParseLine("SW2 toggles plant: Aloe Vera / Pothos.\r\n", &r) == PC_IGNORED);
  CHECK(pcParseLine("\r\n", &r) == PC_IGNORED);
  CHECK(pcParseLine("", &r) == PC_IGNORED);

  // 4. Unknown extra keys are tolerated.
  firmwareLine(line, sizeof line, 0, 2, 1, 50, 30, 40, 2000, 3500, 2500, 0, 0, NULL, NULL);
  line[strlen(line) - 2] = 0;  // drop CRLF
  strcat(line, ",TEMP_C=25");
  CHECK(pcParseLine(line, &r) == PC_OK && r.mlClass == 2);

  // 5. Invalid lines.
  const char *ok = "ML_CLASS=1,ML_PROVISIONAL=1,DAY=-1,SUNLIGHT_PCT=5,SOIL_PCT=38,HUM_RH_EST=52,"
                   "LDR_ADC=1,HUM_ADC=1,SOIL_RAW=1,LOW_LIGHT_MIN=0,HIGH_LIGHT_MIN=0";
  char b[16][300];
  snprintf(b[0], 300, "PLANT=CACTUS,%s,WARN1=NONE,WARN2=NONE", ok);
  snprintf(b[1], 300, "PLANT=POTHOS,%s,WARN1=NEEDS WAT,WARN2=NONE", ok);          // truncated warning
  snprintf(b[2], 300, "PLANT=POTHOS,%s,WARN1=NONE", ok);                          // missing WARN2
  snprintf(b[3], 300, "PLANT=POTHOS,%s,WARN1=NONE,WARN2=NONE,WARN2=NONE", ok);    // duplicate
  snprintf(b[4], 300, "PLANT=POTHOS,ML_CLASS=3,ML_PROVISIONAL=1,DAY=-1,SUNLIGHT_PCT=5,SOIL_PCT=38,HUM_RH_EST=52,LDR_ADC=1,HUM_ADC=1,SOIL_RAW=1,LOW_LIGHT_MIN=0,HIGH_LIGHT_MIN=0,WARN1=NONE,WARN2=NONE");
  snprintf(b[5], 300, "PLANT=POTHOS,ML_CLASS=1,ML_PROVISIONAL=1,DAY=2,SUNLIGHT_PCT=5,SOIL_PCT=38,HUM_RH_EST=52,LDR_ADC=1,HUM_ADC=1,SOIL_RAW=1,LOW_LIGHT_MIN=0,HIGH_LIGHT_MIN=0,WARN1=NONE,WARN2=NONE");
  snprintf(b[6], 300, "PLANT=POTHOS,ML_CLASS=1,ML_PROVISIONAL=1,DAY=-1,SUNLIGHT_PCT=101,SOIL_PCT=38,HUM_RH_EST=52,LDR_ADC=1,HUM_ADC=1,SOIL_RAW=1,LOW_LIGHT_MIN=0,HIGH_LIGHT_MIN=0,WARN1=NONE,WARN2=NONE");
  snprintf(b[7], 300, "PLANT=POTHOS,ML_CLASS=1,ML_PROVISIONAL=1,DAY=-1,SUNLIGHT_PCT=5,SOIL_PCT=3x,HUM_RH_EST=52,LDR_ADC=1,HUM_ADC=1,SOIL_RAW=1,LOW_LIGHT_MIN=0,HIGH_LIGHT_MIN=0,WARN1=NONE,WARN2=NONE");
  snprintf(b[8], 300, "PLANT=POTHOS,ML_CLASS=1,ML_PROVISIONAL=1,DAY=-1,SUNLIGHT_PCT=5,SOIL_PCT=38,HUM_RH_EST=52,LDR_ADC=4096,HUM_ADC=1,SOIL_RAW=1,LOW_LIGHT_MIN=0,HIGH_LIGHT_MIN=0,WARN1=NONE,WARN2=NONE");
  snprintf(b[9], 300, "PLANT=POTHOS,ML_CLASS=1,ML_PROVISIONAL=1,DAY=-1,SUNLIGHT_PCT=5,SOIL_PCT=-5,HUM_RH_EST=52,LDR_ADC=1,HUM_ADC=1,SOIL_RAW=1,LOW_LIGHT_MIN=0,HIGH_LIGHT_MIN=0,WARN1=NONE,WARN2=NONE");
  snprintf(b[10], 300, "PLANT=POTHOS,ML_CLASS=1,ML_PROVISIONAL=1,DAY=-1,SUNLIGHT_PCT=5,SOIL_PCT=38,HUM_RH_EST=52,LDR_ADC=1,HUM_ADC=1,SOIL_R@W=1,LOW_LIGHT_MIN=0,HIGH_LIGHT_MIN=0,WARN1=NONE,WARN2=NONE"); // garbled key
  snprintf(b[11], 300, "PLANT=POTHOS,ML_CLASS=1,ML_PROVISIONAL=1,DAY=-1,SUNLIGHT_PCT=5,SOIL_PCT=38,HUM_RH_EST=52,LDR_ADC=1,HUM_ADC=1,SOIL_RAW=1,LOW_LIGHT_MIN=0,HIGH_LIGHT_MIN=,WARN1=NONE,WARN2=NONE"); // empty value
  snprintf(b[12], 300, "PLANT=POTHOS,ML_CLASS=1,ML_PROVISIONAL=1,DAY=-1,SUNLIGHT_PCT=5,SOIL_PCT=38,HUM_RH_EST=52,LDR_ADC=1,HUM_ADC=1,SOIL_RAW=1,LOW_LIGHT_MIN=999999999,HIGH_LIGHT_MIN=0,WARN1=NONE,WARN2=NONE");
  snprintf(b[13], 300, "PLANT=POTHOS,ML_CLASS=1,ML_PROVISIONAL=1,DAY=-1,SUNLIGHT_PCT=5,SOIL_PCT=38,HUM_RH_EST=52,LDR_ADC=1,HUM_ADC=1,SOIL_RAW=1,LOW_LIGHT_MIN=0,HIGH_LIGHT_MIN=0,WARN1NONE,WARN2=NONE"); // no '='
  for (int i = 0; i < 14; i++) {
    PcParseResult res = pcParseLine(b[i], &r);
    if (res != PC_INVALID) printf("  bad[%d] not rejected\n", i);
    CHECK(res == PC_INVALID);
  }
  // Overlong
  char longl[400];
  memset(longl, 'A', sizeof longl); memcpy(longl, "PLANT=", 6); longl[399] = 0;
  CHECK(pcParseLine(longl, &r) == PC_INVALID);

  printf(failures ? "%d FAILURE(S)\n" : "ALL PROTOCOL TESTS PASSED\n", failures);
  return failures ? 1 : 0;
}
