// Connection to the device data source. Configuration point: the address in Settings.
//
//  http://<laptop-IP>:5000   -> polls the PlantCare Flask server (GET /api/latest every second).
//                               This is the normal setup: NodeMCU POSTs to the server.
//  ws://<host>:<port>/       -> WebSocket (kept for the mock ESP and the older bridge sketch).
//  (empty)                   -> http://<host this page came from>:5000

import { parseMessage } from '../protocol/validate';
import type { EspStatus, Reading, WsPhase } from '../types';

/** What the server says about itself and about rejected NodeMCU posts. */
export interface ServerInfo {
  protocol: number | null;           // null = server too old to report it
  postsRejected: number;
  lastRejectReason: string;
  lastRejectAgeMs: number | null;
  bridgeVersion: number | null;
  receivedAt: number;
}

export interface DeviceHandlers {
  onServer: (s: ServerInfo) => void;
  /** ageMs: how old the reading already was when it reached the app (0 for live pushes). */
  onReading: (r: Omit<Reading, 'ts' | 'source'>, ageMs: number) => void;
  onStatus: (s: Omit<EspStatus, 'receivedAt'>) => void;
  onPhase: (p: WsPhase, detail?: string) => void;
  onInvalid: (reason: string) => void;
}

export const SERVER_PORT = 5000;

/** Turns the Settings value into a concrete address. */
export function resolveAddress(setting: string): string {
  const s = setting.trim();
  if (s) return s.replace(/\/+$/, '');
  const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
  return `http://${host}:${SERVER_PORT}`;
}

export function isValidAddress(setting: string): boolean {
  const s = setting.trim();
  if (!s) return true;
  try {
    const u = new URL(s);
    return ['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol);
  } catch {
    return false;
  }
}

const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];
const OPEN_TIMEOUT_MS = 7000;
const POLL_MS = 1000;
const POLL_RETRY_MS = 2000;
const FETCH_TIMEOUT_MS = 3000;

export class DeviceService {
  private ws: WebSocket | null = null;
  private url = '';
  private mode: 'http' | 'ws' = 'http';
  private wantConnected = false;
  private attempt = 0;
  private retryTimer: number | undefined;
  private openTimer: number | undefined;
  private pollTimer: number | undefined;
  private everOpened = false;
  private httpOpen = false;
  private lastServerSeq: number | null = null;
  private generation = 0;

  constructor(private h: DeviceHandlers) {}

  connect(setting: string) {
    this.stopAll();
    this.url = resolveAddress(setting);
    this.mode = /^wss?:/i.test(this.url) ? 'ws' : 'http';
    this.wantConnected = true;
    this.attempt = 0;
    this.everOpened = false;
    this.httpOpen = false;
    this.lastServerSeq = null;
    this.generation++;
    if (this.mode === 'ws') this.openWs();
    else {
      this.h.onPhase('connecting');
      void this.poll(this.generation);
    }
  }

  disconnect() {
    this.wantConnected = false;
    this.generation++;
    this.stopAll();
    this.h.onPhase('closed');
  }

  get address() {
    return this.url;
  }

  get isOpen() {
    return this.mode === 'ws' ? this.ws?.readyState === WebSocket.OPEN : this.httpOpen;
  }

  /** Asks for the most recent reading again. Returns false when not connected. */
  requestLatest(): boolean {
    if (!this.isOpen) return false;
    if (this.mode === 'ws') {
      this.ws!.send(JSON.stringify({ cmd: 'get_latest' }));
    } else {
      this.lastServerSeq = null; // re-deliver the current reading
      window.clearTimeout(this.pollTimer);
      void this.poll(this.generation);
    }
    return true;
  }

