// Core data models shared across the app.

export type PlantType = 'ALOE_VERA' | 'POTHOS';
export type MlClass = 0 | 1 | 2; // 0 = High Stress, 1 = Moderate Stress, 2 = Suitable
export type DataSource = 'device' | 'demo';

/** Warning texts the STM32 firmware (main.c V3) can send in WARN1 / WARN2. */
export const FW_WARNINGS = [
  'NEEDS WATER', 'SOIL TOO WET', 'NEEDS MORE LIGHT', 'TOO MUCH LIGHT', 'HUMIDITY LOW', 'HUMIDITY HIGH',
] as const;
export type FwWarning = (typeof FW_WARNINGS)[number];

/** One validated reading. `ts` is the phone's receive time (ms since epoch). */
export interface Reading {
  id?: number;
  ts: number;
  source: DataSource;
  seq: number;
  espUptimeMs: number | null; // null for demo readings
  plant: PlantType;
  mlClass: MlClass;
  mlProvisional: 0 | 1;
  /** DAY as the STM32 reports it: -1 unknown (always, with the one-way wire), 0 night, 1 day. */
  fwDay: -1 | 0 | 1;
  /** Day/night from the laptop clock when the server received the reading; null if unknown. */
  laptopIsDay: boolean | null;
  tempAssumedC: number; // main.c feeds a constant 25 °C to the model (not sent over UART)
  sunlightPct: number;
  soilPct: number;
  humRhEst: number;
  ldrAdc: number;
  humAdc: number;
  soilRaw: number;
  lowLightMin: number;
  highLightMin: number;
  warnings: FwWarning[]; // WARN1 / WARN2 from the OLED, "NONE" removed
}

export interface EspStatus {
  stm32Link: 'ok' | 'stale';
  lastLineAgeMs: number | null;
  espUptimeMs: number;
  validLines: number | null;
  invalidLines: number | null;
  clients: number | null;
  receivedAt: number;
}

/** Measured quantities that have ranges, charts and alerts. Temperature is not one of them. */
export type SensorKey = 'soilPct' | 'humRhEst' | 'sunlightPct';

export interface Range { min: number; max: number }
export type PlantRanges = Record<SensorKey, Range>;

export interface PlantProfile {
  nickname: string;
  photo: string | null; // small data URL, stored locally
  ranges: PlantRanges;
}

export type AlertCategory =
  | 'soilLow' | 'soilHigh' | 'humLow' | 'humHigh' | 'lightLow' | 'lightHigh'
  | 'highStress' | 'linkLost' | 'linkRestored' | 'stm32Stale';

export interface AlertItem {
  id: string;
  ts: number;
  category: AlertCategory;
  title: string;
  detail: string;
  source: DataSource | 'link';
  read: boolean;
}

export interface Settings {
  wsUrl: string;
  autoConnect: boolean;
  staleTimeoutSec: number;
  demoMode: boolean;
  demoIntervalSec: number;
  demoPlant: PlantType; // simulates the SW2 plant toggle in Demo Mode
  profiles: Record<PlantType, PlantProfile>;
  alertsEnabled: Record<AlertCategory, boolean>;
  hysteresis: Record<SensorKey, number>;
  retentionDays: number;
  greetingName: string;
}

/** The single connection state shown to the user. */
export type LinkState = 'live' | 'stale' | 'offline' | 'connecting' | 'demo';

export type WsPhase = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'failed' | 'closed';
