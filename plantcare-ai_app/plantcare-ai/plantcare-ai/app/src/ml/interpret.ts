// Human-readable interpretation of the model output and of readings vs. configured ranges.
// The Decision Tree returns a class only. Everything in compareToRanges() is the app's own
// range comparison, not the model's reasoning, and the UI labels it that way.

import type { FwWarning, MlClass, PlantRanges, PlantType, Reading, SensorKey } from '../types';

export const PLANT_LABEL: Record<PlantType, string> = { ALOE_VERA: 'Aloe Vera', POTHOS: 'Pothos' };
export const PLANT_LATIN: Record<PlantType, string> = { ALOE_VERA: 'Aloe barbadensis miller', POTHOS: 'Epipremnum aureum' };

export interface ClassInfo {
  cls: MlClass;
  label: string;
  short: string;
  tone: 'good' | 'warn' | 'bad';
  meaning: string;
  action: string;
}

export const CLASS_INFO: Record<MlClass, ClassInfo> = {
  2: {
    cls: 2, label: 'Suitable', short: 'Suitable', tone: 'good',
    meaning: 'The model rates the current conditions as suitable for this plant.',
    action: 'Conditions look suitable. Continue regular monitoring.',
  },
  1: {
    cls: 1, label: 'Moderate stress', short: 'Moderate', tone: 'warn',
    meaning: 'The model rates the conditions as moderately stressful for this plant.',
    action: 'Some conditions may be outside the plant’s preferred range. Check which readings are out of range below.',
  },
  0: {
    cls: 0, label: 'High stress', short: 'High stress', tone: 'bad',
    meaning: 'The model rates the conditions as highly stressful for this plant.',
    action: 'Conditions may be stressing the plant. Check soil moisture, humidity and light promptly.',
  },
};

export const SENSOR_META: Record<SensorKey, { label: string; unit: string; decimals: number; help: string }> = {
  soilPct: { label: 'Soil moisture', unit: '%', decimals: 0, help: 'Analog soil probe, calibrated 0–100 %' },
  humRhEst: { label: 'Air humidity', unit: '%RH', decimals: 0, help: 'Estimated from the HR202 module (not a precision sensor)' },
  sunlightPct: { label: 'Sunlight', unit: '%', decimals: 0, help: 'LDR scaled 0–100 % by the STM32, higher is brighter (not lux)' },
};

export type RangeVerdict = 'low' | 'ok' | 'high';

export function verdict(value: number, r: { min: number; max: number }): RangeVerdict {
  if (value < r.min) return 'low';
  if (value > r.max) return 'high';
  return 'ok';
}

const WORDS: Record<SensorKey, Record<RangeVerdict, string>> = {
  soilPct: { low: 'Dry', ok: 'In range', high: 'Wet' },
  humRhEst: { low: 'Dry air', ok: 'In range', high: 'Humid' },
  sunlightPct: { low: 'Low light', ok: 'In range', high: 'Very bright' },
};

/** Friendly text for the STM32's OLED warnings (WARN1 / WARN2). */
export const FW_WARNING_TEXT: Record<FwWarning, string> = {
  'NEEDS WATER': 'Needs water',
  'SOIL TOO WET': 'Soil too wet',
  'NEEDS MORE LIGHT': 'Needs more light',
  'TOO MUCH LIGHT': 'Too much light',
  'HUMIDITY LOW': 'Humidity low',
  'HUMIDITY HIGH': 'Humidity high',
};

export function verdictWord(key: SensorKey, v: RangeVerdict) {
  return WORDS[key][v];
}

export interface Comparison {
  key: SensorKey;
  value: number;
  range: { min: number; max: number };
  verdict: RangeVerdict;
  sentence: string;
}

export function compareToRanges(r: Reading, ranges: PlantRanges): Comparison[] {
  const keys: SensorKey[] = ['soilPct', 'humRhEst', 'sunlightPct'];
  return keys.map((key) => {
    const value = r[key];
    const range = ranges[key];
    const v = verdict(value, range);
    const m = SENSOR_META[key];
    const shown = `${value} ${m.unit}`;
    const rng = `${range.min}–${range.max} ${m.unit}`;
    const sentence =
      v === 'ok'
        ? `${m.label} (${shown}) is within this plant’s range (${rng}).`
        : `${m.label} (${shown}) is ${v === 'low' ? 'below' : 'above'} this plant’s range (${rng}).`;
    return { key, value, range, verdict: v, sentence };
  });
}
