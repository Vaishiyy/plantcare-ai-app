import { Activity, RefreshCw, Thermometer } from 'lucide-react';
import { useStore } from '../store';
import { TrendChart } from '../components/charts';
import { ClassChip, DataStateBanner, LinkBadge, fmtAgo, fmtTime } from '../components/ui';
import { SENSOR_META, verdict, verdictWord } from '../ml/interpret';
import type { SensorKey } from '../types';
import type { Screen } from '../App';

const KEYS: SensorKey[] = ['soilPct', 'humRhEst', 'sunlightPct'];

export function Live({ go }: { go: (s: Screen) => void }) {
  const { latest, recent, link, settings, refresh, lastReadingAt, now } = useStore();
  const isCurrent = link === 'live' || link === 'demo';
  const plant = latest?.plant;
  const data = recent.filter((r) => !plant || r.plant === plant).map((r) => ({ t: r.ts, soilPct: r.soilPct, humRhEst: r.humRhEst, sunlightPct: r.sunlightPct }));
  const canRefresh = link === 'demo' || link === 'live' || link === 'stale';

  return (
    <div className="screen-enter">
      <header className="screen-head">
        <div>
          <h1>Live monitoring</h1>
          <p>Last update {lastReadingAt ? `${fmtTime(lastReadingAt)} (${fmtAgo(lastReadingAt, now)})` : 'none yet'}. Times are when this phone received each reading.</p>
        </div>
        <LinkBadge link={link} />
      </header>

      <div className="stack">
        <DataStateBanner />

        <div className="row wrap">
          <button className="btn btn-soft" onClick={refresh} disabled={!canRefresh}
            title={canRefresh ? 'Fetch the latest reading from the server again' : 'Connect to the device first'}>
            <RefreshCw /> Refresh Readings
          </button>
          <button className="btn btn-primary" onClick={() => go('analysis')} disabled={!latest}>
            <Activity /> Check Plant Health
          </button>
        </div>
        <p className="small muted">
          {link === 'demo'
            ? 'In Demo Mode, Refresh generates one new simulated reading.'
            : 'Refresh fetches the most recent reading from the server again. It cannot force a new sensor read: the STM32 reads and classifies on its own loop. Check Plant Health opens the latest prediction.'}
          {!canRefresh && ' Refresh is unavailable while offline.'}
        </p>

        {latest && (
          <div className="card row between wrap">
            <div>
              <div className="small muted">Latest prediction {isCurrent ? '' : '(not live)'}</div>
              <ClassChip cls={latest.mlClass} dim={!isCurrent} />
            </div>
            <div className="row small ink2"><Thermometer size={16} /> Temperature 25 °C, assumed and not measured</div>
          </div>
        )}

        <div className="grid-3">
          {KEYS.map((k) => {
            const m = SENSOR_META[k];
            const range = plant ? settings.profiles[plant].ranges[k] : undefined;
            const v = latest && range ? verdict(latest[k], range) : null;
            return (
              <div className="card" key={k}>
                <div className="row between">
                  <h3>{k === 'humRhEst' ? 'Air humidity (est.)' : m.label}</h3>
                  {v && <span className={`chip ${!isCurrent ? 'chip-off' : v === 'ok' ? 'chip-good' : 'chip-warn'}`}>{verdictWord(k, v)}</span>}
                </div>
                <div className="sensor-val" style={{ margin: '6px 0 2px', color: isCurrent ? undefined : 'var(--muted)' }}>
                  {latest ? latest[k] : '—'}<small>{m.unit}</small>
                </div>
                <p className="small muted">{m.help}</p>
                {data.length >= 2 ? (
                  <TrendChart data={data} k={k} range={range} dim={!isCurrent} timeFmt={(t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} />
                ) : (
                  <p className="small muted" style={{ padding: '24px 0' }}>The chart starts after two readings arrive.</p>
                )}
              </div>
            );
          })}
        </div>
        <p className="small muted">Shaded band: this plant’s configured range. Charts show the last {recent.length} readings kept in memory; see History for longer periods.</p>
      </div>
    </div>
  );
}
