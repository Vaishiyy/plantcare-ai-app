// App-wide state: settings, connection, latest/recent readings, alerts, toasts.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AlertItem, DataSource, EspStatus, LinkState, PlantType, Reading, Settings, WsPhase } from './types';
import { loadSettings, saveSettings } from './storage/settings';
import { addReading, addReadings, clearReadings, countReadings, getReadings, pruneReadings } from './storage/db';
import { DeviceService, type ServerInfo } from './services/deviceService';
import { DemoSimulator, buildSampleHistory } from './services/demoService';
import { AlertEngine, loadAlerts, saveAlerts } from './alerts/engine';

const RECENT_MAX = 180;
const CONNECT_GRACE_MS = 4000;
const LINK_DEBOUNCE_MS = 4000;

export interface Toast { id: number; text: string; tone: 'info' | 'good' | 'warn' | 'bad' }

interface Store {
  settings: Settings;
  updateSettings: (fn: (s: Settings) => Settings) => boolean;
  source: DataSource;
  latest: Reading | null;
  recent: Reading[];
  link: LinkState;
  wsPhase: WsPhase;
  wsDetail: string;
  espStatus: EspStatus | null;
  serverInfo: ServerInfo | null;
  lastReadingAt: number | null;
  stats: { messages: number; invalid: number; lastInvalidReason: string };
  now: number;
  alerts: AlertItem[];
  unread: number;
  markAlertsRead: () => void;
  clearAlerts: () => void;
  toasts: Toast[];
  toast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  connect: (url?: string) => void;
  disconnect: () => void;
  refresh: () => void;
  setDemoMode: (on: boolean) => Promise<void>;
  clearHistory: (source: DataSource) => Promise<void>;
  historyVersion: number;
  firstSeen: (plant: PlantType) => number | null;
  settingsSaved: boolean;
}

const Ctx = createContext<Store | null>(null);

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside provider');
  return s;
}

