// Alert engine. Alerts are edge-triggered: a condition alerts once when it becomes true
// and only again after it has cleared. Clearing uses a hysteresis margin so a value
// hovering at the edge of a range does not cause repeated alerts.

import type { AlertCategory, AlertItem, DataSource, Reading, SensorKey, Settings } from '../types';
import { PLANT_LABEL, SENSOR_META } from '../ml/interpret';

type SensorCats = { key: SensorKey; low: AlertCategory; high: AlertCategory };
const SENSOR_CATS: SensorCats[] = [
  { key: 'soilPct', low: 'soilLow', high: 'soilHigh' },
  { key: 'humRhEst', low: 'humLow', high: 'humHigh' },
  { key: 'sunlightPct', low: 'lightLow', high: 'lightHigh' },
];

export const ALERT_LABELS: Record<AlertCategory, { title: string; description: string }> = {
  soilLow: { title: 'Soil is dry', description: 'Soil moisture drops below the plant’s range' },
  soilHigh: { title: 'Soil is very wet', description: 'Soil moisture rises above the plant’s range' },
  humLow: { title: 'Air is dry', description: 'Estimated humidity drops below the range' },
  humHigh: { title: 'Air is very humid', description: 'Estimated humidity rises above the range' },
  lightLow: { title: 'Not enough light', description: 'Sunlight drops below the range during the day (laptop clock)' },
  lightHigh: { title: 'Too much light', description: 'Sunlight rises above the range' },
  highStress: { title: 'High stress predicted', description: 'The model’s class changes to High stress' },
  linkLost: { title: 'Device connection lost', description: 'The app loses contact with the PlantCare server' },
  linkRestored: { title: 'Device reconnected', description: 'The app reaches the PlantCare server again' },
  stm32Stale: { title: 'No new sensor data', description: 'The server is reachable but no new readings are arriving from the NodeMCU/STM32' },
};

/** Which conditions are currently active, per data source and plant. */
export class AlertEngine {
  private active = new Set<string>();

  reset() {
    this.active.clear();
  }

  evaluate(r: Reading, s: Settings): AlertItem[] {
    const out: AlertItem[] = [];
    const ranges = s.profiles[r.plant].ranges;
    const tag = `${r.source}:${r.plant}:`;
    const name = s.profiles[r.plant].nickname || PLANT_LABEL[r.plant];

    for (const c of SENSOR_CATS) {
      const v = r[c.key];
      const { min, max } = ranges[c.key];
      const h = s.hysteresis[c.key];
      const m = SENSOR_META[c.key];
      const unit = ` ${m.unit}`;
      // Darkness at night is normal: low-light only counts when it is day (or the time is unknown).
      const nightLight = c.key === 'sunlightPct' && r.laptopIsDay === false;
      for (const [cat, isLow] of [[c.low, true], [c.high, false]] as const) {
        const id = tag + cat;
        const triggered = (isLow ? v < min : v > max) && !(isLow && nightLight);
        const cleared = isLow ? v >= min + h : v <= max - h;
        if (!this.active.has(id) && triggered) {
          this.active.add(id);
          if (s.alertsEnabled[cat])
            out.push(make(cat, r.source, `${name}: ${v}${unit}, ${isLow ? 'below' : 'above'} the range ${min}–${max}${unit}.`, r.ts));
        } else if (this.active.has(id) && cleared) {
          this.active.delete(id);
        }
      }
    }

    const sid = tag + 'highStress';
    if (r.mlClass === 0 && !this.active.has(sid)) {
      this.active.add(sid);
      if (s.alertsEnabled.highStress)
        out.push(make('highStress', r.source, `${name}: the model now predicts High stress.`, r.ts));
    } else if (r.mlClass !== 0) {
      this.active.delete(sid);
    }
    return out;
  }

  /** Link events (lost / restored / STM32 stale). Returns an alert when the state changes. */
  link(cat: 'linkLost' | 'linkRestored' | 'stm32Stale', on: boolean, s: Settings, detail: string): AlertItem | null {
    const id = 'link:' + cat;
    if (on && !this.active.has(id)) {
      this.active.add(id);
      if (cat === 'linkLost') this.active.delete('link:linkRestored');
      if (cat === 'linkRestored') this.active.delete('link:linkLost');
      return s.alertsEnabled[cat] ? make(cat, 'link', detail, Date.now()) : null;
    }
    if (!on) this.active.delete(id);
    return null;
  }
}

function make(category: AlertCategory, source: DataSource | 'link', detail: string, ts: number): AlertItem {
  return {
    id: `${ts}-${category}-${Math.random().toString(36).slice(2, 7)}`,
    ts, category, title: ALERT_LABELS[category].title, detail, source, read: false,
  };
}

const ALERTS_KEY = 'plantcare.alerts.v1';
export function loadAlerts(): AlertItem[] {
  try {
    const a = JSON.parse(localStorage.getItem(ALERTS_KEY) || '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}
export function saveAlerts(a: AlertItem[]) {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(a.slice(0, 300)));
  } catch {
    /* storage full or blocked: alerts stay in memory for this session */
  }
}