  // ---------------- HTTP polling (Flask server) ----------------
  private async poll(gen: number) {
    if (!this.wantConnected || gen !== this.generation) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let ok = false;
    try {
      const res = await fetch(`${this.url}/api/latest`, { cache: 'no-store', signal: ctrl.signal });
      if (gen !== this.generation) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (gen !== this.generation) return;
      ok = true;
      if (!this.httpOpen) {
        this.httpOpen = true;
        this.everOpened = true;
        this.h.onPhase('open');
      }
      this.handleLatest(data);
    } catch (e) {
      if (gen !== this.generation) return;
      const wasOpen = this.httpOpen;
      this.httpOpen = false;
      const why = e instanceof Error && e.name === 'AbortError' ? 'no answer' : 'not reachable';
      this.h.onPhase(
        this.everOpened ? 'reconnecting' : 'failed',
        wasOpen || this.everOpened
          ? `Lost contact with the server at ${this.url} (${why}). Retrying…`
          : `Could not reach the PlantCare server at ${this.url} (${why}). Is plantcare_server.py running, and is this device on the same hotspot? Retrying…`,
      );
    } finally {
      window.clearTimeout(t);
    }
    if (this.wantConnected && gen === this.generation)
      this.pollTimer = window.setTimeout(() => void this.poll(gen), ok ? POLL_MS : POLL_RETRY_MS);
  }

  private handleLatest(data: unknown) {
    if (!data || typeof data !== 'object') {
      this.h.onInvalid('server answer is not an object');
      return;
    }
    const d = data as { reading?: unknown; status?: unknown; server_seq?: unknown; reading_age_ms?: unknown; protocol?: unknown; server?: unknown };
    const sv = (d.server && typeof d.server === 'object' ? d.server : {}) as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    this.h.onServer({
      protocol: num(d.protocol),
      postsRejected: num(sv.posts_rejected) ?? 0,
      lastRejectReason: typeof sv.last_reject_reason === 'string' ? sv.last_reject_reason : '',
      lastRejectAgeMs: num(sv.last_reject_age_ms),
      bridgeVersion: num(sv.bridge_version),
      receivedAt: Date.now(),
    });
    // A protocol mismatch (server and page from different versions) is shown as a banner (ui.tsx).
    if (d.status) {
      const m = parseMessage(JSON.stringify(d.status));
      if (m.kind === 'status') this.h.onStatus(m.status);
      else this.h.onInvalid(`status: ${m.kind === 'invalid' ? m.reason : 'unexpected'}`);
    }
    const seq = typeof d.server_seq === 'number' ? d.server_seq : null;
    if (d.reading && seq !== null && seq !== this.lastServerSeq) {
      this.lastServerSeq = seq;
      const m = parseMessage(JSON.stringify(d.reading));
      if (m.kind === 'reading') {
        const age = typeof d.reading_age_ms === 'number' && d.reading_age_ms > 0 ? d.reading_age_ms : 0;
        this.h.onReading(m.reading, age);
      } else this.h.onInvalid(m.kind === 'invalid' ? m.reason : 'unexpected');
    }
  }

  // ---------------- WebSocket (mock ESP / older bridge) ----------------
  private openWs() {
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.h.onPhase('failed', `Invalid address: ${this.url}`);
      this.wantConnected = false;
      return;
    }
    this.ws = ws;
    this.h.onPhase(this.attempt === 0 ? 'connecting' : 'reconnecting');

    this.openTimer = window.setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) ws.close();
    }, OPEN_TIMEOUT_MS);

    ws.onopen = () => {
      window.clearTimeout(this.openTimer);
      this.attempt = 0;
      this.everOpened = true;
      this.h.onPhase('open');
    };
    ws.onmessage = (ev) => {
      const m = parseMessage(ev.data);
      if (m.kind === 'reading') this.h.onReading(m.reading, 0);
      else if (m.kind === 'status') this.h.onStatus(m.status);
      else this.h.onInvalid(m.reason);
    };
    ws.onclose = () => {
      window.clearTimeout(this.openTimer);
      if (this.ws !== ws) return;
      this.ws = null;
      if (!this.wantConnected) return;
      const delay = BACKOFF_MS[Math.min(this.attempt, BACKOFF_MS.length - 1)];
      this.attempt++;
      this.h.onPhase(
        this.everOpened ? 'reconnecting' : 'failed',
        this.everOpened
          ? `Connection lost. Retrying in ${Math.round(delay / 1000)} s.`
          : `Could not reach ${this.url}. Retrying in ${Math.round(delay / 1000)} s.`,
      );
      this.retryTimer = window.setTimeout(() => this.openWs(), delay);
    };
    ws.onerror = () => {
      /* onclose follows and handles retry */
    };
  }

  private stopAll() {
    window.clearTimeout(this.retryTimer);
    window.clearTimeout(this.openTimer);
    window.clearTimeout(this.pollTimer);
    this.httpOpen = false;
    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.onclose = null;
      ws.close();
    }
  }
}
