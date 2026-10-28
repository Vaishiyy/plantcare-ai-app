/*
 * PlantCareBridge.ino — NodeMCU ESP8266 bridge for PlantCare AI (STM32 firmware "PLANT MONITOR V3")
 * Bridge version 3 (sent as "bridge_version" so the app can tell an outdated sketch apart).
 *
 * Wiring (one direction only):
 *          STM32 PA9 (USART1 TX, 115200 8N1) -> NodeMCU RX pin (GPIO3)
 *          STM32 GND -> NodeMCU GND
 *          NodeMCU TX is NOT connected, so nothing is sent back to the STM32.
 *          The STM32 therefore reports DAY=-1 (unknown); the laptop server adds day/night for the app.
 *          The plant is chosen with the SW2 button (PB13) on the STM32 board.
 *          main.c shows TOO MUCH LIGHT straight away (day or night); low-light warnings stay off.
 *
 * 1. Joins your phone hotspot.
 * 2. Reads the STM32's lines on the hardware RX pin at 115200.
 * 3. Checks each PLANT=... line and POSTs it as JSON to the PlantCare Flask server:
 *       http://<laptop-IP>:5000/api/readings
 * 4. Still serves the latest reading at http://<ESP-IP>/data for quick checks in a browser.
 *
 * IMPORTANT: unplug the PA9 -> RX wire while uploading this sketch over USB,
 *            then plug it back in. (The USB chip also uses the RX pin.)
 *
 * Needs only the "esp8266 by ESP8266 Community" board package.
 * Serial Monitor: 115200 baud (shows the debug messages below).
 */

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

/* ======================= CHANGE THESE ======================= */
const char* ssid       = "YOUR_WIFI_SSID";
const char* password   = "YOUR_WIFI_PASSWORD";
// The laptop IP is printed when you start plantcare_server.py
const char* SERVER_URL = "http://YOUR_LAPTOP_IP:5000/api/readings";
/* ============================================================ */

static const uint32_t STM32_BAUD   = 115200;  // must match the STM32 (BRR = 0x008B)
static const uint16_t HTTP_TIMEOUT = 1500;    // ms
static const size_t   RX_BUFFER    = 1024;    // holds ~4 STM32 lines while a POST is running
static const int      BRIDGE_VERSION = 3;     // matches PROTOCOL_VERSION in plantcare_server.py

ESP8266WebServer server(80);

/* ===== PROTOCOL BEGIN (same code as esp8266/test/protocol.h, unit-tested on PC) ===== */
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
/* ===== PROTOCOL END ===== */

static char      rxLine[PC_MAX_LINE];
static size_t    rxIndex = 0;
static bool      rxOverflow = false;

static bool      haveReading = false;
static PcReading lastReading;
static String    lastRawLine = "";
static uint32_t  seqNo = 0;
static uint32_t  uartBytes = 0, validLines = 0, invalidLines = 0;
static uint32_t  postOk = 0, postFail = 0;
static int       lastHttpCode = 0;
static uint32_t  lastInfoMs = 0;
static char      body[640];

static size_t buildJson(const PcReading *r) {
  size_t n = pcReadingToJson(r, seqNo, millis(), body, sizeof body);
  if (!n) return 0;
  n -= 1;  // drop the closing brace and append diagnostics
  int extra = snprintf(body + n, sizeof body - n,
                       ",\"esp_valid_lines\":%lu,\"esp_invalid_lines\":%lu,\"uart_bytes\":%lu,\"rssi\":%d,\"bridge_version\":%d}",
                       (unsigned long)validLines, (unsigned long)invalidLines,
                       (unsigned long)uartBytes, (int)WiFi.RSSI(), BRIDGE_VERSION);
  if (extra <= 0 || (size_t)extra >= sizeof body - n) return 0;
  return n + (size_t)extra;
}

