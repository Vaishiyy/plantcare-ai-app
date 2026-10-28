import { AlertTriangle, Leaf, Moon, Sun, Wifi } from 'lucide-react';
import { useStore } from '../store';
import { PlantArt } from '../components/PlantArt';
import { HealthMeter } from '../components/HealthMeter';
import { SensorCard, TempCard } from '../components/SensorCard';
import { DataStateBanner, LinkBadge, fmtAgo, fmtTime } from '../components/ui';
import { CLASS_INFO, FW_WARNING_TEXT, PLANT_LABEL } from '../ml/interpret';
import { healthScore } from '../ml/healthScore';
import type { Screen } from '../App';

function greeting(h: number) {
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function Home({ go }: { go: (s: Screen) => void }) {
  const { latest, recent, link, settings, lastReadingAt, now, connect, wsPhase } = useStore();
  const isCurrent = link === 'live' || link === 'demo';
  const plant = latest?.plant ?? null;
  const profile = plant ? settings.profiles[plant] : null;
  const info = latest ? CLASS_INFO[latest.mlClass] : null;
  const name = profile?.nickname || (plant ? PLANT_LABEL[plant] : 'Your plant');
  const connectBusy = wsPhase === 'connecting' || wsPhase === 'reconnecting';
  const hs = latest && profile ? healthScore(latest, profile.ranges, latest.laptopIsDay) : null;

  return (
    <div className="screen-enter">
      <header className="screen-head">
        <div>
          <h1>Hello, Plant Parent! 🌱</h1>
          <p>
            {greeting(new Date(now).getHours())}. {new Date(now).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <LinkBadge link={link} />
      </header>

      <div className="stack">
        <DataStateBanner />

        <section className={`hero${isCurrent ? '' : ' is-stale'}`} aria-label="Plant health">
          <div className="hero-grid">
            <PlantArt plant={plant} cls={latest?.mlClass ?? null} live={isCurrent} />
            <div>
              <div className="meta">{name}{profile?.nickname && plant ? ` (${PLANT_LABEL[plant]})` : ''}</div>
              <h2 style={{ marginTop: 4 }}>{info ? info.label : 'Waiting for data'}</h2>
              <p className="meta" style={{ marginTop: 6 }}>
                {info
                  ? isCurrent
                    ? info.action
                    : `Last prediction, from ${fmtTime(lastReadingAt)}. Not live.`
                  : link === 'demo'
                    ? 'Starting the simulation…'
                    : 'Connect to the device to see the model’s prediction.'}
              </p>
              <p className="meta small" style={{ marginTop: 8 }}>
                Last sync: {lastReadingAt ? `${fmtTime(lastReadingAt)} (${fmtAgo(lastReadingAt, now)})` : 'none yet'}
                {latest && latest.laptopIsDay !== null && (
                  <span style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>
                    {latest.laptopIsDay ? <Sun size={13} style={{ verticalAlign: '-2px' }} /> : <Moon size={13} style={{ verticalAlign: '-2px' }} />}
                    {' '}{latest.laptopIsDay ? 'Day' : 'Night'} ({link === 'demo' ? 'phone' : 'laptop'} clock)
                  </span>
                )}
              </p>
              {latest && latest.warnings.length > 0 && (
                <div className="fw-warn" aria-label="Warnings from the device">
                  {latest.warnings.map((w) => (
                    <span key={w} className="chip"><AlertTriangle size={14} /> {FW_WARNING_TEXT[w]}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => go('plant')}><Leaf /> View Plant Details</button>
            {link === 'demo' ? (
              <button className="btn btn-ghost" onClick={() => go('settings')}><Wifi /> Connect Device</button>
            ) : link === 'live' || link === 'stale' ? (
              <button className="btn btn-ghost" onClick={() => go('settings')}><Wifi /> Device settings</button>
            ) : (
              <button className="btn btn-ghost" onClick={() => connect()} disabled={connectBusy}>
                <Wifi /> {connectBusy ? 'Connecting…' : 'Connect Device'}
              </button>
            )}
          </div>
        </section>

        {link === 'demo' && (
          <p className="small muted">Connect Device is unavailable in Demo Mode. Turn Demo Mode off in Settings first.</p>
        )}

        <HealthMeter hs={hs} live={isCurrent} />

        <div className="section-title"><h2>Sensors</h2><span className="small muted">vs. this plant’s range</span></div>
        {profile && latest ? (
          <div className="grid-2">
            <SensorCard k="soilPct" reading={latest} recent={recent} range={profile.ranges.soilPct} live={isCurrent} />
            <SensorCard k="humRhEst" reading={latest} recent={recent} range={profile.ranges.humRhEst} live={isCurrent} />
            <SensorCard k="sunlightPct" reading={latest} recent={recent} range={profile.ranges.sunlightPct} live={isCurrent} />
            <TempCard value={latest.tempAssumedC} />
          </div>
        ) : (
          <div className="card">
            <p className="ink2">
              No readings yet. When the NodeMCU posts the STM32’s first reading to the server, soil moisture, humidity and sunlight appear here.
              To try the app without hardware, turn on Demo Mode in Settings.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
