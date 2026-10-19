// Dominio separado: BCC (oficial) vs elToque (informal / calle).
// Regla inviolable: nunca mezclar valores entre fuentes para cálculo,
// promedio, tendencia o conversión. Solo vista lado-a-lado explícita.

export type RateSource = 'BCC' | 'ELTOQUE';

export const SOURCE_META: Record<
  RateSource,
  { short: string; long: string; legal: string }
> = {
  BCC: {
    short: 'BCC',
    long: 'Oficial BCC',
    legal: 'Tasa oficial · instituciones estatales',
  },
  ELTOQUE: {
    short: 'elToque',
    long: 'Informal calle',
    legal: 'Referencia informal de calle · no oficial · uso no estatal',
  },
};

// --- BCC (oficial) re-exporta el modelo existente sin mutarlo ---
export type { TasaCambio, TasaCambioHistorico, TasasActivasResponse } from '../../types';

// --- elToque (informal) ---
// Payload crudo del proxy (el proxy habla con tasas.eltoque.com).
// Nunca llamar a tasas.eltoque.com directo desde el móvil (Bearer exfiltrable).
export interface ElToqueRawResponse {
  date: string;
  hour: number;
  minutes: number;
  seconds: number;
  tasas: Record<string, unknown>;
}

export const ELTOQUE_CODES = [
  'USD',
  'MLC',
  'EUR',
  'CAD',
  'CLA',
  'BTC',
  'TRX',
  'USDT_TRC20',
  // Zelle llega por un endpoint aparte (canal de pago, no moneda del TRMI),
  // así que se presenta al final. Ver mapCubanomicZelleToRate.
  'ZELLE',
] as const;
export type ElToqueCode = (typeof ELTOQUE_CODES)[number];
/** Claves del TRMI directo (ECU = euro, unidad monetaria europea). */
const ELTOQUE_RAW_KEYS = ['USD', 'MLC', 'ECU', 'BTC', 'TRX', 'USDT_TRC20'] as const;
/**
 * Claves del `statistics` de cubanomic: el TRMI más series propias de esa
 * fuente (CAD, Clásica). Se validan y mapean aparte porque el respaldo directo
 * no publica estas series: un CAD no numérico ahí no debe tirar el día entero.
 */
const CUBANOMIC_RAW_KEYS = ['USD', 'MLC', 'ECU', 'CAD', 'CLA', 'BTC', 'TRX', 'USDT_TRC20'] as const;
/** Traducción clave cruda -> código normalizado. */
const RAW_TO_CODE: Record<string, ElToqueCode> = {
  USD: 'USD',
  MLC: 'MLC',
  ECU: 'EUR',
  CAD: 'CAD',
  CLA: 'CLA',
  BTC: 'BTC',
  TRX: 'TRX',
  USDT_TRC20: 'USDT_TRC20',
};

export interface ElToqueRate {
  /** Código normalizado. ZELLE es un canal de pago (dólar vía Zelle), no una
   * moneda del TRMI, pero se cotiza en CUP como el resto de la fuente informal. */
  code: ElToqueCode;
  name: string;
  /** Valor en CUP según mercado informal. No comparable con tasa BCC. */
  value: number;
  source: 'ELTOQUE';
  date: string;
  fetchedAt: string;
}

export interface ElToqueDaily {
  date: string;
  rates: ElToqueRate[];
  fetchedAt: string;
  /** True si viene de almacenamiento local por falta de red (fecha visible en UI). */
  stale?: boolean;
}

// Solo códigos que existen en ambas fuentes pueden compararse lado-a-lado.
// BTC/TRX/USDT no tienen equivalente BCC: jamás aparecen en Comparar.
export const COMPARABLE_CODES = ['USD', 'MLC', 'EUR'] as const;
export type ComparableCode = (typeof COMPARABLE_CODES)[number];

