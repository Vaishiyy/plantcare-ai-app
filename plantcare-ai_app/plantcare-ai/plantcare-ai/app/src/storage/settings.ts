// Settings and plant profiles, persisted in localStorage (per device, per browser).

import type { AlertCategory, PlantRanges, PlantType, Settings } from '../types';

const KEY = 'plantcare.settings.v1';
// Bump when the meaning of a stored setting changes. v2: connection moved from ESP WebSocket to the Flask server.
const CONN_VERSION = 2;

/**
 * Default ranges: the same limits the STM32 firmware (main.c V3) uses for its OLED warnings
 * (ALOE_/POTHOS_ SOIL, AIR and LIGHT_PCT defines), so the app and the OLED agree.
 * main.c calls these "wide prototype ranges", so they are editable in the app.
 */
export const DATASET_DEFAULT_RANGES = {
  ALOE_VERA: { soilPct: { min: 10, max: 45 }, humRhEst: { min: 20, max: 75 }, sunlightPct: { min: 25, max: 95 } },
  POTHOS: { soilPct: { min: 20, max: 70 }, humRhEst: { min: 30, max: 85 }, sunlightPct: { min: 15, max: 85 } },
} as const;

/** Defaults shipped by the previous version (old dataset percentiles). Replaced on load if unchanged. */
const OLD_DEFAULT_RANGES = {
  ALOE_VERA: { soilPct: { min: 13, max: 33 }, humRhEst: { min: 33, max: 57 } },
  POTHOS: { soilPct: { min: 38, max: 62 }, humRhEst: { min: 44, max: 71 } },
} as const;

const sameRange = (a: { min: number; max: number } | undefined, b: { min: number; max: number }) =>
  !!a && a.min === b.min && a.max === b.max;

/** Brings stored ranges up to date: adds sunlight %, and swaps untouched old defaults for the firmware's. */
function migrateRanges(plant: PlantType, stored: Partial<Record<string, { min: number; max: number }>> | undefined): PlantRanges {
  const def = structuredClone(DATASET_DEFAULT_RANGES[plant]) as PlantRanges;
  if (!stored) return def;
  const old = OLD_DEFAULT_RANGES[plant];
  const pick = (k: 'soilPct' | 'humRhEst') => (stored[k] && !sameRange(stored[k], old[k]) ? stored[k]! : def[k]);
  return { soilPct: pick('soilPct'), humRhEst: pick('humRhEst'), sunlightPct: stored.sunlightPct ?? def.sunlightPct };
}

const allAlerts: Record<AlertCategory, boolean> = {
  soilLow: true, soilHigh: true, humLow: true, humHigh: true, lightLow: true, lightHigh: true,
  highStress: true, linkLost: true, linkRestored: true, stm32Stale: true,
};

export const DEFAULT_SETTINGS: Settings = {
  wsUrl: '', // empty = PlantCare server on the same laptop that served this page (port 5000)
  autoConnect: true,
  staleTimeoutSec: 15,
  demoMode: false,
  demoIntervalSec: 3,
  demoPlant: 'POTHOS',
  profiles: {
    ALOE_VERA: { nickname: '', photo: null, ranges: structuredClone(DATASET_DEFAULT_RANGES.ALOE_VERA) },
    POTHOS: { nickname: '', photo: null, ranges: structuredClone(DATASET_DEFAULT_RANGES.POTHOS) },
  },
  alertsEnabled: allAlerts,
  hysteresis: { soilPct: 2, humRhEst: 2, sunlightPct: 2 },
  retentionDays: 30,
  greetingName: '',
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const s = JSON.parse(raw) as Partial<Settings> & { connVersion?: number };
    if ((s.connVersion ?? 1) < CONN_VERSION) s.wsUrl = ''; // old ws://ESP address no longer applies
    // Merge so that settings added in later versions get their defaults.
    return {
      ...structuredClone(DEFAULT_SETTINGS),
      ...s,
      profiles: {
        ALOE_VERA: {
          ...DEFAULT_SETTINGS.profiles.ALOE_VERA, ...s.profiles?.ALOE_VERA,
          ranges: migrateRanges('ALOE_VERA', s.profiles?.ALOE_VERA?.ranges),
        },
        POTHOS: {
          ...DEFAULT_SETTINGS.profiles.POTHOS, ...s.profiles?.POTHOS,
          ranges: migrateRanges('POTHOS', s.profiles?.POTHOS?.ranges),
        },
      },
      alertsEnabled: { ...allAlerts, ...s.alertsEnabled },
      hysteresis: {
        soilPct: s.hysteresis?.soilPct ?? DEFAULT_SETTINGS.hysteresis.soilPct,
        humRhEst: s.hysteresis?.humRhEst ?? DEFAULT_SETTINGS.hysteresis.humRhEst,
        sunlightPct: s.hysteresis?.sunlightPct ?? DEFAULT_SETTINGS.hysteresis.sunlightPct,
      },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

/** Returns false if the browser refused to store (private mode, quota exceeded). */
export function saveSettings(s: Settings): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, connVersion: CONN_VERSION }));
    return true;
  } catch {
    return false;
  }
}
