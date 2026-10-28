// Demo Mode: simulated sensor values, classified by the real Decision Tree (ported from
// plant_suitability_model.c, v3) with the same inputs main.c gives it: temperature fixed at
// 25 °C, is-daytime 0 and light minutes 0 (DAY never reaches the STM32 over the one-way wire).
// Demo Mode never opens a network connection and never reports a hardware connection.

import { predictPlantSuitability } from '../ml/decisionTree';
import type { FwWarning, PlantType, Reading } from '../types';
import { DATASET_DEFAULT_RANGES } from '../storage/settings';
import { ASSUMED_TEMP_C } from '../protocol/validate';

// Small seeded PRNG so backfilled sample history is reproducible.
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Same conversions as main.c, run backwards, so the raw ADC fields stay consistent. */
function rawFromPercent(soilPct: number, rh: number) {
  const soilRaw = Math.round(3500 - (soilPct * (3500 - 1500)) / 100);
  const humAdc = Math.round(4000 - ((rh - 20) * (4000 - 3000)) / 75);
  return { soilRaw: clamp(soilRaw, 0, 4095), humAdc: clamp(humAdc, 0, 4095) };
}

/** Model inputs exactly as main.c builds ml_inputs[7] when DAY is unknown. */
export function classify(plant: PlantType, soilPct: number, rh: number, isDay = 0, lowLightMin = 0, highLightMin = 0) {
  return predictPlantSuitability([plant === 'ALOE_VERA' ? 0 : 1, soilPct, ASSUMED_TEMP_C, rh, isDay, lowLightMin, highLightMin]);
}

/** Simulates one plant over time: soil slowly dries and is watered, humidity and light follow the day. */
export class DemoSimulator {
  private soil: number;
  private rand: () => number;
  private seq = 0;
  constructor(public plant: PlantType, seed = Date.now()) {
    this.rand = mulberry32(seed);
    const r = DATASET_DEFAULT_RANGES[plant].soilPct;
    this.soil = (r.min + r.max) / 2 + 4;
  }

  next(ts: number, stepMinutes: number): Omit<Reading, 'id'> {
    const ranges = DATASET_DEFAULT_RANGES[this.plant];
    const hour = new Date(ts).getHours() + new Date(ts).getMinutes() / 60;
    const day = Math.sin(((hour - 6) / 24) * 2 * Math.PI); // -1 night … +1 midday

    // Soil: dries ~0.6 %/hour, gets watered when well below range.
    this.soil -= (0.6 * stepMinutes) / 60 * (0.6 + this.rand() * 0.8);
    if (this.soil < ranges.soilPct.min - 8 && this.rand() < 0.08 * Math.max(1, stepMinutes / 10)) {
      this.soil = ranges.soilPct.max + 6 + this.rand() * 8;
    }
    this.soil = clamp(this.soil, 0, 100);
    const soilPct = Math.round(clamp(this.soil + (this.rand() - 0.5) * 1.5, 0, 100));

    const humMid = (ranges.humRhEst.min + ranges.humRhEst.max) / 2;
    const rh = Math.round(clamp(humMid - day * 9 + (this.rand() - 0.5) * 4, 20, 95));

    const lightMid = (ranges.sunlightPct.min + ranges.sunlightPct.max) / 2;
    const sunlightPct = Math.round(clamp(day > -0.2 ? lightMid + day * 22 + (this.rand() - 0.5) * 5 : 3 + this.rand() * 2, 0, 100));
    const ldrAdc = clamp(Math.round((sunlightPct * 4095) / 100), 0, 4095);

    // Same as the real setup: the STM32 never gets DAY (one-way wire), so the model sees night, 0 min.
    const mlClass = classify(this.plant, soilPct, rh);
    const { soilRaw, humAdc } = rawFromPercent(soilPct, rh);
    this.seq++;
    return {
      ts, source: 'demo', seq: this.seq, espUptimeMs: null, plant: this.plant, mlClass,
      mlProvisional: 1, fwDay: -1, laptopIsDay: hour >= 6 && hour < 18,
      tempAssumedC: ASSUMED_TEMP_C, sunlightPct, soilPct, humRhEst: rh, ldrAdc, humAdc, soilRaw,
      lowLightMin: 0, highLightMin: 0, warnings: firmwareWarnings(this.plant, soilPct, rh, sunlightPct),
    };
  }
}

/** The OLED warnings main.c would show: soil, then TOO MUCH LIGHT (any time), then humidity; at most two. */
function firmwareWarnings(plant: PlantType, soilPct: number, rh: number, sunlightPct: number): FwWarning[] {
  const r = DATASET_DEFAULT_RANGES[plant];
  const w: FwWarning[] = [];
  if (soilPct < r.soilPct.min) w.push('NEEDS WATER');
  else if (soilPct > r.soilPct.max) w.push('SOIL TOO WET');
  if (sunlightPct > r.sunlightPct.max) w.push('TOO MUCH LIGHT');
  if (rh < r.humRhEst.min) w.push('HUMIDITY LOW');
  else if (rh > r.humRhEst.max) w.push('HUMIDITY HIGH');
  return w.slice(0, 2);
}

/**
 * Builds sample history for the last `days` days at 5-minute steps. Overnight gaps
 * (01:00–07:00) imitate the app being closed, so the History screen's gap handling
 * is visible in Demo Mode too.
 */
export function buildSampleHistory(plant: PlantType, days: number, now = Date.now()): Reading[] {
  const sim = new DemoSimulator(plant, 4242);
  const out: Reading[] = [];
  const step = 5;
  for (let ts = now - days * 86400000; ts < now - 60000; ts += step * 60000) {
    const r = sim.next(ts, step);
    const h = new Date(ts).getHours();
    if (h >= 1 && h < 7) continue;
    out.push(r);
  }
  return out;
}
