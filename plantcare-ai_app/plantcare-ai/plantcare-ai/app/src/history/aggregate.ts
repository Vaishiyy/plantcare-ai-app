// Chart series, daily summaries, class segments and CSV export from stored readings.

import type { MlClass, Reading, SensorKey } from '../types';

export type RangeKey = '24h' | '7d' | '30d';
export const RANGE_MS: Record<RangeKey, number> = { '24h': 86400000, '7d': 7 * 86400000, '30d': 30 * 86400000 };
const BUCKET_MS: Record<RangeKey, number> = { '24h': 10 * 60000, '7d': 60 * 60000, '30d': 4 * 3600000 };

export interface ChartPoint {
  t: number;
  soilPct: number | null;
  humRhEst: number | null;
  sunlightPct: number | null;
}

/**
 * Averages readings into fixed time buckets. Empty buckets become null points, so the
 * chart shows a gap where no data was received instead of drawing a line across it.
 */
export function bucketize(rows: Reading[], range: RangeKey, now: number): ChartPoint[] {
  const size = BUCKET_MS[range];
  const start = Math.floor((now - RANGE_MS[range]) / size) * size;
  const n = Math.ceil((now - start) / size);
  const acc = Array.from({ length: n }, () => ({ c: 0, s: 0, h: 0, l: 0 }));
  for (const r of rows) {
    const i = Math.floor((r.ts - start) / size);
    if (i < 0 || i >= n) continue;
    const a = acc[i];
    a.c++; a.s += r.soilPct; a.h += r.humRhEst; a.l += r.sunlightPct;
  }
  return acc.map((a, i) => ({
    t: start + i * size + size / 2,
    soilPct: a.c ? Math.round((a.s / a.c) * 10) / 10 : null,
    humRhEst: a.c ? Math.round((a.h / a.c) * 10) / 10 : null,
    sunlightPct: a.c ? Math.round((a.l / a.c) * 10) / 10 : null,
  }));
}

export interface DailyRow {
  day: string; // YYYY-MM-DD, local time
  count: number;
  stats: Record<SensorKey, { avg: number; min: number; max: number }>;
}

const KEYS: SensorKey[] = ['soilPct', 'humRhEst', 'sunlightPct'];

export function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dailySummary(rows: Reading[]): DailyRow[] {
  const map = new Map<string, Reading[]>();
  for (const r of rows) {
    const k = dayKey(r.ts);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(r);
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, rs]) => ({
      day,
      count: rs.length,
      stats: Object.fromEntries(
        KEYS.map((k) => {
          const v = rs.map((r) => r[k]);
          return [k, { avg: v.reduce((x, y) => x + y, 0) / v.length, min: Math.min(...v), max: Math.max(...v) }];
        }),
      ) as DailyRow['stats'],
    }));
}

export function extremes(rows: Reading[]) {
  return Object.fromEntries(
    KEYS.map((k) => {
      let lo: Reading | null = null, hi: Reading | null = null;
      for (const r of rows) {
        if (!lo || r[k] < lo[k]) lo = r;
        if (!hi || r[k] > hi[k]) hi = r;
      }
      return [k, { lo, hi }];
    }),
  ) as Record<SensorKey, { lo: Reading | null; hi: Reading | null }>;
}

export interface ClassSegment { cls: MlClass; from: number; to: number; plant: Reading['plant']; count: number }

/** Collapses consecutive readings with the same class (and plant) into segments. A gap longer than `gapMs` also starts a new segment. */
export function classSegments(rows: Reading[], gapMs = 11 * 60000): ClassSegment[] {
  const out: ClassSegment[] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.cls === r.mlClass && last.plant === r.plant && r.ts - last.to <= gapMs) {
      last.to = r.ts; last.count++;
    } else {
      out.push({ cls: r.mlClass, from: r.ts, to: r.ts, plant: r.plant, count: 1 });
    }
  }
  return out;
}

export function toCsv(rows: Reading[]): string {
  const head = [
    'received_at_iso', 'received_at_ms', 'source', 'seq', 'esp_uptime_ms', 'plant', 'ml_class', 'ml_status',
    'ml_provisional', 'fw_day', 'laptop_is_day', 'temp_c_assumed', 'sunlight_pct', 'soil_pct', 'hum_rh_est',
    'ldr_adc', 'hum_adc', 'soil_raw', 'low_light_min', 'high_light_min', 'warnings',
  ];
  const names = ['HIGH STRESS', 'MODERATE STRESS', 'SUITABLE'];
  const lines = rows.map((r) =>
    [
      new Date(r.ts).toISOString(), r.ts, r.source, r.seq, r.espUptimeMs ?? '', r.plant, r.mlClass, names[r.mlClass],
      r.mlProvisional, r.fwDay, r.laptopIsDay === null ? '' : r.laptopIsDay ? 1 : 0, r.tempAssumedC,
      r.sunlightPct, r.soilPct, r.humRhEst, r.ldrAdc, r.humAdc, r.soilRaw, r.lowLightMin, r.highLightMin,
      r.warnings.join('; '),
    ].join(','),
  );
  return [head.join(','), ...lines].join('\r\n');
}

export function downloadText(filename: string, text: string, mime = 'text/csv') {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
