// protocol.h — STM32 (main.c, PLANT MONITOR V3) UART line parser + JSON encoder.
// The same code is pasted between PROTOCOL BEGIN / END in PlantCareBridge.ino.
// Plain C/C++11, no Arduino dependencies, so it can be unit-tested on a PC.
#pragma once
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define PC_MAX_LINE 256   // main.c builds each line in char message[240]

struct PcReading {
  uint8_t  plant;          // 0 = ALOE_VERA, 1 = POTHOS
  uint8_t  mlClass;        // 0 = HIGH STRESS, 1 = MODERATE STRESS, 2 = SUITABLE
  uint8_t  mlProvisional;  // 1 while the model is marked provisional in main.c
  int8_t   day;            // -1 = unknown (no DAY= received), 0 = night, 1 = day
  uint8_t  sunlightPct;    // 0..100 (LDR scaled in main.c)
  uint8_t  soilPct;        // 0..100
  uint8_t  humRhEst;       // estimated %RH (main.c clamps to 20..95)
  uint16_t ldrAdc, humAdc, soilRaw;  // 0..4095
  uint32_t lowLightMin;    // minutes of continuous low light (daytime only)
  uint32_t highLightMin;   // minutes of continuous excessive light (daytime only)
  uint8_t  warn1, warn2;   // index into PC_WARN_NAMES (0 = NONE)
};

enum PcParseResult {
  PC_OK = 0,
  PC_IGNORED,   // not a reading (startup banner, noise) — not counted as an error
  PC_INVALID    // looked like a reading but failed validation
};

static const char *const PC_PLANT_NAMES[2]  = {"ALOE_VERA", "POTHOS"};
static const char *const PC_STATUS_NAMES[3] = {"HIGH STRESS", "MODERATE STRESS", "SUITABLE"};
// Every warning text main.c can send in WARN1 / WARN2.
#define PC_WARN_COUNT 7
static const char *const PC_WARN_NAMES[PC_WARN_COUNT] = {
  "NONE", "NEEDS WATER", "SOIL TOO WET", "NEEDS MORE LIGHT", "TOO MUCH LIGHT",
  "HUMIDITY LOW", "HUMIDITY HIGH"};
#define PC_MAX_MINUTES 71582788L   // 0xFFFFFFFF seconds / 60

// Strict unsigned integer parse: digits only, within [lo, hi].
static inline bool pcParseUInt(const char *s, long lo, long hi, long *out) {
  if (!s || !*s) return false;
  if (strlen(s) > 8) return false;
  for (const char *p = s; *p; ++p)
    if (*p < '0' || *p > '9') return false;
  long v = strtol(s, NULL, 10);
  if (v < lo || v > hi) return false;
  *out = v;
  return true;
}

static inline int pcWarnIndex(const char *s) {
  for (int i = 0; i < PC_WARN_COUNT; i++)
    if (strcmp(s, PC_WARN_NAMES[i]) == 0) return i;
  return -1;
}

