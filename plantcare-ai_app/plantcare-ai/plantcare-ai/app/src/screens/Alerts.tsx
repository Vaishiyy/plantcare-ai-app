import { useEffect, useState } from 'react';
import { Bell, BellOff, CheckCheck, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { ALERT_LABELS } from '../alerts/engine';
import { InfoNote, LinkBadge, Toggle, fmtDateTime } from '../components/ui';
import { RangeFields, useRangeDraft } from '../components/RangeEditor';
import type { AlertCategory, PlantType } from '../types';
import { PLANT_LABEL } from '../ml/interpret';
import type { Screen } from '../App';

const GROUPS: { title: string; cats: AlertCategory[] }[] = [
  { title: 'Plant conditions', cats: ['soilLow', 'soilHigh', 'humLow', 'humHigh', 'lightLow', 'lightHigh', 'highStress'] },
  { title: 'Device connection', cats: ['linkLost', 'linkRestored', 'stm32Stale'] },
];

export function Alerts({ go }: { go: (s: Screen) => void }) {
  const { alerts, markAlertsRead, clearAlerts, settings, updateSettings, link, toast, latest } = useStore();
  const [tab, setTab] = useState<'inbox' | 'settings'>('inbox');
  const [plant, setPlant] = useState<PlantType>(latest?.plant ?? 'POTHOS');
  const d = useRangeDraft(settings.profiles[plant].ranges);

  // Viewing the inbox marks alerts as read (after a moment, so the "new" markers are visible first).
  useEffect(() => {
    if (tab !== 'inbox') return;
    const id = window.setTimeout(markAlertsRead, 2500);
    return () => window.clearTimeout(id);
  }, [tab, alerts.length, markAlertsRead]);

  useEffect(() => { d.reset(settings.profiles[plant].ranges); }, [plant]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="screen-enter">
      <header className="screen-head">
        <div>
          <h1>Alerts</h1>
          <p>In-app only. The app must be open to raise alerts.</p>
        </div>
        <LinkBadge link={link} />
      </header>

      <div className="stack">
        <div className="seg" role="group" aria-label="Alerts view">
          <button aria-pressed={tab === 'inbox'} onClick={() => setTab('inbox')}>Notifications</button>
          <button aria-pressed={tab === 'settings'} onClick={() => setTab('settings')}>Alert settings</button>
        </div>

        {tab === 'inbox' ? (
          <>
            <div className="row wrap">
              <button className="btn btn-ghost" onClick={markAlertsRead} disabled={!alerts.some((a) => !a.read)}><CheckCheck /> Mark all read</button>
              <button className="btn btn-ghost" onClick={() => { clearAlerts(); toast('Alerts cleared.', 'info'); }} disabled={!alerts.length}><Trash2 /> Clear all</button>
            </div>
            <div className="card">
              {alerts.length === 0 ? (
                <div className="empty">
                  <Bell />
                  <h3>No alerts</h3>
                  <p className="small">You’ll see an alert here when a reading leaves a plant’s range, the model predicts High stress, or the device connection changes.</p>
                </div>
              ) : (
                <div className="list">
                  {alerts.map((a) => (
                    <div className="list-item" key={a.id}>
                      <span className={`chip ${a.category === 'linkRestored' ? 'chip-good' : a.category === 'highStress' ? 'chip-bad' : a.source === 'link' ? 'chip-off' : 'chip-warn'}`}
                        style={{ flex: 'none' }}>
                        {a.source === 'link' ? 'Device' : 'Plant'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="row between" style={{ alignItems: 'baseline' }}>
                          <b>{a.title}</b>
                          {!a.read && <span className="chip chip-plain" style={{ fontSize: 11 }}>New</span>}
                        </div>
                        <div className="small ink2">{a.detail}</div>
                        <div className="small muted">{fmtDateTime(a.ts)}{a.source === 'demo' ? ' (demo data)' : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <InfoNote>
              Push notifications are not set up: this is a local web app with no notification server, so alerts appear only while it is open.
              Each condition alerts once, and again only after it has cleared.
            </InfoNote>
          </>
        ) : (
          <>
            {GROUPS.map((g) => (
              <div className="card" key={g.title}>
                <h3 style={{ marginBottom: 4 }}>{g.title}</h3>
                <div className="list">
                  {g.cats.map((c) => (
                    <div className="list-item" key={c} style={{ alignItems: 'center' }}>
                      {settings.alertsEnabled[c] ? <Bell size={18} color="var(--forest)" /> : <BellOff size={18} color="var(--muted)" />}
                      <div style={{ flex: 1 }}>
                        <div><b>{ALERT_LABELS[c].title}</b></div>
                        <div className="small muted">{ALERT_LABELS[c].description}</div>
                      </div>
                      <Toggle label={ALERT_LABELS[c].title} checked={settings.alertsEnabled[c]}
                        onChange={(v) => updateSettings((s) => ({ ...s, alertsEnabled: { ...s.alertsEnabled, [c]: v } }))} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <p className="small muted">There are no temperature alerts, because temperature is not measured.</p>

            <div className="card">
              <h3>Thresholds</h3>
              <p className="small muted" style={{ margin: '4px 0 10px' }}>Plant-condition alerts use each plant’s ranges. Editing them here also changes Plant Details.</p>
              <div className="seg" role="group" aria-label="Plant" style={{ marginBottom: 12 }}>
                {(['ALOE_VERA', 'POTHOS'] as PlantType[]).map((p) => (
                  <button key={p} aria-pressed={plant === p} onClick={() => setPlant(p)}>{PLANT_LABEL[p]}</button>
                ))}
              </div>
              <RangeFields d={d} />
              <button className="btn btn-primary" style={{ marginTop: 14 }} disabled={!d.valid} onClick={() => {
                updateSettings((s) => ({ ...s, profiles: { ...s.profiles, [plant]: { ...s.profiles[plant], ranges: d.value() } } }));
                toast(`${PLANT_LABEL[plant]} thresholds saved.`, 'good');
              }}>Save thresholds</button>
            </div>

            <div className="card">
              <h3>Repeat protection</h3>
              <p className="small muted" style={{ margin: '4px 0 10px' }}>
                After an alert, the value must come back inside the range by this margin before the same alert can fire again.
              </p>
              <div className="grid-3">
                {([['soilPct', 'Soil (%)'], ['humRhEst', 'Humidity (%RH)'], ['sunlightPct', 'Sunlight (%)']] as const).map(([k, label]) => (
                  <div className="field" key={k}>
                    <label htmlFor={`hy-${k}`}>{label}</label>
                    <input id={`hy-${k}`} className="input" type="number" min={0} max={20}
                      value={settings.hysteresis[k]}
                      onChange={(e) => {
                        const v = Math.max(0, Math.min(20, Number(e.target.value) || 0));
                        updateSettings((s) => ({ ...s, hysteresis: { ...s.hysteresis, [k]: v } }));
                      }} />
                  </div>
                ))}
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => go('settings')}>More settings</button>
          </>
        )}
      </div>
    </div>
  );
}
