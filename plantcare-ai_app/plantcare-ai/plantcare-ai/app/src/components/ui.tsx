// Small shared UI pieces.

import { useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, CloudOff, FlaskConical, Info, Loader2, Wifi, X } from 'lucide-react';
import type { LinkState, MlClass } from '../types';
import { CLASS_INFO } from '../ml/interpret';
import { useStore } from '../store';
import { PROTOCOL_VERSION } from '../protocol/validate';

export function fmtTime(ts: number | null | undefined, withSeconds = true) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', ...(withSeconds ? { second: '2-digit' } : {}) });
}
export function fmtDateTime(ts: number | null | undefined) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
export function fmtAgo(ts: number | null, now: number) {
  if (!ts) return 'never';
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}
export function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${m} min` : m ? `${m} min ${s % 60} s` : `${s} s`;
}

const LINK_UI: Record<LinkState, { label: string; cls: string; icon: ReactNode }> = {
  live: { label: 'Live', cls: 'chip-good', icon: <span className="pulse" /> },
  stale: { label: 'Stale', cls: 'chip-warn', icon: <AlertTriangle /> },
  offline: { label: 'Offline', cls: 'chip-off', icon: <CloudOff /> },
  connecting: { label: 'Connecting', cls: 'chip-off', icon: <Loader2 className="spin" /> },
  demo: { label: 'Demo', cls: 'chip-demo', icon: <FlaskConical /> },
};

export function LinkBadge({ link }: { link: LinkState }) {
  const u = LINK_UI[link];
  return (
    <span className={`chip ${u.cls}`} role="status" aria-label={`Device link: ${u.label}`}>
      {u.icon}
      {u.label}
    </span>
  );
}

export function ClassChip({ cls, dim = false }: { cls: MlClass; dim?: boolean }) {
  const info = CLASS_INFO[cls];
  return <span className={`chip ${dim ? 'chip-off' : `chip-${info.tone}`}`}>{info.label}</span>;
}

/** Shows the right banner for the current link state: demo, offline, stale. Nothing when live. */
export function DataStateBanner() {
  const { link, lastReadingAt, latest, wsDetail, settings, now, serverInfo } = useStore();
  const versionBanner = link !== 'demo' && link !== 'offline' && serverInfo && serverInfo.protocol !== PROTOCOL_VERSION;
  const oldSketch = link !== 'demo' && serverInfo && serverInfo.lastRejectAgeMs !== null
    && serverInfo.lastRejectAgeMs < 15000 && serverInfo.lastRejectReason.startsWith('old NodeMCU sketch')
    && (!lastReadingAt || now - lastReadingAt > 5000);
  if (versionBanner)
    return (
      <div className="banner banner-bad">
        <AlertTriangle />
        <div><b>App and server versions don’t match.</b> This page expects data format {PROTOCOL_VERSION}, but the server
          {serverInfo!.protocol === null ? ' is an older version' : ` sends format ${serverInfo!.protocol}`}. Restart the new
          plantcare_server.py, then reload this page.</div>
      </div>
    );
  if (oldSketch)
    return (
      <div className="banner banner-bad">
        <AlertTriangle />
        <div><b>The NodeMCU is running an old sketch.</b> The server is rejecting its readings, so nothing new can appear here.
          Upload the new prototype.ino to the NodeMCU (unplug the PA9 → RX wire while uploading).</div>
      </div>
    );
  if (link === 'demo')
    return (
      <div className="banner banner-demo">
        <FlaskConical />
        <div><b>Demo data.</b> Simulated sensor values, classified by the real Decision Tree from your firmware (temperature fixed at 25 °C). No hardware is connected.</div>
      </div>
    );
  if (link === 'stale')
    return (
      <div className="banner banner-warn">
        <AlertTriangle />
        <div><b>No new sensor data.</b> The PlantCare server is reachable, but no new reading from the NodeMCU has arrived for over {settings.staleTimeoutSec} s{lastReadingAt ? ` (last at ${fmtTime(lastReadingAt)})` : ''}. Values below are not live.</div>
      </div>
    );
  if (link === 'offline' || link === 'connecting')
    return (
      <div className="banner banner-off">
        {link === 'connecting' ? <Loader2 /> : <CloudOff />}
        <div>
          <b>{link === 'connecting' ? 'Connecting to the device…' : 'Offline.'}</b>{' '}
          {latest ? `Showing the last reading, received ${fmtTime(lastReadingAt)} (${fmtAgo(lastReadingAt, now)}). It is not live.` : 'No readings received yet.'}
          {wsDetail && <div className="small" style={{ marginTop: 4 }}>{wsDetail}</div>}
        </div>
      </div>
    );
  return null;
}

export function InfoNote({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' | 'bad' }) {
  return (
    <div className={`banner banner-${tone}`}>
      {tone === 'info' ? <Info /> : <AlertTriangle />}
      <div>{children}</div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  return (
    <span className="switch">
      <input id={id} type="checkbox" role="switch" aria-label={label} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden="true" />
    </span>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.querySelector<HTMLElement>('input, button, select')?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  const color = { info: 'var(--sage)', good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)' };
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <span className="bar" style={{ background: color[t.tone] }} />
          <span>{t.text}</span>
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss"><X size={16} /></button>
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon = <Wifi />, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      {icon}
      <h3>{title}</h3>
      {children}
    </div>
  );
}
