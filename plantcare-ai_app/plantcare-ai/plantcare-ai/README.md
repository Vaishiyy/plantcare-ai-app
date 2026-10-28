# PlantCare AI

A plant health monitor. An **STM32F401CCU6 Black Pill** reads soil moisture, humidity (HR202) and light (LDR), runs an on-device Decision Tree (v3 model), and shows everything on an OLED. It sends one reading per second over UART to a **NodeMCU ESP8266**, which **POSTs** it over Wi-Fi to a small **Flask server** on the laptop. The server also serves the **web app**, which you open on the phone.

```
STM32 PA9 ──UART 115200──▶ NodeMCU RX ──HTTP POST──▶ Flask server (laptop :5000) ◀──GET /api/latest── App (phone browser)
                                   phone hotspot (2.4 GHz) connects everything
```

The serial link is one way. **SW2** on the STM32 picks the plant. Day/night comes from the **laptop clock** and is used by the app only. The STM32 always reports `DAY=-1` (unknown).

## What's in this folder

| Path | What it is |
|---|---|
| `stm32/main.c` | **STM32 firmware**: your latest `main.c`, unchanged (SW2 plant button on PB13, OLED without day/night) |
| `stm32/plant_suitability_model.c`, `stm32/plant_suitability_v3_model.h` | The v3 Decision Tree (7 inputs) |
| `esp8266/PlantCareBridge/PlantCareBridge.ino` | **NodeMCU sketch**: reads the STM32 on the RX pin and POSTs each valid reading to the server |
| `server/plantcare_server.py` | **Flask server**: receives POSTs, adds day/night from the laptop clock, logs to `readings.csv`, serves the app and `/api/latest` |
| `app/` | The web app (React + TypeScript), already built in `app/dist/` |
| `WIRING.md` | Every connection in the project |
| `PROTOCOL.md` | The UART line format, the POST body, the server API and how the health score works |
| `tools/mock-nodemcu.mjs` | Fake NodeMCU that posts to the server, for testing without hardware |
| `esp8266/test/` | PC unit test for the line parser used in the sketch |
| `firmware-reference/` | The v3 model and your `main.c` exactly as given. `previous/` holds the old model, dataset and `main.c` |

---

## 1. One-time setup on the laptop

- **Python 3** with Flask: `pip install flask`
- **Arduino IDE** with the board package **"esp8266 by ESP8266 Community"**. No extra libraries are needed.
- **Node.js** only if you change the app's code. To rebuild: `cd app && npm install && npm run build`

## 2. Flash the boards

**STM32:** put the three files from `stm32/` in your STM32 project (replace `main.c`, add the model `.c` and `.h`), then build and flash.

**NodeMCU:**
1. Open `esp8266/PlantCareBridge/PlantCareBridge.ino`.
2. Check the three lines at the top: `ssid` / `password` (phone hotspot on **2.4 GHz**) and `SERVER_URL` (`http://<laptop-IP>:5000/api/readings`, printed when you start the server).
3. **Unplug the PA9 → RX wire**, choose **NodeMCU 1.0 (ESP-12E Module)** and your COM port, click Upload, then plug the wire back in.

## 3. Run it

1. Turn on the phone hotspot. Connect the **laptop** to it.
2. On the laptop: `cd server` then `python plantcare_server.py`. It prints the app address, the `SERVER_URL` for the sketch, and whether the laptop clock says day or night.
   If Windows Firewall asks about Python, click **Allow** (private networks).
3. Power the NodeMCU and the STM32. In Serial Monitor (115200) you should see `[uart] ok` lines and `posts ok:` rising.
4. On the phone (on the same hotspot), open `http://<laptop-IP>:5000`. The chip turns **Live**, and the health meter moves with each reading.
   **After updating, reload the page once** (pull down to refresh, or close the tab and open it again). From this version on, the server stops the phone from caching the page, so this is only needed once.

## Troubleshooting

Check the NodeMCU Serial Monitor `[info]` line first:

| `[info]` shows | Fix |
|---|---|
| `wifi: NOT connected` | Hotspot on 2.4 GHz? Name and password exact? |
| `bytes: 0` | Nothing from the STM32: check the A9 → RX wire and the shared GND |
| `bytes` rising but `valid: 0` | Look at the `[uart] INVALID` lines: they print the start of each rejected line. Usually the firmware and sketch versions don't match |
| `valid` rising but `failed` rising | `SERVER_URL` is wrong, the server isn't running, or the firewall blocks Python. `[http] server said:` shows the reason if the server rejected it |
| `posts ok` rising, app not Live | The phone isn't on the same hotspot, or Settings → server address is wrong (leave it empty) |
| App frozen while the OLED changes | Reload the page once (an old cached copy can't read the new data). A red banner in the app names the cause if the server or sketch is outdated |

---

## Try it without hardware

```bash
python server/plantcare_server.py              # terminal 1
node tools/mock-nodemcu.mjs                     # terminal 2: posts fake readings
```
Open `http://localhost:5000`. Type `dry`, `wet`, `dark`, `bright`, `humid`, `arid`, `plant`, `stale`, `resume`, `garbage` or `oldsketch` into the mock to watch the health meter, alerts and warning banners react. Demo Mode (Settings) also works without any server.

## Notes on behaviour

- **Health meter (0–100):** follows the model, so it always agrees with the stress label and the ring: Suitable 75–100, Moderate stress 45–74, High stress 0–44. Soil, humidity and sunlight against the plant's ranges move the needle within that band with every reading. Details are in `PROTOCOL.md`.
- **Ranges** default to the limits in `main.c` (the ones behind the OLED warnings), so the app and the OLED agree. They are editable per plant.
- **Device warnings** (`WARN1` / `WARN2` from the OLED) are shown on the Home screen.
- **Temperature** is shown as "Assumed 25 °C" because the firmware feeds a constant to the model.
- **Model inputs 5–7** (is daytime, low/excess light minutes) stay at 0 because the STM32 gets no `DAY=` line. Wiring NodeMCU TX → PA10 and sending `DAY=1/0` would enable them.
- **Alerts** are in-app only, while the app is open. Low-light alerts are skipped at night.
- **Storage:** the phone keeps history in IndexedDB (30 days by default), and history from the previous firmware version still shows. The server appends every reading to `server/readings.csv`.

## Retraining the model

If you regenerate `plant_suitability_model.c`, copy it to `firmware-reference/` and `stm32/`, then run:
```bash
python3 tools/port_tree.py firmware-reference/plant_suitability_model.c app/src/ml/decisionTree.ts
python3 tools/port_tree.py firmware-reference/plant_suitability_model.c tools/decisionTree.mjs
```
Then rebuild the app.

## Tests

```bash
cd esp8266/test && g++ -std=c++11 -Wall -Wextra -I. test_protocol.cpp -o t && ./t
```
