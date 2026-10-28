# PlantCare AI — Wiring

Boards: **STM32F401CCU6 Black Pill** and **NodeMCU ESP8266**, each powered by its own USB cable.
All sensor modules are powered from the Black Pill's **3V3** pin, not 5V. STM32 analog pins must never see more than 3.3 V.

## Black Pill (STM32F401CCU6)

| Part | Part pin | Black Pill pin |
|---|---|---|
| LDR module | VCC | 3V3 |
| | GND | GND |
| | AO | **A1 (PA1)** |
| HR202 humidity module | VCC | 3V3 |
| | GND | GND |
| | AO | **A3 (PA3)** |
| Soil moisture module | VCC | 3V3 |
| | GND | GND |
| | AO | **A4 (PA4)** |
| SSD1306 OLED (I²C, 0x3C) | VCC | 3V3 |
| | GND | GND |
| | SCL | **B6 (PB6)** |
| | SDA | **B7 (PB7)** |
| SW2 push button (plant toggle) | one side | **B13 (PB13)** |
| | other side | GND |

- SW2 needs no resistor, because the firmware turns on the internal pull-up. Each press switches Aloe Vera ↔ Pothos (shown at the next 1-second update).
- `main.c` V3 does not use the potentiometer (A2), the PA8 LED or SW1 (B12). They can stay connected, but nothing reads them.
- `LDR_HIGH_IS_BRIGHT` in main.c assumes a higher LDR reading means brighter. If sunlight % goes *down* when you shine a torch on it, set it to 0.

## Black Pill → NodeMCU (serial link, one direction)

| Black Pill | NodeMCU | Notes |
|---|---|---|
| **A9 (PA9)**, USART1 TX | **RX** (GPIO3) | data, 115200 baud |
| **GND** | **GND** | required: the signal needs a common ground |

- **A10 (PA10) is not connected.** The STM32 receives nothing, so it reports day/night as unknown (`DAY=-1`).
- **Unplug the A9 → RX wire while uploading the sketch**, then plug it back in. The NodeMCU's USB chip shares the RX pin.
- **Do not** connect 3V3 or 5V between the boards, since each has its own USB power.

## Network

```
Phone hotspot (2.4 GHz)
 ├── NodeMCU ESP8266 ── POSTs readings to  http://<laptop-IP>:5000/api/readings
 ├── Laptop          ── python plantcare_server.py  (receives POSTs, adds day/night from its clock, serves the app)
 └── Phone browser   ── opens http://<laptop-IP>:5000
```

## Quick checks
- **OLED** shows plant, sunlight, soil, humidity and status (CONDITIONS OPTIMAL or up to two warnings). Pressing SW2 changes the PLANT line. The app shows the same numbers within about a second.
- **NodeMCU Serial Monitor (115200):** `[uart] ok #N POTHOS ... soil=..%` lines and `valid` rising mean the lines are understood.
- **`posts ok` rising:** readings reach the server, and the app shows **Live**.
