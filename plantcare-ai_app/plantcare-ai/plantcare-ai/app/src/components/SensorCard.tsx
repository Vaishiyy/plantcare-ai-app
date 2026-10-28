import { Droplets, Sun, Thermometer, Wind } from 'lucide-react';
import type { Range, Reading, SensorKey } from '../types';
import { SENSOR_META, verdict, verdictWord } from '../ml/interpret';
import { DOMAINS, Sparkline } from './charts';

const ICON: Record<SensorKey, JSX.Element> = { soilPct: <Droplets />, humRhEst: <Wind />, sunlightPct: <Sun /> };

export function SensorCard({ k, reading, recent, range, live }: {
  k: SensorKey; reading: Reading | null; recent: Reading[]; range: Range; live: boolean;
}) {
  const m = SENSOR_META[k];
  const value = reading ? reading[k] : null;
  const v = value === null ? null : verdict(value, range);
  const chip = !live ? 'chip-off' : v === 'ok' ? 'chip-good' : v ? 'chip-warn' : 'chip-off';
  const label = k === 'humRhEst' ? 'Air humidity (est.)' : m.label;
  return (
    <div className={`card sensor${live ? '' : ' is-old'}`}>
      <div className="sensor-top">
        <span className="sensor-ico" aria-hidden="true">{ICON[k]}</span>
        {v && <span className={`chip ${chip}`}>{verdictWord(k, v)}</span>}
      </div>
      <div className="sensor-label">{label}</div>
      <div className="sensor-val" aria-label={`${label}: ${value ?? 'no data'} ${m.unit}`}>
        {value ?? '—'}
        <small>{m.unit}</small>
      </div>
      <Sparkline values={recent.slice(-40).map((r) => r[k])} range={range} domain={DOMAINS[k]} dim={!live} />
      <div className="sensor-note">Range {range.min}–{range.max} {m.unit}{k === 'sunlightPct' && reading ? ` · LDR raw ${reading.ldrAdc}` : ''}</div>
    </div>
  );
}

export function TempCard({ value }: { value: number | null }) {
  return (
    <div className="card sensor">
      <div className="sensor-top">
        <span className="sensor-ico" aria-hidden="true"><Thermometer /></span>
        <span className="chip chip-plain">Assumed</span>
      </div>
      <div className="sensor-label">Temperature</div>
      <div className="sensor-val" style={{ color: 'var(--muted)' }}>
        {value ?? 25}<small>°C</small>
      </div>
      <div className="sensor-note" style={{ marginTop: 'auto' }}>
        Not measured. The firmware feeds a fixed 25 °C to the model, so there is no trend or alert.
      </div>
    </div>
  );
}
