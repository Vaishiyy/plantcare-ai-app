# PlantCare AI

PlantCare AI is a plant monitoring project combining an STM32 sensor and
display, an ESP8266 Wi-Fi bridge, a Python server, and a browser app.

## Project folders

- [`plantcare-ai_app/`](plantcare-ai_app/) contains the main application,
  server, firmware references, and tools. Its detailed guide is in
  [`plantcare-ai_app/plantcare-ai/plantcare-ai/README.md`](plantcare-ai_app/plantcare-ai/plantcare-ai/README.md).
- [`PlantcareBrigde_wifiModule/`](PlantcareBrigde_wifiModule/) contains the
  standalone ESP8266 bridge prototype.
- [`plant_suitability_model/`](plant_suitability_model/) contains the STM32
  embedded project and plant suitability model.
- `plant_suitability_dataset.xls` is the model dataset.

## Run the main app

Open a terminal in `plantcare-ai_app/plantcare-ai/plantcare-ai/server` and
start the Flask server:

```bash
pip install flask
python plantcare_server.py
```

For local browser development, open another terminal in
`plantcare-ai_app/plantcare-ai/plantcare-ai/app` and run:

```bash
npm install
npm run dev
```

The main guide covers hardware wiring, firmware flashing, running the built-in
app through the server, and troubleshooting.

## Hardware configuration

Before flashing either ESP8266 sketch, set `ssid`, `password`, and
`SERVER_URL` to your own Wi-Fi credentials and the server address printed by
`plantcare_server.py`. The sketches in this repository use placeholders.

## Repository notes

Generated build outputs, local IDE settings, runtime sensor logs, and the
project ZIP archive are excluded by `.gitignore`.
