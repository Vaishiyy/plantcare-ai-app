import { useState } from 'react';
import { Camera, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import type { PlantType } from '../types';
import { PlantArt } from '../components/PlantArt';
import { RangeFields, useRangeDraft } from '../components/RangeEditor';
import { ClassChip, DataStateBanner, InfoNote, LinkBadge, Sheet, fmtDateTime, fmtTime } from '../components/ui';
import { CLASS_INFO, FW_WARNING_TEXT, PLANT_LABEL, PLANT_LATIN, SENSOR_META, compareToRanges } from '../ml/interpret';
import { DATASET_DEFAULT_RANGES } from '../storage/settings';
import { healthScore } from '../ml/healthScore';

async function resizePhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Could not read that image.'));
      i.src = url;
    });
    const scale = Math.min(1, 360 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function Plant() {
  const { latest, settings, updateSettings, link, firstSeen, toast } = useStore();
  const [selected, setSelected] = useState<PlantType | null>(null);
  const plant: PlantType = selected ?? latest?.plant ?? 'POTHOS';
  const isReported = latest?.plant === plant;
  const profile = settings.profiles[plant];
  const [editing, setEditing] = useState(false);
  const isCurrent = link === 'live' || link === 'demo';
  const reading = isReported ? latest : null;
  const comps = reading ? compareToRanges(reading, profile.ranges) : [];
  const hs = reading ? healthScore(reading, profile.ranges, reading.laptopIsDay) : null;
  const seen = firstSeen(plant);

  return (
    <div className="screen-enter">
      <header className="screen-head">
        <div>
          <h1>{profile.nickname || PLANT_LABEL[plant]}</h1>
          <p><i>{PLANT_LATIN[plant]}</i>{profile.nickname ? `, ${PLANT_LABEL[plant]}` : ''}</p>
        </div>
        <LinkBadge link={link} />
      </header>

      <div className="stack">
        <div className="row wrap between">
          <div className="seg" role="group" aria-label="Plant profile">
            {(['ALOE_VERA', 'POTHOS'] as PlantType[]).map((p) => (
              <button key={p} aria-pressed={plant === p} onClick={() => setSelected(p)}>{PLANT_LABEL[p]}</button>
            ))}
          </div>
          <span className="small muted">
            {latest ? `Device reports: ${PLANT_LABEL[latest.plant]} (switch SW2 on the board to change)` : 'No plant reported yet'}
          </span>
        </div>

        <DataStateBanner />

        <div className="split">
          <div className="card">
            <div className="row" style={{ alignItems: 'center', gap: 16 }}>
              {profile.photo ? (
                <img src={profile.photo} alt={`Photo of ${profile.nickname || PLANT_LABEL[plant]}`}
                  style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 20 }} />
              ) : (
                <div style={{ background: 'var(--forest)', borderRadius: 24, padding: 6 }}>
                  <PlantArt plant={plant} cls={reading?.mlClass ?? null} live={isCurrent && !!reading} size={112} />
                </div>
              )}
              <div className="stack" style={{ gap: 8 }}>
                <div>
                  <div className="small muted">Current health</div>
                  {reading ? <ClassChip cls={reading.mlClass} dim={!isCurrent} /> : <span className="chip chip-off">{isReported ? 'No data' : 'Not the active plant'}</span>}
                </div>
                {hs && (
                  <div>
                    <div className="small muted">Health score</div>
                    <div className="small"><b>{hs.score}/100</b> · {hs.label}</div>
                  </div>
                )}
                <div>
                  <div className="small muted">First seen{link === 'demo' ? ' (demo)' : ''}</div>
                  <div className="small"><b>{seen ? fmtDateTime(seen) : 'Not yet'}</b></div>
                </div>
              </div>
            </div>
            <button className="btn btn-soft btn-block" style={{ marginTop: 16 }} onClick={() => setEditing(true)}>
              <Pencil /> Edit Plant Details
            </button>
          </div>

          <div className="card">
            <h3>Latest measured values</h3>
            <p className="small muted" style={{ marginBottom: 10 }}>
              {reading ? `Received ${fmtTime(reading.ts)}${isCurrent ? '' : ' (not live)'}` : `No readings for ${PLANT_LABEL[plant]} yet`}
            </p>
            {reading ? (
              <dl className="kv">
                <dt>Soil moisture</dt><dd>{reading.soilPct} %</dd>
                <dt>Air humidity (estimated)</dt><dd>{reading.humRhEst} %RH</dd>
                <dt>Sunlight</dt><dd>{reading.sunlightPct} % (LDR raw {reading.ldrAdc})</dd>
                <dt>Temperature</dt><dd>{reading.tempAssumedC} °C, assumed</dd>
                <dt>Device warnings</dt><dd>{reading.warnings.length ? reading.warnings.map((w) => FW_WARNING_TEXT[w]).join(', ') : 'None'}</dd>
              </dl>
            ) : <p className="ink2 small">Readings appear when the device reports this plant.</p>}
          </div>
        </div>

        <div className="card">
          <div className="row between wrap">
            <h3>Recommended ranges</h3>
            <span className="chip chip-plain">Configurable</span>
          </div>
          <p className="small muted" style={{ margin: '4px 0 10px' }}>
            Default ranges are the limits the STM32 firmware uses for its OLED warnings (main.c calls them prototype ranges), so adjust them for your plant.
            The app uses these for the health meter, status labels and alerts. The model on the STM32 does not use them.
          </p>
          <dl className="kv">
            {(['soilPct', 'humRhEst', 'sunlightPct'] as const).map((k) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt>{SENSOR_META[k].label}</dt>
                <dd>{profile.ranges[k].min}–{profile.ranges[k].max} {SENSOR_META[k].unit}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="card">
          <h3>Why this status?</h3>
          <div className="banner banner-info" style={{ margin: '10px 0' }}>
            <span aria-hidden="true">ⓘ</span>
            <div><b>App interpretation.</b> The model returns a class only, not its reasons. These lines compare each reading with the ranges above.</div>
          </div>
          {reading ? (
            <>
              <p style={{ marginBottom: 8 }}><b>Model output:</b> {CLASS_INFO[reading.mlClass].label}. {CLASS_INFO[reading.mlClass].meaning}</p>
              <ul style={{ margin: 0, paddingLeft: 20 }} className="ink2">
                {comps.map((c) => <li key={c.key} style={{ marginBottom: 4 }}>{c.sentence}</li>)}
                <li>Temperature is not measured, so the model always received 25 °C.</li>
                <li>The STM32 does not know the time of day (one-way wire), so the model always received “not daytime” and 0 minutes of low or excess light.</li>
              </ul>
              {comps.every((c) => c.verdict === 'ok') && reading.mlClass !== 2 && (
                <p className="small muted" style={{ marginTop: 8 }}>
                  All readings are inside your ranges, but the model still predicts stress. The model was trained on its own data and does not use these ranges, so the two can disagree.
                </p>
              )}
            </>
          ) : <p className="ink2 small">Nothing to explain yet.</p>}
        </div>

        <InfoNote>The model rates growing conditions only. It cannot detect diseases, pests or root problems.</InfoNote>
      </div>

      {editing && (
        <EditPlant plant={plant} onClose={() => setEditing(false)} onSaved={(ok) => {
          setEditing(false);
          toast(ok ? 'Plant details saved.' : 'Saved for this session, but the browser blocked permanent storage.', ok ? 'good' : 'warn');
        }} updateSettings={updateSettings} profile={profile} />
      )}
    </div>
  );
}

function EditPlant({ plant, profile, onClose, onSaved, updateSettings }: {
  plant: PlantType; profile: ReturnType<typeof useStore>['settings']['profiles'][PlantType];
  onClose: () => void; onSaved: (ok: boolean) => void; updateSettings: ReturnType<typeof useStore>['updateSettings'];
}) {
  const [nickname, setNickname] = useState(profile.nickname);
  const [photo, setPhoto] = useState(profile.photo);
  const [photoErr, setPhotoErr] = useState('');
  const d = useRangeDraft(profile.ranges);

  const save = () => {
    if (!d.valid) return;
    const ok = updateSettings((s) => ({
      ...s,
      profiles: { ...s.profiles, [plant]: { nickname: nickname.trim().slice(0, 40), photo, ranges: d.value() } },
    }));
    onSaved(ok);
  };

  return (
    <Sheet title={`Edit ${PLANT_LABEL[plant]}`} onClose={onClose}>
      <div className="stack">
        <div className="field">
          <label htmlFor="nick">Nickname (optional)</label>
          <input id="nick" className="input" value={nickname} maxLength={40} placeholder={PLANT_LABEL[plant]}
            onChange={(e) => setNickname(e.target.value)} />
        </div>
        <div className="field">
          <span className="label">Photo (optional, stored only on this phone)</span>
          <div className="row wrap">
            {photo && <img src={photo} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12 }} />}
            <label className="btn btn-soft" style={{ cursor: 'pointer' }}>
              <Camera /> {photo ? 'Change photo' : 'Add photo'}
              <input type="file" accept="image/*" className="visually-hidden" onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try { setPhoto(await resizePhoto(f)); setPhotoErr(''); } catch (err) { setPhotoErr((err as Error).message); }
              }} />
            </label>
            {photo && <button className="btn btn-ghost" onClick={() => setPhoto(null)}><Trash2 /> Remove</button>}
          </div>
          {photoErr && <span className="hint" style={{ color: '#8f2f1f' }}>{photoErr}</span>}
        </div>
        <div className="row between">
          <h3>Ranges</h3>
          <button className="btn btn-ghost" onClick={() => d.reset(structuredClone(DATASET_DEFAULT_RANGES[plant]) as never)}>
            <RotateCcw /> Firmware defaults
          </button>
        </div>
        <RangeFields d={d} />
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!d.valid}>Save changes</button>
        </div>
      </div>
    </Sheet>
  );
}
