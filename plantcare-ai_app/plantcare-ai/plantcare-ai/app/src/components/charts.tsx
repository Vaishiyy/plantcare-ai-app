// Charts: a lightweight SVG sparkline for cards, and a Recharts trend chart with the
// plant's configured range drawn as a band. One series per chart, so no legend is needed;
// the card title names the series. Null points render as gaps (no data received).

import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SensorKey } from '../types';
import { SENSOR_META } from '../ml/interpret';

const LINE = '#2E6B50';
const BAND = '#E3EBDA';
const GRID = '#E7E5D8';
const AXIS = '#6F7B72';

export function Sparkline({ values, range, domain, dim = false }: {
  values: number[]; range?: { min: number; max: number }; domain: [number, number]; dim?: boolean;
}) {
  const w = 120, h = 34, pad = 3;
  if (values.length < 2) return <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" />;
  const [lo, hi] = domain;
  const y = (v: number) => h - pad - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * (h - 2 * pad);
  const x = (i: number) => pad + (i / (values.length - 1)) * (w - 2 * pad);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      {range && <rect x={0} width={w} y={y(range.max)} height={Math.max(0, y(range.min) - y(range.max))} fill={BAND} />}
      <path d={d} fill="none" stroke={dim ? '#9AA39C' : LINE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const TICKS: Record<SensorKey, number[]> = {
  soilPct: [0, 25, 50, 75, 100],
  humRhEst: [0, 25, 50, 75, 100],
  sunlightPct: [0, 25, 50, 75, 100],
};

export const DOMAINS: Record<SensorKey, [number, number]> = {
  soilPct: [0, 100],
  humRhEst: [0, 100],
  sunlightPct: [0, 100],
};

type Pt = { t: number } & Partial<Record<SensorKey, number | null>>;

export function TrendChart({ data, k, range, timeFmt, tall = false, dim = false }: {
  data: Pt[]; k: SensorKey; range?: { min: number; max: number }; timeFmt: (t: number) => string; tall?: boolean; dim?: boolean;
}) {
  const m = SENSOR_META[k];
  const unit = ` ${m.unit}`;
  return (
    <div className={`chart-box${tall ? ' tall' : ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          {range && <ReferenceArea y1={range.min} y2={range.max} fill={BAND} fillOpacity={1} ifOverflow="hidden" />}
          <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={timeFmt}
            tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={36} />
          <YAxis domain={DOMAINS[k]} ticks={TICKS[k]} tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            cursor={{ stroke: AXIS, strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Pt;
              const v = p[k];
              return (
                <div className="tip">
                  <div>{new Date(p.t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                  <div>{v === null || v === undefined ? 'No data' : <><b>{v}</b>{unit}</>}</div>
                </div>
              );
            }}
          />
          <Line type="monotone" dataKey={k} stroke={dim ? '#9AA39C' : LINE} strokeWidth={2}
            dot={(p: { cx?: number; cy?: number; index?: number }) => {
              // A point with no neighbours would be invisible as a line, so draw it as a dot.
              const i = p.index ?? 0;
              const isolated = data[i]?.[k] != null && data[i - 1]?.[k] == null && data[i + 1]?.[k] == null;
              return isolated && p.cx != null && p.cy != null
                ? <circle key={i} cx={p.cx} cy={p.cy} r={3.5} fill={dim ? '#9AA39C' : LINE} />
                : <g key={i} />;
            }}
            activeDot={{ r: 5, stroke: '#FDFCF7', strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
