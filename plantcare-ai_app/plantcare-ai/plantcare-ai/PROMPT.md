# Project Prompt: PlantCare AI — ESP8266 Wi-Fi Plant Health Monitor

Build a modern, interactive, mobile-first web application called **PlantCare AI** for an embedded AI-based plant health monitoring system.

## 1. Project Overview

PlantCare AI is the companion app for an STM32F401-based plant monitor. The STM32 reads its sensors, runs an on-device Decision Tree classifier, and sends each reading plus the predicted class over UART to an **ESP8266 (NodeMCU / Wemos D1 mini)**. The ESP8266 runs its own Wi-Fi hotspot, converts each UART line to JSON, and pushes it to connected clients over **WebSocket**.

The model was trained on a 4,500-row dataset (1,500 rows per class). It predicts one of **three** classes:
- `2` → **Suitable**
- `1` → **Moderate Stress**
- `0` → **High Stress**

The model supports **two plant types**, Aloe Vera and Pothos. The plant type is selected on the device with switch SW2 and is a model input. The app only displays the plant the STM32 reports; it cannot change it.

The app must be visually polished, fully interactive, and suitable for demonstrating as a college embedded systems project.

## 2. Design and Theme

- Soft off-white / light cream background.
- Forest green primary; sage green, muted yellow, and soft coral supporting colours.
- Rounded cards, subtle shadows, clean typography, plant illustrations.
- Minimal clutter, clear visual hierarchy, bottom navigation bar.
- Smooth transitions, interactive charts, subtle animations.
- Must look like a real plant-care product, not an admin dashboard.
- Mobile-first, also usable on desktop.

Status colours:
- Green: Suitable
- Yellow/amber: Moderate Stress
- Coral/red: High Stress
- Grey: No data / Offline

## 3. Sensor Data — What Is Actually Measured

| Field | Source | Unit / range | Notes |
|---|---|---|---|
| Soil moisture | Analog soil probe, ADC ch4 (PA4) | 0–100 % | Calibrated: ADC 3500 = 0 %, 1500 = 100 % |
| Air humidity | HR202 analog module, ADC ch3 (PA3) | 20–95 %RH | **Estimate** from a linear calibration, not a precision sensor |
| Light | LDR, ADC ch1 (PA1) | Raw ADC 0–4095 | **Higher = brighter.** Not calibrated to lux; show as raw/relative |
| Temperature | **Not measured** | Fixed 25 °C | Firmware feeds a constant 25 °C to the model. Always label "Assumed 25 °C — not measured". No live chart, no history, no alerts |
| Potentiometer | ADC ch2 (PA2) | Raw ADC 0–4095 | Diagnostics only |
| SW1, SW2 | PB12, PB13 (active low) | 0/1 | SW1 = LED, SW2 = plant toggle. Diagnostics only |

Never present the humidity estimate or the assumed temperature as precision measurements.

## 4. Main Screens

### Screen 1: Home Dashboard
- Greeting: "Hello, Plant Parent! 🌱"
- Current date and time of the last received reading.
- Device link status: **Live / Stale / Offline / Demo** (see §6).
- Current plant (Aloe Vera / Pothos, as reported by the device).
- Prominent health card with the latest ML class and a status ring in the class colour.
- Sensor cards: Soil moisture, Air humidity (est.), Light (raw ADC), Temperature ("Assumed 25 °C" badge, no trend).
- Measured cards show icon, value, status vs. the plant's configured range, and a sparkline.
- Buttons: "View Plant Details", "Connect Device".

### Screen 2: Plant Details
- Plant name (as reported) with an illustration; optional user nickname and photo.
- Date first seen.
- Current ML class.
- Latest readings.
- Recommended ranges for the current plant, editable. Defaults are the 10th–90th percentile of the dataset's **Suitable** rows:

| Plant | Soil % | Air humidity % | LDR ADC |
|---|---|---|---|
| Aloe Vera | 13–33 | 33–57 | 2636–3928 |
| Pothos | 38–62 | 44–71 | 1199–2787 |

  Label these: "Default ranges derived from the training dataset — adjust for your plant."
- A short "Why this status?" section comparing each reading to its range. Label it **"App interpretation — the model returns a class only, not its reasons."** Example: "Soil moisture (22 %) is below this plant's range (38–62 %)."
- Visually separate measured values from app interpretation.
- "Edit Plant Details" for nickname, photo and ranges.