static void postReading(const PcReading *r) {
  if (WiFi.status() != WL_CONNECTED) { postFail++; lastHttpCode = -100; return; }
  size_t n = buildJson(r);
  if (!n) return;

  WiFiClient client;
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT);
  if (!http.begin(client, SERVER_URL)) { postFail++; lastHttpCode = -101; return; }
  http.addHeader("Content-Type", "application/json");
  lastHttpCode = http.POST((uint8_t *)body, n);
  if (lastHttpCode >= 400) {
    // The server explains a rejection in its reply, e.g. {"ok":false,"error":"soil_pct"}
    Serial.printf("[http] server said: %s\n", http.getString().c_str());
  }
  http.end();

  if (lastHttpCode >= 200 && lastHttpCode < 300) {
    postOk++;
  } else {
    postFail++;
    Serial.printf("[http] POST failed: %d %s\n", lastHttpCode,
                  lastHttpCode < 0 ? HTTPClient::errorToString(lastHttpCode).c_str() : "");
  }
}

static void handleLine(const char *line) {
  PcReading r;
  PcParseResult res = pcParseLine(line, &r);
  if (res == PC_OK) {
    validLines++;
    seqNo++;
    lastReading = r;
    haveReading = true;
    lastRawLine = line;
    Serial.printf("[uart] ok #%lu %s %s soil=%u%% hum=%u%% sun=%u%%\n", (unsigned long)seqNo,
                  PC_PLANT_NAMES[r.plant], PC_STATUS_NAMES[r.mlClass],
                  (unsigned)r.soilPct, (unsigned)r.humRhEst, (unsigned)r.sunlightPct);
    postReading(&r);
  } else if (res == PC_INVALID) {
    invalidLines++;
    // Print the start of the bad line so a format mismatch is easy to spot.
    Serial.printf("[uart] INVALID #%lu: %.120s\n", (unsigned long)invalidLines, line);
  }
  // Banner lines and anything else not starting with PLANT= are ignored silently.
}

static void readStm32() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    uartBytes++;
    if (c == '\r') continue;
    if (c == '\n') {
      if (rxOverflow) invalidLines++;
      else if (rxIndex > 0) {
        rxLine[rxIndex] = '\0';
        handleLine(rxLine);
      }
      rxIndex = 0;
      rxOverflow = false;
    } else if (!rxOverflow) {
      if (rxIndex < sizeof(rxLine) - 1) rxLine[rxIndex++] = c;
      else rxOverflow = true;
    }
  }
}

// http://<ESP-IP>/data : latest reading as JSON (same format that is POSTed), plus the raw line.
static void handleData() {
  if (!haveReading) {
    server.send(200, "application/json", "{\"status\":\"waiting for STM32\"}");
    return;
  }
  size_t n = buildJson(&lastReading);
  String out = n ? String(body) : String("{}");
  out.remove(out.length() - 1);
  out += ",\"raw\":\"" + lastRawLine + "\",\"posts_ok\":" + String(postOk) +
         ",\"posts_failed\":" + String(postFail) + ",\"last_http_code\":" + String(lastHttpCode) + "}";
  server.send(200, "application/json", out);
}

void setup() {
  Serial.setRxBufferSize(RX_BUFFER);   // must come before begin()
  Serial.begin(STM32_BAUD);
  Serial.setTimeout(100);
  delay(200);
  Serial.println();
  Serial.printf("PlantCare AI bridge v%d starting (STM32 V3 on RX pin, 115200)\n", BRIDGE_VERSION);

  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("ESP8266 IP address: ");
  Serial.println(WiFi.localIP());
  Serial.print("Posting to: ");
  Serial.println(SERVER_URL);

  // Lines that piled up while joining Wi-Fi may be cut off; start clean.
  while (Serial.available()) Serial.read();

  server.on("/data", handleData);
  server.begin();
  Serial.println("Web server started (http://<ESP-IP>/data)");
}

void loop() {
  server.handleClient();
  readStm32();

  uint32_t now = millis();
  if (now - lastInfoMs >= 5000) {
    lastInfoMs = now;
    Serial.printf("[info] wifi: %s | bytes: %lu | valid: %lu | invalid: %lu | posts ok: %lu | failed: %lu (last code %d)\n",
                  WiFi.status() == WL_CONNECTED ? "connected" : "NOT connected",
                  (unsigned long)uartBytes, (unsigned long)validLines, (unsigned long)invalidLines,
                  (unsigned long)postOk, (unsigned long)postFail, lastHttpCode);
  }
}