const FIRST_SEEN_KEY = 'plantcare.firstSeen.v1';
function loadFirstSeen(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(FIRST_SEEN_KEY) || '{}'); } catch { return {}; }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [settingsSaved, setSettingsSaved] = useState(true);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const source: DataSource = settings.demoMode ? 'demo' : 'device';
  const sourceRef = useRef(source);
  sourceRef.current = source;

  const [latest, setLatest] = useState<Reading | null>(null);
  const [recent, setRecent] = useState<Reading[]>([]);
  const [wsPhase, setWsPhase] = useState<WsPhase>('idle');
  const [wsDetail, setWsDetail] = useState('');
  const [espStatus, setEspStatus] = useState<EspStatus | null>(null);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [lastReadingAt, setLastReadingAt] = useState<number | null>(null);
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [stats, setStats] = useState({ messages: 0, invalid: 0, lastInvalidReason: '' });
  const [now, setNow] = useState(Date.now());
  const [alerts, setAlerts] = useState<AlertItem[]>(loadAlerts);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);
  const firstSeenRef = useRef<Record<string, number>>(loadFirstSeen());
  const engine = useRef(new AlertEngine());

  // ---------- helpers ----------
  const toast = useCallback((text: string, tone: Toast['tone'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const pushAlerts = useCallback((items: AlertItem[]) => {
    if (!items.length) return;
    setAlerts((a) => {
      const next = [...items.slice().reverse(), ...a].slice(0, 300);
      saveAlerts(next);
      return next;
    });
    for (const it of items) toast(`${it.title}. ${it.detail}`, it.category === 'linkRestored' ? 'good' : 'warn');
  }, [toast]);

  /** Applies a change, persists it, and returns whether the browser accepted the save. */
  const updateSettings = useCallback((fn: (s: Settings) => Settings) => {
    const n = fn(settingsRef.current);
    settingsRef.current = n;
    const ok = saveSettings(n);
    setSettingsSaved(ok);
    setSettings(n);
    return ok;
  }, []);

  /** Accepts a reading from the device or the demo generator. */
  const ingest = useCallback((r: Reading) => {
    if (r.source !== sourceRef.current) return; // a late demo tick after switching mode
    setLatest(r);
    setLastReadingAt(r.ts);
    setRecent((x) => [...x, r].slice(-RECENT_MAX));
    const fsKey = `${r.source}:${r.plant}`;
    if (!firstSeenRef.current[fsKey]) {
      firstSeenRef.current[fsKey] = r.ts;
      try { localStorage.setItem(FIRST_SEEN_KEY, JSON.stringify(firstSeenRef.current)); } catch { /* ignore */ }
    }
    void addReading(r);
    pushAlerts(engine.current.evaluate(r, settingsRef.current));
  }, [pushAlerts]);

  // ---------- device service ----------
  const device = useRef<DeviceService | null>(null);
  if (!device.current) {
    device.current = new DeviceService({
      onServer: (s) => setServerInfo(s),
      onReading: (p, ageMs) => {
        setStats((s) => ({ ...s, messages: s.messages + 1 }));
        ingest({ ...p, ts: Date.now() - ageMs, source: 'device' });
      },
      onStatus: (st) => {
        setStats((s) => ({ ...s, messages: s.messages + 1 }));
        setEspStatus({ ...st, receivedAt: Date.now() });
      },
      onPhase: (p, detail) => {
        setWsPhase(p);
        setWsDetail(detail ?? '');
        if (p === 'open') setOpenedAt(Date.now());
      },
      onInvalid: (reason) => setStats((s) => ({ ...s, invalid: s.invalid + 1, lastInvalidReason: reason })),
    });
  }

  const connect = useCallback((url?: string) => {
    if (settingsRef.current.demoMode) {
      toast('Demo Mode is on. Turn it off in Settings to connect to the device.', 'warn');
      return;
    }
    setEspStatus(null);
    device.current!.connect(url ?? settingsRef.current.wsUrl);
  }, [toast]);

  const disconnect = useCallback(() => device.current!.disconnect(), []);

  // ---------- demo generator ----------
  const sim = useRef<DemoSimulator | null>(null);
  const demoTick = useCallback(() => {
    const s = settingsRef.current;
    if (!sim.current || sim.current.plant !== s.demoPlant) sim.current = new DemoSimulator(s.demoPlant);
    const r = sim.current.next(Date.now(), s.demoIntervalSec / 60);
    ingest(r as Reading);
  }, [ingest]);

  useEffect(() => {
    if (!settings.demoMode) return;
    demoTick();
    const id = window.setInterval(demoTick, Math.max(1, settings.demoIntervalSec) * 1000);
    return () => window.clearInterval(id);
  }, [settings.demoMode, settings.demoIntervalSec, demoTick]);

  const refresh = useCallback(() => {
    if (settingsRef.current.demoMode) {
      demoTick();
      toast('Generated a new simulated reading.', 'info');
      return;
    }
    if (device.current!.requestLatest())
      toast('Fetched the latest reading again. New sensor reads happen on the STM32’s own schedule.', 'info');
    else toast('Not connected to the device, so there is nothing to refresh. Connect first.', 'warn');
  }, [demoTick, toast]);

  const setDemoMode = useCallback(async (on: boolean) => {
    if (on) {
      device.current!.disconnect();
      setWsPhase('idle');
      if ((await countReadings('demo')) === 0) {
        await addReadings(buildSampleHistory(settingsRef.current.demoPlant, 30));
      }
    }
    engine.current.reset();
    setLatest(null);
    setRecent([]);
    setLastReadingAt(null);
    updateSettings((s) => ({ ...s, demoMode: on }));
    setHistoryVersion((v) => v + 1);
    toast(on ? 'Demo Mode on. All data shown is simulated.' : 'Demo Mode off. Showing device data only.', 'info');
  }, [toast, updateSettings]);

  const clearHistory = useCallback(async (src: DataSource) => {
    await clearReadings(src);
    if (src === sourceRef.current) { setRecent([]); }
    setHistoryVersion((v) => v + 1);
  }, []);

  // ---------- startup: restore last readings, prune, auto-connect ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const src = sourceRef.current;
      const rows = await getReadings(src, Date.now() - 6 * 3600000, Date.now());
      if (cancelled || !rows.length) return;
      setRecent(rows.slice(-RECENT_MAX));
      setLatest(rows[rows.length - 1]);
      setLastReadingAt(rows[rows.length - 1].ts);
    })();
    return () => { cancelled = true; };
  }, [source]);

  useEffect(() => {
    const prune = () => {
      const before = Date.now() - settingsRef.current.retentionDays * 86400000;
      void pruneReadings('device', before);
      void pruneReadings('demo', before);
    };
    prune();
    const id = window.setInterval(prune, 3600000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!settingsRef.current.demoMode && settingsRef.current.autoConnect) connect();
    return () => device.current?.disconnect();
  }, [connect]);

  // ---------- clock + derived link state ----------
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const link: LinkState = useMemo(() => {
    if (settings.demoMode) return 'demo';
    if (wsPhase === 'connecting' || wsPhase === 'reconnecting') return 'connecting';
    if (wsPhase !== 'open') return 'offline';
    const staleMs = settings.staleTimeoutSec * 1000;
    // Grace period after (re)connecting so the first reading has time to arrive.
    if (openedAt && now - openedAt < CONNECT_GRACE_MS && (!lastReadingAt || lastReadingAt < openedAt)) return 'live';
    // A server/ESP 'stale' status counts only if no reading has arrived since that status.
    const espSaysStale = espStatus && now - espStatus.receivedAt < staleMs && espStatus.stm32Link === 'stale'
      && (!lastReadingAt || lastReadingAt < espStatus.receivedAt);
    const since = Math.max(lastReadingAt ?? 0, openedAt ?? 0);
    const noFreshData = !lastReadingAt || now - since > staleMs;
    return espSaysStale || noFreshData ? 'stale' : 'live';
  }, [settings.demoMode, settings.staleTimeoutSec, wsPhase, espStatus, lastReadingAt, openedAt, now]);

  // Link alerts, debounced: the link must stay down (or up) for LINK_DEBOUNCE_MS before
  // "lost" (or "restored") is raised, so a flapping connection does not spam alerts.
  const prevLink = useRef<LinkState>(link);
  const linkUp = useRef<boolean | null>(null);
  const upSince = useRef<number | null>(null);
  const downSince = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevLink.current;
    prevLink.current = link;
    const s = settingsRef.current;
    if (link === 'demo') {
      linkUp.current = null; upSince.current = null; downSince.current = null;
      return;
    }
    const out: AlertItem[] = [];
    const connected = link === 'live' || link === 'stale';
    const t = Date.now();
    if (connected) {
      downSince.current = null;
      upSince.current ??= t;
      if (linkUp.current !== true && t - upSince.current >= LINK_DEBOUNCE_MS) {
        if (linkUp.current === false) {
          const a = engine.current.link('linkRestored', true, s, 'Connected to the PlantCare server again.');
          if (a) out.push(a);
        }
        linkUp.current = true;
      }
    } else {
      upSince.current = null;
      downSince.current ??= t;
      if (linkUp.current === true && t - downSince.current >= LINK_DEBOUNCE_MS) {
        const a = engine.current.link('linkLost', true, s, 'Lost contact with the PlantCare server. Last readings are shown as offline.');
        if (a) out.push(a);
        linkUp.current = false;
      }
    }
    if (link === 'stale' && prev !== 'stale') {
      const a = engine.current.link('stm32Stale', true, s, `No valid reading for over ${s.staleTimeoutSec} s. Check the NodeMCU Serial Monitor: is it posting, and are bytes arriving on D2 from STM32 PA9?`);
      if (a) out.push(a);
    }
    if (link !== 'stale') engine.current.link('stm32Stale', false, s, '');
    pushAlerts(out);
  }, [link, now, pushAlerts]);

  const markAlertsRead = useCallback(() => {
    setAlerts((a) => { const n = a.map((x) => ({ ...x, read: true })); saveAlerts(n); return n; });
  }, []);
  const clearAlerts = useCallback(() => { setAlerts([]); saveAlerts([]); }, []);

  const firstSeen = useCallback((plant: PlantType) => firstSeenRef.current[`${sourceRef.current}:${plant}`] ?? null, []);

  const value: Store = {
    settings, updateSettings, source, latest, recent, link, wsPhase, wsDetail, espStatus, serverInfo, lastReadingAt,
    stats, now, alerts, unread: alerts.filter((a) => !a.read).length, markAlertsRead, clearAlerts,
    toasts, toast, dismissToast, connect, disconnect, refresh, setDemoMode, clearHistory, historyVersion,
    firstSeen, settingsSaved,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
