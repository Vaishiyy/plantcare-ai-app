import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { getReadings } from '../storage/db';
import { classSegments, type ClassSegment } from '../history/aggregate';
import { CLASS_INFO, PLANT_LABEL, compareToRanges } from '../ml/interpret';
import { ClassChip, DataStateBanner, InfoNote, LinkBadge, fmtDateTime, fmtTime } from '../components/ui';
import type { MlClass } from '../types';

const ORDER: MlClass[] = [2, 1, 0];
const SWATCH: Record<MlClass, string> = { 0: 'var(--bad)', 1: 'var(--warn)', 2: 'var(--good)' };

export function Analysis() {
  const { latest, link, settings, source, historyVersion } = useStore();
  const isCurrent = link === 'live' || link === 'demo';
  const [segments, setSegments] = useState<ClassSegment[] | null>(null);

  useEffect(() => {
    let cancel = false;
    getReadings(source, Date.now() - 7 * 86400000, Date.now()).then((rows) => {
      if (!cancel) setSegments(classSegments(rows).reverse());
    });
    return () => { cancel = true; };
    // Reload when a new class arrives, not on every reading.
  }, [source, historyVersion, latest?.mlClass, latest?.plant]); // eslint-disable-line react-hooks/exhaustive-deps

  const comps = latest ? compareToRanges(latest, settings.profiles[latest.plant].ranges) : [];

  return (
    <div className="screen-enter">
      <header className="screen-head">
        <div>
          <h1>AI health analysis</h1>
          <p>On-device Decision Tree on the STM32, with 3 classes</p>
        </div>
        <LinkBadge link={link} />
      </header>

      <div className="stack">
        <DataStateBanner />

        <div className="grid-3">
          {ORDER.map((c) => {
            const info = CLASS_INFO[c];
            const cur = latest?.mlClass === c;
            return (
              <div key={c} className={`class-card ${info.tone}${cur ? ' is-current' : ''}`} aria-current={cur ? 'true' : undefined}>
                <div className="row between">
                  <div className="row" style={{ gap: 8 }}>
                    <span className="class-swatch" style={{ background: SWATCH[c] }} />
                    <h3>{info.label}</h3>
                  </div>
                  {cur && <span className="chip chip-plain">{isCurrent ? 'Current' : 'Last known'}</span>}
                </div>
                <p className="small ink2">{info.meaning}</p>
                <p className="small"><b>Suggested:</b> {info.action}</p>
              </div>
            );
          })}
        </div>

        <div className="split">
          <div className="card">
            <h3>Model inputs for the latest prediction</h3>
            <p className="small muted" style={{ margin: '4px 0 10px' }}>
              {latest ? `Reading received ${fmtTime(latest.ts)}. Measured values and fixed values are marked.` : 'No prediction received yet.'}
            </p>
            {latest && (
              <dl className="kv">
                <dt>1. Plant type (from SW2)</dt><dd>{PLANT_LABEL[latest.plant]}</dd>
                <dt>2. Soil moisture, measured</dt><dd>{latest.soilPct} %</dd>
                <dt>3. Temperature, fixed</dt><dd>{latest.tempAssumedC} °C, assumed</dd>
                <dt>4. Air humidity, estimated</dt><dd>{latest.humRhEst} %RH</dd>
                <dt>5. Is daytime</dt><dd>{latest.fwDay === 1 ? 'Yes' : latest.fwDay === 0 ? 'No' : 'Unknown, sent as No'}</dd>
                <dt>6. Low-light minutes</dt><dd>{latest.lowLightMin}</dd>
                <dt>7. Excess-light minutes</dt><dd>{latest.highLightMin}</dd>
                <dt>Model output</dt><dd>{latest.mlClass}, {CLASS_INFO[latest.mlClass].label}{latest.mlProvisional ? ' (provisional)' : ''}</dd>
              </dl>
            )}
            <p className="small muted" style={{ marginTop: 10 }}>
              No confidence value is shown because the Decision Tree returns a class only, not a probability.
              The STM32 only learns the time of day from a DAY= line on its RX pin, which is not wired, so inputs 5–7 stay at No / 0.
              Sunlight ({latest ? `${latest.sunlightPct} %` : '—'}) is not a direct model input; it only feeds the light timers.
            </p>
          </div>

          <div className="card">
            <h3>Readings compared with your ranges</h3>
            <p className="small muted" style={{ margin: '4px 0 10px' }}>App interpretation. The model does not report which inputs drove its decision.</p>
            {latest ? (
              <div className="list">
                {comps.map((c) => (
                  <div className="list-item" key={c.key}>
                    <span className={`chip ${c.verdict === 'ok' ? 'chip-good' : 'chip-warn'}`} style={{ minWidth: 76, justifyContent: 'center' }}>
                      {c.verdict === 'ok' ? 'In range' : c.verdict === 'low' ? 'Low' : 'High'}
                    </span>
                    <span className="small">{c.sentence}</span>
                  </div>
                ))}
              </div>
            ) : <p className="small ink2">Waiting for a reading.</p>}
          </div>
        </div>

        <InfoNote>
          The model rates growing conditions for Aloe Vera and Pothos from soil moisture, humidity, time of day, light duration and a fixed temperature.
          It cannot detect diseases, pests or root problems, so treat its output as a prompt to check on the plant.
        </InfoNote>

        <div className="card">
          <div className="row between wrap">
            <h3>Prediction history, last 7 days</h3>
            {link === 'demo' && <span className="chip chip-demo">Sample data</span>}
          </div>
          <p className="small muted" style={{ margin: '4px 0 6px' }}>Each row is a stretch of consecutive readings with the same class. Newest first.</p>
          {segments === null ? (
            <p className="small muted">Loading…</p>
          ) : segments.length === 0 ? (
            <p className="small ink2">No predictions stored yet. History is recorded only while this app is open and receiving data.</p>
          ) : (
            <div className="list">
              {segments.slice(0, 25).map((s, i) => (
                <div className="list-item" key={i}>
                  <ClassChip cls={s.cls} />
                  <div className="small">
                    <div><b>{fmtDateTime(s.from)}</b>{s.to !== s.from ? ` to ${fmtTime(s.to, false)}` : ''}</div>
                    <div className="muted">{PLANT_LABEL[s.plant]}, {s.count} reading{s.count === 1 ? '' : 's'}</div>
                  </div>
                </div>
              ))}
              {segments.length > 25 && <p className="small muted" style={{ paddingTop: 8 }}>Showing the 25 most recent of {segments.length}. See History for more.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
