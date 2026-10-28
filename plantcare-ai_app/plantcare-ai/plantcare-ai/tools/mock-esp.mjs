#!/usr/bin/env node
// Mock ESP8266 bridge: lets you try the app on a laptop before the hardware is ready.
// It speaks the same WebSocket protocol as esp8266/PlantCareBridge (see PROTOCOL.md).
//
// Usage (from app/):  npm run mock-esp -- [--port 8181] [--interval 1500] [--plant POTHOS|ALOE_VERA]
// Then in the app: Settings > WebSocket address > ws://localhost:8181/  (or ws://<laptop-ip>:8181/ from a phone)
//
// Type commands + Enter while it runs:
//   stale      stop sending readings (imitates the STM32 going quiet; ESP keeps sending status)
//   resume     resume readings
//   plant      toggle the plant (like pressing SW2)
//   dry / wet  push soil moisture down / up
//   dark / bright  push light down / up
//   garbage    send one malformed message (the app must ignore it)
//   drop       close all clients and refuse new ones for 8 s (imitates a Wi-Fi drop)
//   line       print the firmware-format UART line for the next reading
//
// Classes come from the real Decision Tree (tools/decisionTree.mjs, generated from the firmware C).

import { createRequire } from 'node:module';
import readline from 'node:readline';
import { predictPlantSuitability } from './decisionTree.mjs';

const require = createRequire(new URL('../app/package.json', import.meta.url));
const { WebSocketServer } = require('ws');

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
};
const PORT = Number(arg('port', 8181));
const INTERVAL = Number(arg('interval', 1500));
const STALE_AFTER = 10000;
let plant = arg('plant', 'POTHOS') === 'ALOE_VERA' ? 0 : 1;

const STATUS = ['HIGH STRESS', 'MODERATE STRESS', 'SUITABLE'];
const started = Date.now();
const uptime = () => Date.now() - started;
let seq = 0, valid = 0, sending = true, lastReadingAt = null, last = null;
let soil = 50, hum = 55, ldr = 2000, pot = 1800;
let printLine = false;
let refuseUntil = 0;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const jitter = (v, a) => v + (Math.random() - 0.5) * a;

function firmwareLine(r) {
  // Exact format of main.c's snprintf.
  return `PLANT=${r.plant},ML_CLASS=${r.ml_class},ML_STATUS=${r.ml_status},TEMP_C_ASSUMED=25,SOIL_PCT=${r.soil_pct},` +
    `HUM_RH_EST=${r.hum_rh_est},HUM_ADC=${r.hum_adc},SOIL_RAW=${r.soil_raw},LDR_ADC=${r.ldr_adc},POT_ADC=${r.pot_adc},SW1=${r.sw1},SW2=${r.sw2}\r\n`;
}

function nextReading() {
  soil = clamp(jitter(soil - 0.15, 1.2), 0, 100);
  hum = clamp(jitter(hum, 1.5), 20, 95);
  ldr = clamp(jitter(ldr, 80), 0, 4095);
  const soil_pct = Math.round(soil), rh = Math.round(hum), l = Math.round(ldr);
  const cls = predictPlantSuitability([plant, soil_pct, 25, rh, l]);
  seq++; valid++;
  lastReadingAt = Date.now();
  return {
    type: 'reading', seq, esp_uptime_ms: uptime(), plant: plant ? 'POTHOS' : 'ALOE_VERA',
    ml_class: cls, ml_status: STATUS[cls], temp_c_assumed: 25, soil_pct, hum_rh_est: rh,
    hum_adc: clamp(Math.round(4000 - ((rh - 20) * 1000) / 75), 0, 4095),
    soil_raw: clamp(Math.round(3500 - soil_pct * 20), 0, 4095),
    ldr_adc: l, pot_adc: Math.round(jitter(pot, 10)), sw1: 0, sw2: 0,
  };
}

function status() {
  const age = lastReadingAt ? Date.now() - lastReadingAt : null;
  return {
    type: 'status', stm32_link: age === null || age > STALE_AFTER ? 'stale' : 'ok', last_line_age_ms: age,
    esp_uptime_ms: uptime(), valid_lines: valid, invalid_lines: 0, clients: wss.clients.size,
  };
}

const wss = new WebSocketServer({ host: '0.0.0.0', port: PORT, verifyClient: () => Date.now() >= refuseUntil });
const broadcast = (o) => { const s = typeof o === 'string' ? o : JSON.stringify(o); for (const c of wss.clients) if (c.readyState === 1) c.send(s); };

wss.on('connection', (ws, req) => {
  console.log(`[ws] client connected from ${req.socket.remoteAddress} (${wss.clients.size} total)`);
  ws.send(JSON.stringify(status()));
  if (last) ws.send(JSON.stringify({ ...last, esp_uptime_ms: last.esp_uptime_ms }));
  ws.on('message', (m) => {
    const t = String(m);
    if (t.includes('"get_latest"')) { ws.send(JSON.stringify(status())); if (last) ws.send(JSON.stringify(last)); console.log('[ws] get_latest'); }
    else if (t.includes('"get_status"')) ws.send(JSON.stringify(status()));
  });
  ws.on('close', () => console.log(`[ws] client left (${wss.clients.size} total)`));
});

setInterval(() => {
  if (!sending) return;
  last = nextReading();
  if (printLine) { process.stdout.write('[uart] ' + firmwareLine(last)); printLine = false; }
  broadcast(last);
}, INTERVAL);
setInterval(() => broadcast(status()), 3000);

console.log(`Mock ESP8266 on ws://0.0.0.0:${PORT}/  (reading every ${INTERVAL} ms, plant ${plant ? 'POTHOS' : 'ALOE_VERA'})`);
console.log('Commands: stale, resume, plant, dry, wet, dark, bright, garbage, drop, line');

readline.createInterface({ input: process.stdin }).on('line', (l) => {
  const c = l.trim();
  if (c === 'stale') { sending = false; console.log('STM32 readings paused'); }
  else if (c === 'resume') { sending = true; console.log('STM32 readings resumed'); }
  else if (c === 'plant') { plant ^= 1; console.log('plant ->', plant ? 'POTHOS' : 'ALOE_VERA'); }
  else if (c === 'dry') { soil = 8; console.log('soil -> 8 %'); }
  else if (c === 'wet') { soil = 85; console.log('soil -> 85 %'); }
  else if (c === 'dark') { ldr = 300; console.log('light -> 300'); }
  else if (c === 'bright') { ldr = 3900; console.log('light -> 3900'); }
  else if (c === 'garbage') { broadcast('{"type":"reading","plant":"CACTUS"}'); broadcast('not json'); console.log('sent 2 malformed messages'); }
  else if (c === 'drop') { refuseUntil = Date.now() + 8000; for (const ws of wss.clients) ws.terminate(); console.log('dropped all clients; refusing connections for 8 s'); }
  else if (c === 'line') { printLine = true; }
  else if (c) console.log('unknown command');
});
