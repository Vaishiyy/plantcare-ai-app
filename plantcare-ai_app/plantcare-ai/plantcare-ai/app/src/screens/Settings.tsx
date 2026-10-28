import { useEffect, useState } from 'react';
import { Cpu, Database, Download, FlaskConical, Info, Plug, PlugZap, RefreshCw, Ruler, Trash2, Unplug } from 'lucide-react';
import { useStore } from '../store';
import { InfoNote, LinkBadge, Sheet, Toggle, fmtAgo, fmtDuration, fmtTime } from '../components/ui';
import { PLANT_LABEL } from '../ml/interpret';
import { countReadings, getReadings, storageMode } from '../storage/db';
import { downloadText, toCsv } from '../history/aggregate';
import type { DataSource, PlantType } from '../types';
import type { Screen } from '../App';
import { isValidAddress, resolveAddress } from '../services/deviceService';


export function Settings({ go }: { go: (s: Screen) => void }) {
  const st = useStore();
  const { settings, updateSettings, link, wsPhase, wsDetail, espStatus, stats, latest, lastReadingAt, now, toast } = st;
  const [url, setUrl] = useState(settings.wsUrl);
  const [counts, setCounts] = useState<Record<DataSource, number | null>>({ device: null, demo: null });
  const [confirm, setConfirm] = useState<DataSource | null>(null);
  const [busy, setBusy] = useState(false);
  const urlOk = isValidAddress(url);

  useEffect(() => {
    Promise.all([countReadings('device'), countReadings('demo')]).then(([device, demo]) => setCounts({ device, demo }));
  }, [st.historyVersion, latest?.ts]);

  const saveAndConnect = () => {
    if (!urlOk) return;
    const u = url.trim();
    updateSettings((s) => ({ ...s, wsUrl: u }));
    st.connect(u);
  };

  const exportAll = async (src: DataSource) => {
    const rows = await getReadings(src, 0, Date.now());
    if (!rows.length) { toast('No stored readings to export.', 'warn'); return; }
    downloadText(`plantcare-${src}-all-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
    toast(`Exported ${rows.length} ${src} readings.`, 'good');
  };

  const phaseText: Record<string, string> = {
    idle: 'Not connected', connecting: 'Connecting…', open: 'Connected', reconnecting: 'Reconnecting…',
    failed: 'Connection failed', closed: 'Disconnected',
  };
  const connected = wsPhase === 'open';
  const trying = wsPhase === 'connecting' || wsPhase === 'reconnecting' || wsPhase === 'failed';

  return (
    <div className="screen-enter">
      <header className="screen-head">
        <div>
          <h1>Settings</h1>
          <p>Device connection, plant profiles, alerts and data</p>
        </div>
        <LinkBadge link={link} />
      </header>

      <div className="stack">
        {/* ---------------- Connection ---------------- */}
        <div className="card">
          <div className="row between wrap">
            <div className="row"><Plug size={20} color="var(--forest)" /><h2>Server connection</h2></div>
            <span className="chip chip-plain">{settings.demoMode ? 'Demo Mode on' : phaseText[wsPhase]}</span>
          </div>

          {settings.demoMode ? (
            <div style={{ marginTop: 12 }}>
              <InfoNote tone="warn">Demo Mode is on, so the app is not talking to any hardware. Turn Demo Mode off below to connect.</InfoNote>
            </div>
          ) : (
            <div className="stack" style={{ marginTop: 12 }}>
              <div className="field">
                <label htmlFor="ws">PlantCare server address</label>
                <input id="ws" className="input" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false}
                  autoCapitalize="off" autoCorrect="off" aria-invalid={!urlOk} placeholder={resolveAddress('')} />
                <span className="hint">
                  {urlOk
                    ? <>Leave empty to use the laptop this app was opened from (now: {resolveAddress(url)}). Otherwise enter http://&lt;laptop-IP&gt;:5000</>
                    : 'Enter an address starting with http://, for example http://YOUR_LAPTOP_IP:5000'}
                </span>
              </div>
              <div className="row wrap">
                {!connected && !trying && (
                  <button className="btn btn-primary" onClick={saveAndConnect} disabled={!urlOk}><PlugZap /> Connect</button>
                )}
                {(connected || trying) && (
                  <button className="btn btn-ghost" onClick={st.disconnect}><Unplug /> Disconnect</button>
                )}
                <button className="btn btn-soft" onClick={saveAndConnect} disabled={!urlOk}><RefreshCw /> {url !== settings.wsUrl ? 'Save & reconnect' : 'Reconnect'}</button>
              </div>

              {wsDetail && <InfoNote tone="warn">{wsDetail}</InfoNote>}
              {(wsPhase === 'failed' || wsPhase === 'reconnecting') && (
                <div className="panel small">
                  <b>Can’t reach the server? Check:</b>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                    <li><b>plantcare_server.py</b> is running on the laptop.</li>
                    <li>This device and the laptop are on the <b>same phone hotspot</b>.</li>
                    <li>Windows Firewall allows Python on this network (it asks the first time the server starts).</li>
                    <li>The address uses the laptop IP the server printed, with port 5000.</li>
                  </ul>
                </div>
              )}
              {link === 'stale' && (
                <InfoNote tone="warn">
                  The server is running, but no new readings are arriving from the NodeMCU. In the NodeMCU Serial Monitor check: Wi-Fi connected, “posts ok” rising (if “failed” rises, SERVER_URL is wrong or the firewall blocks it), and “bytes on D2” rising (if 0, check the STM32 PA9 → D2 wire and shared GND).
                </InfoNote>
              )}

              <div className="field" style={{ maxWidth: 360 }}>
                <label htmlFor="stale">Mark data as stale after (seconds)</label>
                <input id="stale" className="input" type="number" min={3} max={300} value={settings.staleTimeoutSec}
                  onChange={(e) => updateSettings((s) => ({ ...s, staleTimeoutSec: Math.max(3, Math.min(300, Number(e.target.value) || 15)) }))} />
                <span className="hint">The STM32 sends on its own loop, about every second or two. The server also reports stale after 10 s without a new reading.</span>
              </div>
              <label className="row between" style={{ cursor: 'pointer' }}>
                <span><b>Connect automatically</b><br /><span className="small muted">When the app opens</span></span>
                <Toggle label="Connect automatically" checked={settings.autoConnect} onChange={(v) => updateSettings((s) => ({ ...s, autoConnect: v }))} />
              </label>
              <p className="small muted">The STM32 sends one reading per second. It can’t be changed from the app, because nothing is wired from the NodeMCU back to the STM32.</p>
            </div>
          )}
        </div>

        {/* ---------------- Diagnostics ---------------- */}
        <div className="card">
          <div className="row"><Cpu size={20} color="var(--forest)" /><h2>Device diagnostics</h2></div>
          <p className="small muted" style={{ margin: '4px 0 10px' }}>
            Raw values from the {settings.demoMode ? 'simulator (demo)' : 'last device reading'}{lastReadingAt ? `, received ${fmtTime(lastReadingAt)}` : ''}.
          </p>
          <dl className="kv">
            <dt>LDR raw (LDR_ADC)</dt><dd>{latest?.ldrAdc ?? '—'}</dd>
            <dt>Humidity raw (HUM_ADC)</dt><dd>{latest?.humAdc ?? '—'}</dd>
            <dt>Soil raw (SOIL_RAW)</dt><dd>{latest?.soilRaw ?? '—'}</dd>
            <dt>Reported plant (SW2 toggles)</dt><dd>{latest ? PLANT_LABEL[latest.plant] : '—'}</dd>
            <dt>DAY on the STM32</dt><dd>{latest ? (latest.fwDay === -1 ? 'Unknown (no RX wire)' : latest.fwDay ? 'Day' : 'Night') : '—'}</dd>
            <dt>Day/night by {settings.demoMode ? 'phone' : 'laptop'} clock</dt><dd>{latest?.laptopIsDay == null ? '—' : latest.laptopIsDay ? 'Day' : 'Night'}</dd>
            <dt>Low / excess light timers</dt><dd>{latest ? `${latest.lowLightMin} / ${latest.highLightMin} min` : '—'}</dd>
            <dt>OLED warnings</dt><dd>{latest ? (latest.warnings.join(', ') || 'None') : '—'}</dd>
            <dt>Model marked provisional</dt><dd>{latest ? (latest.mlProvisional ? 'Yes' : 'No') : '—'}</dd>
            <dt>Reading sequence no.</dt><dd>{latest?.seq ?? '—'}</dd>
            {!settings.demoMode && (
              <>
                <dt>ESP8266 uptime</dt><dd>{espStatus ? fmtDuration(espStatus.espUptimeMs + (now - espStatus.receivedAt)) : '—'}</dd>
                <dt>ESP: STM32 link</dt><dd>{espStatus ? (espStatus.stm32Link === 'ok' ? 'OK' : 'Stale') : '—'}</dd>
                <dt>ESP: valid / invalid lines</dt><dd>{espStatus ? `${espStatus.validLines ?? '—'} / ${espStatus.invalidLines ?? '—'}` : '—'}</dd>
                                <dt>Last server status</dt><dd>{espStatus ? fmtAgo(espStatus.receivedAt, now) : '—'}</dd>
                <dt>Messages received (this session)</dt><dd>{stats.messages}</dd>
                <dt>Messages rejected by the app</dt><dd>{stats.invalid}{stats.lastInvalidReason ? ` (last: ${stats.lastInvalidReason})` : ''}</dd>
              </>
            )}
          </dl>
        </div>

        {/* ---------------- Demo ---------------- */}
        <div className="card">
          <label className="row between" style={{ cursor: 'pointer' }}>
            <span className="row"><FlaskConical size={20} color="#4d2d73" /><h2>Demo Mode</h2></span>
            <Toggle label="Demo Mode" checked={settings.demoMode} onChange={async (v) => { setBusy(true); await st.setDemoMode(v); setBusy(false); }} />
          </label>
          <p className="small ink2" style={{ marginTop: 8 }}>
            Generates simulated readings and classifies them with a JavaScript port of your firmware’s Decision Tree, with the same inputs as main.c (temperature fixed at 25 °C, time of day unknown).
            It never connects to hardware. Demo data is stored separately and labelled everywhere it appears.
            {busy && ' Preparing sample history…'}
          </p>
          {settings.demoMode && (
            <div className="grid-2" style={{ marginTop: 12 }}>
              <div className="field">
                <span className="label">Simulated plant (like SW2)</span>
                <div className="seg" role="group" aria-label="Simulated plant">
                  {(['ALOE_VERA', 'POTHOS'] as PlantType[]).map((p) => (
                    <button key={p} aria-pressed={settings.demoPlant === p} onClick={() => updateSettings((s) => ({ ...s, demoPlant: p }))}>{PLANT_LABEL[p]}</button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="demoint">New reading every (seconds)</label>
                <input id="demoint" className="input" type="number" min={1} max={60} value={settings.demoIntervalSec}
                  onChange={(e) => updateSettings((s) => ({ ...s, demoIntervalSec: Math.max(1, Math.min(60, Number(e.target.value) || 3)) }))} />
              </div>
            </div>
          )}
        </div>

        {/* ---------------- Plants & alerts ---------------- */}
        <div className="card">
          <h2>Plant profiles</h2>
          <p className="small muted" style={{ margin: '4px 0 10px' }}>Nicknames, photos and recommended ranges for each plant type.</p>
          <div className="list">
            {(['ALOE_VERA', 'POTHOS'] as PlantType[]).map((p) => {
              const r = settings.profiles[p].ranges;
              return (
                <div className="list-item" key={p}>
                  <div style={{ flex: 1 }}>
                    <b>{settings.profiles[p].nickname || PLANT_LABEL[p]}</b>
                    <div className="small muted">Soil {r.soilPct.min}–{r.soilPct.max} %, humidity {r.humRhEst.min}–{r.humRhEst.max} %RH, sunlight {r.sunlightPct.min}–{r.sunlightPct.max} %</div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="row wrap" style={{ marginTop: 8 }}>
            <button className="btn btn-soft" onClick={() => go('plant')}>Edit plant details</button>
            <button className="btn btn-soft" onClick={() => go('alerts')}>Alert preferences</button>
          </div>
        </div>

        {/* ---------------- Units ---------------- */}
        <div className="card">
          <div className="row"><Ruler size={20} color="var(--forest)" /><h2>Units</h2></div>
          <p className="small muted" style={{ margin: '4px 0 10px' }}>Units match what the firmware sends. Changing them would need sensor calibration, so they are fixed.</p>
          <dl className="kv">
            <dt>Soil moisture</dt><dd>% (0–100, calibrated ADC 3500 to 1500)</dd>
            <dt>Air humidity</dt><dd>%RH, estimated (20–95)</dd>
            <dt>Light</dt><dd>raw ADC 0–4095, not lux</dd>
            <dt>Temperature</dt><dd>°C, fixed 25 (assumed)</dd>
          </dl>
        </div>

        {/* ---------------- Data ---------------- */}
        <div className="card">
          <div className="row"><Database size={20} color="var(--forest)" /><h2>Data</h2></div>
          <p className="small muted" style={{ margin: '4px 0 10px' }}>
            Stored on this phone in {storageMode === 'indexeddb' ? 'browser storage (IndexedDB)' : 'memory only, so it is lost on reload because this browser blocked storage'}.
            Device readings: {counts.device ?? '…'}. Demo readings: {counts.demo ?? '…'}.
          </p>
          <div className="field" style={{ maxWidth: 360 }}>
            <label htmlFor="ret">Keep readings for (days)</label>
            <input id="ret" className="input" type="number" min={1} max={90} value={settings.retentionDays}
              onChange={(e) => updateSettings((s) => ({ ...s, retentionDays: Math.max(1, Math.min(90, Number(e.target.value) || 30)) }))} />
          </div>
          <div className="row wrap" style={{ marginTop: 12 }}>
            <button className="btn btn-soft" onClick={() => exportAll('device')} disabled={!counts.device}><Download /> Export device CSV</button>
            <button className="btn btn-soft" onClick={() => exportAll('demo')} disabled={!counts.demo}><Download /> Export demo CSV</button>
            <button className="btn btn-danger" onClick={() => setConfirm('device')} disabled={!counts.device}><Trash2 /> Clear device history</button>
            <button className="btn btn-danger" onClick={() => setConfirm('demo')} disabled={!counts.demo}><Trash2 /> Clear demo data</button>
          </div>
          {!st.settingsSaved && <div style={{ marginTop: 10 }}><InfoNote tone="warn">This browser blocked saving settings. Changes last until the page is closed.</InfoNote></div>}
        </div>

        {/* ---------------- About ---------------- */}
        <div className="card">
          <div className="row"><Info size={20} color="var(--forest)" /><h2>About PlantCare AI</h2></div>
          <div className="stack small ink2" style={{ marginTop: 8, gap: 8 }}>
            <p>Version 1.0. A local web app with no cloud server and no account.</p>
            <p><b>Data path:</b> STM32F401 reads the sensors and runs the Decision Tree, then sends a text line over UART (PA9, 115200 baud) to the NodeMCU ESP8266 (D2). The NodeMCU validates it and POSTs JSON over Wi-Fi to the PlantCare Flask server on the laptop, and this app reads the latest reading from that server every second.</p>
            <p><b>Model:</b> Decision Tree trained on 4,500 rows (Aloe Vera and Pothos; inputs plant type, soil %, temperature, air humidity, raw LDR). It outputs 3 classes: Suitable, Moderate stress and High stress. No confidence values.</p>
            <p><b>Timestamps:</b> The ESP8266 has no clock, so each reading is timestamped with this phone’s time, adjusted by how long ago the server received it.</p>
            <p><b>Limits:</b> Temperature is assumed (25 °C), humidity is an estimate, light is uncalibrated. Alerts and history work only while the app is open. The model cannot detect diseases or pests.</p>
          </div>
        </div>
      </div>

      {confirm && (
        <Sheet title={confirm === 'device' ? 'Clear device history?' : 'Clear demo data?'} onClose={() => setConfirm(null)}>
          <p className="ink2">
            This permanently deletes {confirm === 'device' ? `all ${counts.device ?? ''} stored device readings` : `all ${counts.demo ?? ''} demo readings`} from this phone. Export a CSV first if you need them.
          </p>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setConfirm(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={async () => {
              await st.clearHistory(confirm);
              toast(confirm === 'device' ? 'Device history cleared.' : 'Demo data cleared.', 'info');
              setConfirm(null);
            }}><Trash2 /> Clear</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
