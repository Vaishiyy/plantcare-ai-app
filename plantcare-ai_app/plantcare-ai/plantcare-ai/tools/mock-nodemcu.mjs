#!/usr/bin/env node
// Mock NodeMCU: POSTs readings to the PlantCare Flask server exactly like PlantCareBridge.ino
// (STM32 firmware "PLANT MONITOR V3"), so you can test the server and app without hardware.
//
// Usage:  node tools/mock-nodemcu.mjs [--server http://localhost:5000] [--interval 1000] [--plant POTHOS|ALOE_VERA]
// Commands (type + Enter): stale, resume, plant, dry, wet, dark, bright, humid, arid, garbage
// Classes come from the real Decision Tree (tools/decisionTree.mjs, generated from the firmware C),
// with the inputs main.c uses when DAY is unknown: temperature 25, is-daytime 0, light minutes 0.

import readline from 'node:readline';
import { predictPlantSuitability } from './decisionTree.mjs';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : d; };
const SERVER = arg('server', 'http://localhost:5000').replace(/\/+$/, '');
const INTERVAL = Number(arg('interval', 1000));
let plant = arg('plant', 'POTHOS') === 'ALOE_VERA' ? 0 : 1;

// Same limits as main.c (ALOE_/POTHOS_ SOIL and AIR defines) for the OLED warnings.
const LIMITS = [
  { soil: [10, 45], air: [20, 75], lightMax: 95 },  // Aloe Vera
  { soil: [20, 70], air: [30, 85], lightMax: 85 },  // Pothos
];
const STATUS = ['HIGH STRESS', 'MODERATE STRESS', 'SUITABLE'];
const started = Date.now();
let seq = 0, sending = true, ok = 0, fail = 0;
let soil = 45, hum = 55, sun = 50;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const jitter = (v, a) => v + (Math.random() - 0.5) * a;

async function post(body) {
  try {
    const r = await fetch(`${SERVER}/api/readings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    r.ok ? ok++ : (fail++, console.log('POST rejected', r.status, await r.text()));
  } catch (e) {
    fail++;
    console.log('POST failed:', e.message);
  }
}

// Same order and two-slot limit as main.c: soil, TOO MUCH LIGHT (any time), humidity.
function warnings(s, h, l) {
  const L = LIMITS[plant], w = [];
  if (s < L.soil[0]) w.push('NEEDS WATER'); else if (s > L.soil[1]) w.push('SOIL TOO WET');
  if (l > L.lightMax) w.push('TOO MUCH LIGHT');
  if (h < L.air[0]) w.push('HUMIDITY LOW'); else if (h > L.air[1]) w.push('HUMIDITY HIGH');
  return w.slice(0, 2);
}

setInterval(() => {
  if (!sending) return;
  soil = clamp(jitter(soil - 0.15, 1.2), 0, 100);
  hum = clamp(jitter(hum, 1.5), 20, 95);
  sun = clamp(jitter(sun, 3), 0, 100);
  const s = Math.round(soil), h = Math.round(hum), l = Math.round(sun);
  const cls = predictPlantSuitability([plant, s, 25, h, 0, 0, 0]);
  const w = warnings(s, h, l);
  seq++;
  void post(JSON.stringify({
    type: 'reading', seq, esp_uptime_ms: Date.now() - started, plant: plant ? 'POTHOS' : 'ALOE_VERA',
    ml_class: cls, ml_status: STATUS[cls], ml_provisional: 1, day: -1,
    sunlight_pct: l, soil_pct: s, hum_rh_est: h,
    ldr_adc: clamp(Math.round((l * 4095) / 100), 0, 4095),
    hum_adc: clamp(Math.round(4000 - ((h - 20) * 1000) / 75), 0, 4095),
    soil_raw: clamp(Math.round(3500 - s * 20), 0, 4095),
    low_light_min: 0, high_light_min: 0, warn1: w[0] ?? 'NONE', warn2: w[1] ?? 'NONE',
    esp_valid_lines: seq, esp_invalid_lines: 0, uart_bytes: seq * 200, rssi: -55, bridge_version: 3,
  }));
}, INTERVAL);
setInterval(() => console.log(`[info] posts ok: ${ok} | failed: ${fail} | sending: ${sending}`), 5000);

console.log(`Mock NodeMCU posting to ${SERVER}/api/readings every ${INTERVAL} ms`);
console.log('Commands: stale, resume, plant, dry, wet, dark, bright, humid, arid, garbage');
readline.createInterface({ input: process.stdin }).on('line', (l) => {
  const c = l.trim();
  if (c === 'stale') { sending = false; console.log('paused (like the STM32 going quiet)'); }
  else if (c === 'resume') { sending = true; console.log('resumed'); }
  else if (c === 'plant') { plant ^= 1; console.log('plant ->', plant ? 'POTHOS' : 'ALOE_VERA', '(like pressing SW2)'); }
  else if (c === 'dry') soil = 5;
  else if (c === 'wet') soil = 90;
  else if (c === 'dark') sun = 5;
  else if (c === 'bright') sun = 98;
  else if (c === 'humid') hum = 93;
  else if (c === 'arid') hum = 21;
  else if (c === 'garbage') { void post('{"plant":"CACTUS"}'); void post('not json'); }
  else if (c === 'oldsketch') {  // what the previous PlantCareBridge sketch posts
    sending = false;
    const t = setInterval(() => void post(JSON.stringify({ type: 'reading', seq: 1, esp_uptime_ms: 1, plant: 'POTHOS',
      ml_class: 1, ml_status: 'MODERATE STRESS', temp_c_assumed: 25, soil_pct: 40, hum_rh_est: 50, hum_adc: 3600,
      soil_raw: 2700, ldr_adc: 2000, pot_adc: 1800, sw1: 0, sw2: 0 })), INTERVAL);
    setTimeout(() => clearInterval(t), 10000);
    console.log('posting old-format readings for 10 s (type resume afterwards)');
  }
  else if (c) console.log('unknown command');
});
