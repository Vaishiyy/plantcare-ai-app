// Editor for one plant's ranges. Validates min < max and the sensor's physical limits.

import { useState } from 'react';
import type { PlantRanges, SensorKey } from '../types';
import { SENSOR_META } from '../ml/interpret';
import { DOMAINS } from './charts';

const KEYS: SensorKey[] = ['soilPct', 'humRhEst', 'sunlightPct'];

export function useRangeDraft(initial: PlantRanges) {
  const [draft, setDraft] = useState(() => Object.fromEntries(
    KEYS.map((k) => [k, { min: String(initial[k].min), max: String(initial[k].max) }]),
  ) as Record<SensorKey, { min: string; max: string }>);

  const errors = Object.fromEntries(KEYS.map((k) => {
    const [lo, hi] = DOMAINS[k];
    const mn = Number(draft[k].min), mx = Number(draft[k].max);
    let e = '';
    if (draft[k].min.trim() === '' || draft[k].max.trim() === '' || !Number.isFinite(mn) || !Number.isFinite(mx)) e = 'Enter both numbers.';
    else if (mn < lo || mx > hi) e = `Must be between ${lo} and ${hi}.`;
    else if (mn >= mx) e = 'Minimum must be lower than maximum.';
    return [k, e];
  })) as Record<SensorKey, string>;

  const valid = KEYS.every((k) => !errors[k]);
  const value = (): PlantRanges => Object.fromEntries(
    KEYS.map((k) => [k, { min: Number(draft[k].min), max: Number(draft[k].max) }]),
  ) as PlantRanges;
  const reset = (r: PlantRanges) => setDraft(Object.fromEntries(
    KEYS.map((k) => [k, { min: String(r[k].min), max: String(r[k].max) }]),
  ) as Record<SensorKey, { min: string; max: string }>);

  return { draft, setDraft, errors, valid, value, reset };
}

export function RangeFields({ d }: { d: ReturnType<typeof useRangeDraft> }) {
  return (
    <div className="stack">
      {KEYS.map((k) => {
        const m = SENSOR_META[k];
        const id = `rng-${k}`;
        return (
          <div className="field" key={k}>
            <span className="label" id={id}>{m.label} ({m.unit})</span>
            <div className="range-pair" role="group" aria-labelledby={id}>
              <input className="input" inputMode="decimal" aria-label={`${m.label} minimum`} aria-invalid={!!d.errors[k]}
                value={d.draft[k].min} onChange={(e) => d.setDraft({ ...d.draft, [k]: { ...d.draft[k], min: e.target.value } })} />
              <span className="muted">to</span>
              <input className="input" inputMode="decimal" aria-label={`${m.label} maximum`} aria-invalid={!!d.errors[k]}
                value={d.draft[k].max} onChange={(e) => d.setDraft({ ...d.draft, [k]: { ...d.draft[k], max: e.target.value } })} />
            </div>
            {d.errors[k] && <span className="hint" style={{ color: '#8f2f1f' }}>{d.errors[k]}</span>}
          </div>
        );
      })}
    </div>
  );
}
