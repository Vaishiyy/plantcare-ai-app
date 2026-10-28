# PlantCare AI — Communication Protocol (firmware "PLANT MONITOR V3")

```
STM32F401 ──UART 115200 8N1──▶ NodeMCU ESP8266 ──HTTP POST──▶ Flask server (laptop :5000) ◀──GET /api/latest── App
  PA9 TX                       RX pin (GPIO3)
```
The link is **one way**. NodeMCU TX is not wired to STM32 PA10, so the STM32 never receives `DAY=` or `PLANT=` lines:
- **Plant** is chosen with **SW2** on the STM32 board (each press toggles Aloe Vera / Pothos).
- **Day/night** stays unknown on the STM32 (`DAY=-1`). The server adds day/night from the **laptop clock** for the app only.

## 1. STM32 → NodeMCU (UART)

USART1, TX on **PA9**, **115200 baud, 8N1** (`BRR = 0x008B` at 16 MHz), once per second. One line ending in CRLF:

```
PLANT=<ALOE_VERA|POTHOS>,ML_CLASS=<0|1|2>,ML_PROVISIONAL=1,DAY=<-1|0|1>,SUNLIGHT_PCT=<0-100>,SOIL_PCT=<0-100>,HUM_RH_EST=<0-100>,LDR_ADC=<0-4095>,HUM_ADC=<0-4095>,SOIL_RAW=<0-4095>,LOW_LIGHT_MIN=<n>,HIGH_LIGHT_MIN=<n>,WARN1=<text>,WARN2=<text>
```

| Key | Meaning |
|---|---|
| `PLANT` | Plant selected with SW2 (model input 0 = Aloe Vera, 1 = Pothos) |
| `ML_CLASS` | Decision Tree output: 0 = High stress, 1 = Moderate stress, 2 = Suitable |
| `ML_PROVISIONAL` | 1: main.c marks the model as provisional |
| `DAY` | -1 unknown (always, with the one-way wire), 0 night, 1 day |
| `SUNLIGHT_PCT` | LDR scaled to 0–100 % (`LDR_ADC * 100 / 4095`) |
| `SOIL_PCT` | Soil moisture %, calibrated from ADC 3500 (0 %) to 1500 (100 %) |
| `HUM_RH_EST` | Estimated %RH from the HR202 (firmware clamps to 20–95) |
| `LDR_ADC`, `HUM_ADC`, `SOIL_RAW` | Raw 12-bit ADC values |
| `LOW_LIGHT_MIN`, `HIGH_LIGHT_MIN` | Minutes of continuous low / excessive light. Only count when `DAY=1`, so they stay 0 |
| `WARN1`, `WARN2` | The two OLED warnings, in priority order soil → too much light → humidity: `NONE`, `NEEDS WATER`, `SOIL TOO WET`, `TOO MUCH LIGHT` (shown any time sunlight is above the plant's maximum), `HUMIDITY LOW`, `HUMIDITY HIGH`. `NEEDS MORE LIGHT` is still accepted but the current main.c never sends it |

Temperature is not sent. main.c feeds a constant 25 °C (`ASSUMED_TEMPERATURE_C`) to the model.
The firmware also prints two startup banner lines without `PLANT=`. These are ignored, not counted as errors.

**Validation in the NodeMCU** (`PlantCareBridge.ino`, tested via `esp8266/test/protocol.h`):
- The line must start with `PLANT=` and be shorter than 256 bytes (worst case from main.c is about 226).
- All 14 keys above must appear exactly once. Unknown extra keys are ignored, so a small firmware addition doesn't stop the data.
- Numbers must be digits only and within range. `DAY` must be -1, 0 or 1. Warnings must be one of the texts above.

## 2. NodeMCU → Server: `POST http://<laptop-IP>:5000/api/readings`

One POST per valid line, `Content-Type: application/json`:
```json
{"type":"reading","seq":42,"esp_uptime_ms":123456,"plant":"POTHOS","ml_class":1,"ml_status":"MODERATE STRESS","ml_provisional":1,"day":-1,"sunlight_pct":61,"soil_pct":38,"hum_rh_est":52,"ldr_adc":2500,"hum_adc":3610,"soil_raw":2740,"low_light_min":0,"high_light_min":0,"warn1":"NEEDS WATER","warn2":"NONE","esp_valid_lines":42,"esp_invalid_lines":0,"uart_bytes":8400,"rssi":-58}
```
(illustrative values; the last four fields are NodeMCU diagnostics)

The server checks the same ranges and that `ml_status` matches `ml_class`, adds `laptop_is_day` (from `DAY_START_HOUR` / `DAY_END_HOUR` at the top of `plantcare_server.py`, default 06:00–18:00), and replies `200 {"ok":true,"server_seq":N}` or `400 {"ok":false,"error":"<field>"}`. Every accepted reading is appended to `server/readings.csv`. A `readings.csv` from the older format is renamed to `readings_old_<date>.csv` at start-up.

## 3. App → Server: `GET /api/latest` (every second)

```json
{
  "reading": { ...reading fields above without diagnostics, plus "laptop_is_day": true },
  "reading_age_ms": 850,
  "server_seq": 42,
  "status": {"type":"status","stm32_link":"ok","last_line_age_ms":850,"esp_uptime_ms":124306,"valid_lines":42,"invalid_lines":0,"clients":null},
  "clock": {"is_day":true,"laptop_time":"2026-10-25T14:03:11","day_start_hour":6,"day_end_hour":18},
  "server": {"posts_ok":42,"posts_rejected":0,"last_reject_reason":"","esp_ip":"10.x.x.x","uart_bytes":8400,"rssi":-58}
}
```
- `server_seq` increases by 1 for each accepted reading. The app adds a reading only when it changes.
- `stm32_link` becomes `"stale"` when no reading has arrived for 10 s.

## 4. Health meter (app)
The meter **follows the model**, so the meter, the stress label and the ring always agree:

| Model class | Label | Meter band |
|---|---|---|
| 2 | Suitable | 75–100 |
| 1 | Moderate stress | 45–74 |
| 0 | High stress | 0–44 |

The readings set where the needle sits inside that band:
- Each sensor scores 100 inside its range and drops linearly to 0 at 20 points (soil, humidity) or 25 points (sunlight) beyond the nearest limit.
- Weighted average: soil 45 %, humidity 25 %, sunlight 30 %. At night (laptop clock), sunlight is left out.
- Example: model says Moderate stress, readings score 60 → needle at 45 + 29 × 0.6 ≈ 62.

The readings move the needle within the band. Only a change of the model's class moves it into another band.

## 5. Versions
- `PROTOCOL_VERSION = 3` in the server and the app, `BRIDGE_VERSION = 3` in the sketch (sent as `bridge_version`).
- If the server and the page are different versions, the app shows a red banner instead of looking frozen.
- A POST in the previous format (`pot_adc`, `temp_c_assumed`, no `sunlight_pct`) is rejected with `old NodeMCU sketch: upload the new prototype.ino`, and the app shows that as a banner.
- The server sends the page with `Cache-Control: no-store`, so a phone can't keep running an old cached copy of the app.
