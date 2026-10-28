// 0–100 health score for the meter. It FOLLOWS THE MODEL, so the meter, the stress label and the
// ring always agree:
//
//   model class   label             meter band
//   2             Suitable          75–100
//   1             Moderate stress   45–74
//   0             High stress        0–44
//
// Where the needle sits inside that band comes from the readings: each sensor scores 100 inside
// the plant's range and loses points linearly the further it is outside (0 at TOLERANCE[k] points
// beyond the nearest limit). Weighted: soil 45 %, air humidity 25 %, sunlight 30 %. At night (laptop
// clock) sunlight is left out, because darkness is normal then.
// So readings can move the needle up or down within the band, but never into another band:
// only a change of the model's class does that.

import type { MlClass, PlantRanges, Reading, SensorKey } from '../types';
import { CLASS_INFO, verdict, type RangeVerdict } from './interpret';

export const SCORE_WEIGHTS: Record<SensorKey, number> = { soilPct: 0.45, humRhEst: 0.25, sunlightPct: 0.3 };
export const SCORE_TOLERANCE: Record<SensorKey, number> = { soilPct: 20, humRhEst: 20, sunlightPct: 25 };
const KEYS: SensorKey[] = ['soilPct', 'humRhEst', 'sunlightPct'];

export type ScoreBand = 'good' | 'warn' | 'bad';

/** Meter band [low, high] for each model class. */
export const CLASS_BAND: Record<MlClass, [number, number]> = { 2: [75, 100], 1: [45, 74], 0: [0, 44] };

export interface ScorePart {
  key: SensorKey;
  value: number;
  score: number;      // 0–100 for this sensor
  verdict: RangeVerdict;
  counted: boolean;   // false for sunlight at night
}

export interface HealthScore {
  score: number;        // 0–100, always inside CLASS_BAND[cls]
  readingsScore: number; // 0–100, from the readings alone (sets the position inside the band)
  cls: MlClass;
  band: ScoreBand;
  label: string;        // the model's label, e.g. "Moderate stress"
  parts: ScorePart[];
  night: boolean;
}

export function sensorScore(k: SensorKey, value: number, r: { min: number; max: number }) {
  const d = value < r.min ? r.min - value : value > r.max ? value - r.max : 0;
  if (d === 0) return 100;
  return Math.max(0, Math.round(100 * (1 - d / SCORE_TOLERANCE[k])));
}

/** isDay: true / false from the laptop (or phone in Demo Mode) clock, null when unknown. */
export function healthScore(r: Reading, ranges: PlantRanges, isDay: boolean | null): HealthScore {
  const night = isDay === false;
  const parts: ScorePart[] = KEYS.map((key) => ({
    key,
    value: r[key],
    score: sensorScore(key, r[key], ranges[key]),
    verdict: verdict(r[key], ranges[key]),
    counted: !(night && key === 'sunlightPct'),
  }));
  let sum = 0, wsum = 0;
  for (const p of parts) if (p.counted) { sum += SCORE_WEIGHTS[p.key] * p.score; wsum += SCORE_WEIGHTS[p.key]; }
  const readingsScore = Math.round(sum / wsum);
  const [lo, hi] = CLASS_BAND[r.mlClass];
  const score = Math.round(lo + ((hi - lo) * readingsScore) / 100);
  const info = CLASS_INFO[r.mlClass];
  return { score, readingsScore, cls: r.mlClass, band: info.tone, label: info.label, parts, night };
}