### Screen 3: Live Monitoring
- Soil, humidity and light cards with live line charts.
- Assumed temperature shown as a static labelled value.
- Timestamp of each reading (phone receive time; see §6).
- Device link indicator.
- **"Refresh Readings"**: asks the ESP8266 to re-send its most recent reading (`{"cmd":"get_latest"}`). It cannot force a new sensor read; say so in the UI.
- **"Check Plant Health"**: opens the AI Health Analysis screen for the latest reading. The model runs continuously on the STM32; the app cannot trigger it.
- When the link is down, show the last readings greyed out with an "Offline — last received HH:MM:SS" banner. Never present old readings as live.

### Screen 4: AI Health Analysis
- Three class cards (Suitable / Moderate Stress / High Stress), with the current one highlighted.
- Plain-language explanation of each class.
- The readings used as model inputs: plant type, soil %, assumed 25 °C, humidity estimate, LDR ADC.
- Range comparisons, labelled as app interpretation.
- Suggested actions (conditional, never diagnostic):
  - **Suitable:** Conditions look suitable. Continue regular monitoring.
  - **Moderate Stress:** Some conditions may be outside the plant's preferred range. Check which readings are out of range.
  - **High Stress:** Conditions may be stressing the plant. Check soil moisture, humidity and light promptly.
- State that the model cannot detect diseases or pests.
- **No confidence percentages.** The Decision Tree returns a class only.
- Prediction history with timestamps.

### Screen 5: History and Analytics
- Line charts for soil, humidity and light.
- Time filters: 24 h, 7 d, 30 d. Charts must update when the filter changes.
- ML class history and a timeline of class changes.
- Daily averages, minimums and maximums.
- CSV export of all stored fields.
- **History exists only for periods when the app was open and connected.** The ESP8266 stores no history. Show gaps clearly and say "insufficient data" when there isn't enough. Mark demo-generated history as sample data.

### Screen 6: Alerts and Notifications
In-app alerts for:
- Soil moisture below or above the plant's range.
- Air humidity outside the range.
- Light below or above the range.
- ML class changed to High Stress.
- ESP8266 Wi-Fi link lost / restored.
- STM32 data stale: the ESP is connected but no UART line has arrived recently.

No temperature alerts, because temperature is not measured.
- Each category can be enabled or disabled, and thresholds can be configured.
- Don't repeat an alert for an unchanged condition. Only re-alert after the condition clears and returns.
- Only in-app notifications are provided. State that the app must be open to receive them.

### Screen 7: Settings and Device
- **Connection:** ESP8266 WebSocket address (default `ws://192.168.4.1:81/`); Connect / Disconnect / Reconnect; status, last message time and messages received.
- Show connecting, connection-failed, reconnecting and stale states, with hints (e.g. "Is this device joined to the PlantCare hotspot?").
- **Device diagnostics panel:** POT_ADC, SW1, SW2, raw HUM_ADC, raw SOIL_RAW, and ESP uptime.
- **Stale timeout:** how long without data before the link is marked Stale.
- Plant profile ranges (per plant type).
- Alert preferences.
- Data: export CSV, clear history.
- Demo Mode toggle.
- About.

## 5. Hardware

- **STM32F401:** sensors as in §3; Decision Tree `predict_plant_suitability(features[5])`; SSD1306 OLED over I²C1 (PB6/PB7).
- **UART:** USART1 TX on PA9, 9600 baud, 8N1. The STM32 only transmits; it does not read UART.
- **ESP8266 NodeMCU:** reads STM32 TX with SoftwareSerial on **D5 (GPIO14) = RX** at 9600 baud. Hardware Serial stays on USB for debug logs.
- Wiring: STM32 PA9 → NodeMCU D5, common GND. Both are 3.3 V logic, so no level shifter is needed.
- **STM32 firmware is unchanged.**

## 6. Communication Protocol

### 6.1 STM32 → ESP8266 (UART, existing firmware)
One CRLF-terminated line per loop:

PLANT=<ALOE_VERA|POTHOS>,ML_CLASS=<0|1|2>,ML_STATUS=<HIGH STRESS|MODERATE STRESS|SUITABLE>,TEMP_C_ASSUMED=25,SOIL_PCT=<0-100>,HUM_RH_EST=<20-95>,HUM_ADC=<0-4095>,SOIL_RAW=<0-4095>,LDR_ADC=<0-4095>,POT_ADC=<0-4095>,SW1=<0|1>,SW2=<0|1>