export interface CompareRow {
  code: ComparableCode;
  bccValue: number | null;
  elToqueValue: number | null;
  /** (informal - oficial) / oficial, solo informativo. No usar para convertir. */
  spreadPct: number | null;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isElToqueResponse(x: unknown): x is ElToqueRawResponse {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  if (typeof r.date !== 'string' || !DATE_RE.test(r.date)) return false;
  if (!isFiniteNumber(r.hour) || !isFiniteNumber(r.minutes)) return false;
  if (!r.tasas || typeof r.tasas !== 'object') return false;
  return true;
}

export function isValidElToqueTasas(tasas: Record<string, unknown>): boolean {
  for (const code of ELTOQUE_RAW_KEYS) {
    const v = tasas[code];
    // Códigos elToque son opcionales por día, pero si vienen deben ser números finitos.
    if (v !== undefined && !isFiniteNumber(v)) return false;
  }
  return true;
}

const ELTOQUE_NAMES: Record<ElToqueCode, string> = {
  USD: 'Dólar',
  MLC: 'MLC',
  EUR: 'Euro',
  CAD: 'Dólar canadiense',
  CLA: 'Clásica',
  BTC: 'Bitcoin',
  TRX: 'Tron',
  USDT_TRC20: 'Tether',
  ZELLE: 'Dólar vía Zelle',
};

/**
 * tasas -> ElToqueRate[]. `day` es la fecha pedida: la API responde siempre
 * `date: hoy`, así que la fecha válida es el día solicitado (si no, cada día
 * sobrescribiría al anterior y la serie histórica quedaría en 1 fila).
 */
export function mapElToqueToRates(
  raw: ElToqueRawResponse,
  fetchedAt: string,
  day?: string,
): ElToqueRate[] {
  if (!isElToqueResponse(raw)) return [];
  const tasas = raw.tasas as Record<string, unknown>;
  if (!isValidElToqueTasas(tasas)) return [];
  const out: ElToqueRate[] = [];
  for (const rawKey of ELTOQUE_RAW_KEYS) {
    const v = tasas[rawKey];
    if (!isFiniteNumber(v) || v <= 0) continue;
    const code = RAW_TO_CODE[rawKey];
    out.push({
      code,
      name: ELTOQUE_NAMES[code],
      value: v,
      source: 'ELTOQUE',
      date: day ?? raw.date,
      fetchedAt,
    });
  }
  return out;
}

// --- cubanomic (fuente del widget de elToque) ---
// api.cubanomic.com sirve el mismo TRMI que tasas.eltoque.com, pero exige el
// header Origin del widget (iframe.cubanomic.com) y un token público que va
// embebido en el bundle del widget. El valor de cada moneda es la MEDIANA de
// las ofertas del día (la cifra que elToque publica como TRMI).

export interface CubanomicXRates {
  date: string;
  hour: number;
  minutes: number;
  seconds: number;
  statistics: Record<string, unknown>;
}

export function isCubanomicXRates(x: unknown): x is CubanomicXRates {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  if (typeof r.date !== 'string' || !DATE_RE.test(r.date)) return false;
  if (!isFiniteNumber(r.hour) || !isFiniteNumber(r.minutes)) return false;
  if (!r.statistics || typeof r.statistics !== 'object') return false;
  return true;
}

/** Clave de la serie del dólar pagado por Zelle (endpoint filtrado por pm). */
const CUBANOMIC_ZELLE_RAW_KEY = 'USD_Zelle.CUP';

/**
 * Valor de una estadística de cubanomic: la mediana (avg de respaldo).
 * `allowEmpty`: una ventana sin mensajes (count_messages 0) devuelve la
 * mediana arrastrada de días previos; solo se acepta para la ventana de hoy
 * (tasa vigente), nunca para rellenar días históricos.
 */
function readCubanomicStat(stat: unknown, allowEmpty: boolean): number | null {
  if (!stat || typeof stat !== 'object') return null;
  const st = stat as Record<string, unknown>;
  if (!allowEmpty && !(isFiniteNumber(st.count_messages) && st.count_messages > 0)) return null;
  if (isFiniteNumber(st.median) && st.median > 0) return st.median;
  if (isFiniteNumber(st.avg) && st.avg > 0) return st.avg;
  return null;
}

function makeRate(code: ElToqueCode, value: number, day: string, fetchedAt: string): ElToqueRate {
  return { code, name: ELTOQUE_NAMES[code], value, source: 'ELTOQUE', date: day, fetchedAt };
}

/** statistics -> ElToqueRate[] (mediana; ver readCubanomicStat). */
export function mapCubanomicToRates(
  raw: CubanomicXRates,
  day: string,
  fetchedAt: string,
  allowEmpty = false,
): ElToqueRate[] {
  if (!isCubanomicXRates(raw)) return [];
  const stats = raw.statistics as Record<string, unknown>;
  const out: ElToqueRate[] = [];
  for (const rawKey of CUBANOMIC_RAW_KEYS) {
    const value = readCubanomicStat(stats[rawKey], allowEmpty);
    if (value === null) continue;
    out.push(makeRate(RAW_TO_CODE[rawKey], value, day, fetchedAt));
  }
  return out;
}

/**
 * Serie del dólar pagado por Zelle. Es un canal de pago, no una moneda del
 * TRMI: cubanomic la sirve en un endpoint aparte (x-rates-filter-by-pm con
 * `payment_method=Zelle&x_cur=CUP`) bajo la única clave `USD_Zelle.CUP`.
 * Misma mediana y mismo gate de actividad que el resto de series.
 */
export function mapCubanomicZelleToRate(
  raw: CubanomicXRates,
  day: string,
  fetchedAt: string,
  allowEmpty = false,
): ElToqueRate | null {
  if (!isCubanomicXRates(raw)) return null;
  const stats = raw.statistics as Record<string, unknown>;
  const value = readCubanomicStat(stats[CUBANOMIC_ZELLE_RAW_KEY], allowEmpty);
  return value === null ? null : makeRate('ZELLE', value, day, fetchedAt);
}

export function buildCompareRows(
  bccByCode: Map<string, number>,
  eltoque: ElToqueRate[],
): CompareRow[] {
  const informal = new Map(eltoque.map((r) => [r.code, r.value]));
  return COMPARABLE_CODES.map((code) => {
    const bccValue = bccByCode.get(code) ?? null;
    const elToqueValue = informal.get(code) ?? null;
    const spreadPct =
      bccValue !== null && elToqueValue !== null && bccValue > 0
        ? (elToqueValue - bccValue) / bccValue
        : null;
    return { code, bccValue, elToqueValue, spreadPct };
  }).filter((r) => r.bccValue !== null || r.elToqueValue !== null);
}
