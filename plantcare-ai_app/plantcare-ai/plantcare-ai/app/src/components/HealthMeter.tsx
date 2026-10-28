// Health meter: a 0–100 half-circle gauge with a needle, plus one bar per sensor.
// The gauge track is split into the three stress bands (High 0–44, Moderate 45–74, Suitable 75–100).
// The needle always sits inside the band of the model's class, so the meter, the stress label and
// the ring around the plant agree. The readings move the needle within that band (ml/healthScore.ts).

import type { HealthScore, ScoreBand } from '../ml/healthScore';
import { CLASS_BAND, SCORE_WEIGHTS } from '../ml/healthScore';
import { SENSOR_META, verdictWord } from '../ml/interpret';
import type { MlClass } from '../types';

const BAND_COLOR: Record<ScoreBand | 'off', string> = {
  good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)', off: 'var(--off)',
};
const CLASS_TONE: Record<MlClass, ScoreBand> = { 0: 'bad', 1: 'warn', 2: 'good' };
const LABEL: Record<string, string> = { soilPct: 'Soil moisture', humRhEst: 'Air humidity', sunlightPct: 'Sunlight' };

const CX = 100, CY = 100, R = 80;
/** Point on the gauge arc for a 0–100 value (0 = left, 100 = right). */
const pt = (v: number, r = R) => {
  const a = Math.PI * (1 + v / 100);
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)] as const;
};
const arcPath = (v0: number, v1: number) => {
  const [x0, y0] = pt(v0), [x1, y1] = pt(v1);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

export function HealthMeter({ hs, live, showParts = true }: { hs: HealthScore | null; live: boolean; showParts?: boolean }) {
  const score = hs?.score ?? 0;
  const tone: ScoreBand | 'off' = hs && live ? hs.band : 'off';
  const angle = -90 + (score / 100) * 180; // needle: -90° = 0, +90° = 100

  return (
    <div className={`card health-meter${live ? '' : ' is-old'}`} aria-label="Health meter">
      <div className="row between wrap" style={{ alignItems: 'baseline' }}>
        <h3>Health meter</h3>
        <span className="small muted">{hs ? (live ? 'Updates with every reading' : 'Last reading, not live') : 'Waiting for data'}</span>
      </div>

      <div className="gauge-wrap">
        <svg viewBox="0 0 200 120" className="gauge" role="img"
          aria-label={hs ? `Health score ${score} out of 100, ${hs.label}` : 'No health score yet'}>
          {/* three stress bands; the current one is solid, the others faint */}
          {([0, 1, 2] as MlClass[]).map((c) => {
            const [lo, hi] = CLASS_BAND[c];
            const current = hs?.cls === c;
            return (
              <path key={c} d={arcPath(lo + (c === 0 ? 0 : 0.8), hi + (c === 2 ? 0 : 0.2))} fill="none" strokeWidth={16}
                strokeLinecap={c === 1 ? 'butt' : 'round'}
                stroke={live && hs ? BAND_COLOR[CLASS_TONE[c]] : 'var(--off)'}
                opacity={hs && current ? 1 : 0.22} className="gauge-band" />
            );
          })}
          {/* needle */}
          <g className="gauge-needle" style={{ transform: `rotate(${hs ? angle : -90}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
            <line x1={CX} y1={CY} x2={CX} y2={30} stroke="var(--ink)" strokeWidth={3} strokeLinecap="round" />
          </g>
          <circle cx={CX} cy={CY} r={6} fill="var(--ink)" />
          <text x={20} y={117} textAnchor="middle" className="gauge-tick">0</text>
          <text x={180} y={117} textAnchor="middle" className="gauge-tick">100</text>
        </svg>
        <div className="gauge-readout">
          <div className="gauge-num" style={{ color: hs && live ? undefined : 'var(--muted)' }}>{hs ? score : '—'}<small>/100</small></div>
          <span className="chip" style={{ background: `color-mix(in srgb, ${BAND_COLOR[tone]} 18%, white)`, color: 'var(--ink)' }}>
            {hs ? hs.label : 'No data'}
          </span>
        </div>
      </div>

      {showParts && hs && (
        <div className="meter-parts">
          {hs.parts.map((p) => (
            <div key={p.key} className={`meter-part${p.counted ? '' : ' is-skipped'}`}>
              <div className="row between small">
                <span>{LABEL[p.key]} <span className="muted">· {p.value} {SENSOR_META[p.key].unit}</span></span>
                <span className="muted">{p.counted ? verdictWord(p.key, p.verdict) : 'not counted at night'}</span>
              </div>
              <div className="bar" aria-hidden="true">
                <span style={{ width: `${p.counted ? p.score : 0}%`, background: p.counted && live ? BAND_COLOR[p.score >= 75 ? 'good' : p.score >= 45 ? 'warn' : 'bad'] : 'var(--off)' }} />
              </div>
            </div>
          ))}
          <p className="small muted" style={{ marginTop: 4 }}>
            The coloured band is the model’s stress level ({hs.label}). The readings move the needle inside it
            (soil {SCORE_WEIGHTS.soilPct * 100}%, humidity {SCORE_WEIGHTS.humRhEst * 100}%, sunlight {SCORE_WEIGHTS.sunlightPct * 100}% against your ranges, now {hs.readingsScore}/100).
            {hs.night ? ' It is night by the laptop clock, so sunlight is left out.' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
