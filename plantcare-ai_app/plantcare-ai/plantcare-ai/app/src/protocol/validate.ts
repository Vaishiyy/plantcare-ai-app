// Validation of readings and status messages from the PlantCare server (see PROTOCOL.md).
// Anything that fails validation is dropped; the UI only ever sees well-formed data.

import { FW_WARNINGS, type EspStatus, type FwWarning, type MlClass, type PlantType, type Reading } from '../types';

/** main.c feeds this constant to the model (ASSUMED_TEMPERATURE_C); it is not measured or sent. */
export const ASSUMED_TEMP_C = 25;
/** Must match PROTOCOL_VERSION in server/plantcare_server.py. */
export const PROTOCOL_VERSION = 3;
const MAX_MINUTES = Math.floor(0xffffffff / 60);

export const STATUS_NAMES: Record<MlClass, string> = {
  0: 'HIGH STRESS',
  1: 'MODERATE STRESS',
  2: 'SUITABLE',
};

type Obj = Record<string, unknown>;

const isInt = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;

export type ParsedMessage =
  | { kind: 'reading'; reading: Omit<Reading, 'ts' | 'source'> }
  | { kind: 'status'; status: Omit<EspStatus, 'receivedAt'> }
  | { kind: 'invalid'; reason: string };

export function parseMessage(raw: unknown): ParsedMessage {
  if (typeof raw !== 'string') return { kind: 'invalid', reason: 'not text' };
  if (raw.length > 2000) return { kind: 'invalid', reason: 'too long' };
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return { kind: 'invalid', reason: 'not JSON' };
  }
  if (!m || typeof m !== 'object' || Array.isArray(m)) return { kind: 'invalid', reason: 'not an object' };
  const o = m as Obj;

  if (o.type === 'reading') {
    if (o.plant !== 'ALOE_VERA' && o.plant !== 'POTHOS') return { kind: 'invalid', reason: 'plant' };
    if (!isInt(o.ml_class, 0, 2)) return { kind: 'invalid', reason: 'ml_class' };
    const cls = o.ml_class as MlClass;
    if (o.ml_status !== STATUS_NAMES[cls]) return { kind: 'invalid', reason: 'ml_status does not match ml_class' };
    const checks: [string, number, number][] = [
      ['seq', 0, 2 ** 32], ['esp_uptime_ms', 0, 2 ** 32], ['ml_provisional', 0, 1], ['day', -1, 1],
      ['sunlight_pct', 0, 100], ['soil_pct', 0, 100], ['hum_rh_est', 0, 100],
      ['ldr_adc', 0, 4095], ['hum_adc', 0, 4095], ['soil_raw', 0, 4095],
      ['low_light_min', 0, MAX_MINUTES], ['high_light_min', 0, MAX_MINUTES],
    ];
    for (const [k, lo, hi] of checks) if (!isInt(o[k], lo, hi)) return { kind: 'invalid', reason: k };
    const warnings: FwWarning[] = [];
    for (const k of ['warn1', 'warn2']) {
      const w = o[k];
      if (w === 'NONE') continue;
      if (typeof w !== 'string' || !(FW_WARNINGS as readonly string[]).includes(w)) return { kind: 'invalid', reason: k };
      if (!warnings.includes(w as FwWarning)) warnings.push(w as FwWarning);
    }
    if (!(o.laptop_is_day === undefined || o.laptop_is_day === null || typeof o.laptop_is_day === 'boolean'))
      return { kind: 'invalid', reason: 'laptop_is_day' };
    return {
      kind: 'reading',
      reading: {
        seq: o.seq as number,
        espUptimeMs: o.esp_uptime_ms as number,
        plant: o.plant as PlantType,
        mlClass: cls,
        mlProvisional: o.ml_provisional as 0 | 1,
        fwDay: o.day as -1 | 0 | 1,
        laptopIsDay: typeof o.laptop_is_day === 'boolean' ? o.laptop_is_day : null,
        tempAssumedC: ASSUMED_TEMP_C,
        sunlightPct: o.sunlight_pct as number,
        soilPct: o.soil_pct as number,
        humRhEst: o.hum_rh_est as number,
        ldrAdc: o.ldr_adc as number,
        humAdc: o.hum_adc as number,
        soilRaw: o.soil_raw as number,
        lowLightMin: o.low_light_min as number,
        highLightMin: o.high_light_min as number,
        warnings,
      },
    };
  }

  if (o.type === 'status') {
    if (o.stm32_link !== 'ok' && o.stm32_link !== 'stale') return { kind: 'invalid', reason: 'stm32_link' };
    if (!(o.last_line_age_ms === null || isInt(o.last_line_age_ms, 0, 2 ** 32)))
      return { kind: 'invalid', reason: 'last_line_age_ms' };
    if (!isInt(o.esp_uptime_ms, 0, 2 ** 32)) return { kind: 'invalid', reason: 'esp_uptime_ms' };
    const optInt = (v: unknown) => (isInt(v, 0, 2 ** 32) ? (v as number) : null);
    return {
      kind: 'status',
      status: {
        stm32Link: o.stm32_link,
        lastLineAgeMs: o.last_line_age_ms as number | null,
        espUptimeMs: o.esp_uptime_ms as number,
        validLines: optInt(o.valid_lines),
        invalidLines: optInt(o.invalid_lines),
        clients: optInt(o.clients),
      },
    };
  }

  return { kind: 'invalid', reason: 'unknown type' };
}