The startup banner lines are not readings and must be ignored.

### 6.2 ESP8266 sketch (to be written)
- Starts a Wi-Fi access point. SSID `PlantCare-AI` and password are configurable constants at the top of the sketch. IP `192.168.4.1`.
- Runs a WebSocket server on port 81 (arduinoWebSockets library).
- Buffers UART bytes until CRLF, with a maximum line length. Overlong or garbled lines are discarded.
- Parses KEY=VALUE pairs. A line is valid only if all 12 keys are present and in range, and ML_CLASS matches ML_STATUS.
- Broadcasts each valid line as JSON:
  {"type":"reading","seq":42,"esp_uptime_ms":123456,"plant":"POTHOS","ml_class":1,"ml_status":"MODERATE STRESS","temp_c_assumed":25,"soil_pct":38,"hum_rh_est":52,"hum_adc":3610,"soil_raw":2740,"ldr_adc":2100,"pot_adc":1800,"sw1":0,"sw2":0}
  (illustrative values)
- Keeps the last valid reading. On `{"cmd":"get_latest"}` it re-sends it.
- Sends `{"type":"status","stm32_link":"ok"|"stale","last_line_age_ms":N,"esp_uptime_ms":N}` every few seconds and immediately when a client connects.
- Counts invalid lines and includes the count in status messages.
- Logs to USB Serial for debugging.

### 6.3 App rules
- Validate every JSON message (types, ranges, class/status match) and drop invalid messages without crashing.
- The ESP has no clock and no internet, so **timestamps are the phone's receive time.** Say this in the About section.
- Link states:
  - **Live:** WebSocket open and STM32 data fresh.
  - **Stale:** WebSocket open, but the ESP reports `stm32_link:"stale"` or no reading has arrived within the stale timeout.
  - **Offline:** WebSocket closed.
  - **Demo:** Demo Mode is on.
- Auto-reconnect with back-off, plus a manual reconnect button.

## 7. Demo Mode

- Clearly labelled Demo Mode generating realistic readings for both plant types, with a "DEMO DATA" badge on every screen.
- Demo classes come from a **JavaScript port of the actual Decision Tree** (`plant_suitability_model.c`), run on the simulated inputs with temperature fixed at 25 °C. Label it "Simulated sensor values → real model logic". Never describe threshold rules as the trained model.
- Demo Mode never shows a connected-hardware state and never opens a WebSocket.
- Demo data is stored separately from or tagged against real data, and is excluded or flagged in exports.

## 8. Technical Requirements

- **Stack:** React + Vite (TypeScript), built while online. All dependencies are bundled locally because the hotspot has no internet: no CDN fonts, scripts or icons.
- **Serving:** a laptop joined to the ESP hotspot serves the built app (`npm run serve`, binding 0.0.0.0). The phone also joins the hotspot and opens `http://<laptop-ip>:<port>`. The app is plain HTTP, so `ws://` is allowed.
- Code is organised into: UI components; sensor data models and validation; WebSocket device service; ML class interpretation and the decision-tree port (demo only); local storage (IndexedDB for history, localStorage for settings); chart and history management; alert engine.
- Local-first. No backend or cloud API.

## 9. Accuracy and Reliability

- Distinguish real readings from demo readings everywhere.
- Never fabricate a connection.
- Timestamp every reading.
- Handle missing, stale and invalid data.
- In Hardware Mode, show exactly the class the STM32 sent.
- Show no confidence values.
- Label temperature as assumed and humidity as estimated.
- Ranges are configurable per plant type.

## 10. Final Deliverables

- Complete runnable web app (all 7 screens), reusable components, Demo Mode.
- ESP8266 Arduino sketch (`.ino`) with a config block (SSID, password, RX pin, baud, stale timeout).
- Documented protocol (UART line format and WebSocket JSON).
- Setup and run guide: building the app, flashing the ESP, wiring, joining the hotspot, serving from the laptop, opening on the phone.
- A list of hardware-specific steps that can only be verified with the actual device.

Build order: dashboard and navigation first, then the remaining screens, then the device service and ESP sketch.