// Parses one line (with or without trailing CR/LF). Fills `out` only on PC_OK.
// Unknown keys are ignored (so a small firmware addition does not break the link),
// but every key below must appear exactly once with a valid value.
static inline PcParseResult pcParseLine(const char *line, PcReading *out) {
  if (!line) return PC_IGNORED;
  size_t n = strlen(line);
  while (n > 0 && (line[n - 1] == '\r' || line[n - 1] == '\n' || line[n - 1] == ' ')) n--;
  if (n == 0) return PC_IGNORED;
  if (strncmp(line, "PLANT=", 6) != 0) return PC_IGNORED;  // banner / noise
  if (n >= PC_MAX_LINE) return PC_INVALID;

  char buf[PC_MAX_LINE];
  memcpy(buf, line, n);
  buf[n] = '\0';

  enum { K_PLANT, K_CLASS, K_PROV, K_DAY, K_SUN, K_SOIL, K_HUM, K_LDR, K_HUMADC, K_SOILRAW,
         K_LOWMIN, K_HIGHMIN, K_W1, K_W2, K_COUNT };
  static const char *const keys[K_COUNT] = {
    "PLANT", "ML_CLASS", "ML_PROVISIONAL", "DAY", "SUNLIGHT_PCT", "SOIL_PCT", "HUM_RH_EST",
    "LDR_ADC", "HUM_ADC", "SOIL_RAW", "LOW_LIGHT_MIN", "HIGH_LIGHT_MIN", "WARN1", "WARN2"};
  const char *vals[K_COUNT] = {0};

  char *save = NULL;
  for (char *tok = strtok_r(buf, ",", &save); tok; tok = strtok_r(NULL, ",", &save)) {
    char *eq = strchr(tok, '=');
    if (!eq) return PC_INVALID;
    *eq = '\0';
    int k = -1;
    for (int i = 0; i < K_COUNT; i++)
      if (strcmp(tok, keys[i]) == 0) { k = i; break; }
    if (k < 0) continue;              // unknown key: ignore
    if (vals[k]) return PC_INVALID;   // duplicate key
    vals[k] = eq + 1;
  }
  for (int i = 0; i < K_COUNT; i++)
    if (!vals[i]) return PC_INVALID;  // missing key

  PcReading r;
  long v;
  if (strcmp(vals[K_PLANT], "ALOE_VERA") == 0) r.plant = 0;
  else if (strcmp(vals[K_PLANT], "POTHOS") == 0) r.plant = 1;
  else return PC_INVALID;

  if (!pcParseUInt(vals[K_CLASS], 0, 2, &v)) return PC_INVALID;
  r.mlClass = (uint8_t)v;
  if (!pcParseUInt(vals[K_PROV], 0, 1, &v)) return PC_INVALID;
  r.mlProvisional = (uint8_t)v;

  if (strcmp(vals[K_DAY], "-1") == 0) r.day = -1;
  else if (strcmp(vals[K_DAY], "0") == 0) r.day = 0;
  else if (strcmp(vals[K_DAY], "1") == 0) r.day = 1;
  else return PC_INVALID;

  if (!pcParseUInt(vals[K_SUN], 0, 100, &v)) return PC_INVALID;
  r.sunlightPct = (uint8_t)v;
  if (!pcParseUInt(vals[K_SOIL], 0, 100, &v)) return PC_INVALID;
  r.soilPct = (uint8_t)v;
  if (!pcParseUInt(vals[K_HUM], 0, 100, &v)) return PC_INVALID;
  r.humRhEst = (uint8_t)v;
  if (!pcParseUInt(vals[K_LDR], 0, 4095, &v)) return PC_INVALID;
  r.ldrAdc = (uint16_t)v;
  if (!pcParseUInt(vals[K_HUMADC], 0, 4095, &v)) return PC_INVALID;
  r.humAdc = (uint16_t)v;
  if (!pcParseUInt(vals[K_SOILRAW], 0, 4095, &v)) return PC_INVALID;
  r.soilRaw = (uint16_t)v;
  if (!pcParseUInt(vals[K_LOWMIN], 0, PC_MAX_MINUTES, &v)) return PC_INVALID;
  r.lowLightMin = (uint32_t)v;
  if (!pcParseUInt(vals[K_HIGHMIN], 0, PC_MAX_MINUTES, &v)) return PC_INVALID;
  r.highLightMin = (uint32_t)v;

  int w = pcWarnIndex(vals[K_W1]);
  if (w < 0) return PC_INVALID;
  r.warn1 = (uint8_t)w;
  w = pcWarnIndex(vals[K_W2]);
  if (w < 0) return PC_INVALID;
  r.warn2 = (uint8_t)w;

  *out = r;
  return PC_OK;
}

// Encodes a reading as the JSON body POSTed to the server. Returns bytes written (0 on overflow).
static inline size_t pcReadingToJson(const PcReading *r, uint32_t seq, uint32_t uptimeMs,
                                     char *buf, size_t cap) {
  int n = snprintf(buf, cap,
    "{\"type\":\"reading\",\"seq\":%lu,\"esp_uptime_ms\":%lu,\"plant\":\"%s\","
    "\"ml_class\":%u,\"ml_status\":\"%s\",\"ml_provisional\":%u,\"day\":%d,"
    "\"sunlight_pct\":%u,\"soil_pct\":%u,\"hum_rh_est\":%u,"
    "\"ldr_adc\":%u,\"hum_adc\":%u,\"soil_raw\":%u,"
    "\"low_light_min\":%lu,\"high_light_min\":%lu,\"warn1\":\"%s\",\"warn2\":\"%s\"}",
    (unsigned long)seq, (unsigned long)uptimeMs, PC_PLANT_NAMES[r->plant],
    (unsigned)r->mlClass, PC_STATUS_NAMES[r->mlClass], (unsigned)r->mlProvisional, (int)r->day,
    (unsigned)r->sunlightPct, (unsigned)r->soilPct, (unsigned)r->humRhEst,
    (unsigned)r->ldrAdc, (unsigned)r->humAdc, (unsigned)r->soilRaw,
    (unsigned long)r->lowLightMin, (unsigned long)r->highLightMin,
    PC_WARN_NAMES[r->warn1], PC_WARN_NAMES[r->warn2]);
  return (n > 0 && (size_t)n < cap) ? (size_t)n : 0;
}
