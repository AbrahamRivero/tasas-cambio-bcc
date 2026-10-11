export interface Moneda {
  codigo: string;
  nombre: string;
  descripcion?: string;
}

export interface TasaCambio {
  _id: string;
  codigoMoneda: string;
  nombreMoneda: string;
  tasaOficial: number;
  tasaPublica: number;
  tasaEspecial: number;
  fechaDesde: string;
  fechaHasta: string;
  fechaDia: string;
  estado: string;
  fechaSubida: string;
  archivoOrigen: string;
  r2Key: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  fechaActivacion: string;
}

export interface TasasActivasResponse {
  tasas: TasaCambio[];
  fechaDia: string;
  fechaHoy: string;
}

export interface TasaCambioHistorico {
  fecha: string;
  tasaOficial: number;
  tasaPublica: number;
  tasaEspecial: number;
  codigoMoneda?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
  /** True when data is locally generated fallback (estimates), not official API data. */
  isFallback?: boolean;
}

export const MONEDAS_PRINCIPALES: Moneda[] = [
  { codigo: 'USD', nombre: 'Dólar Estadounidense', descripcion: 'USD - United States Dollar' },
  { codigo: 'EUR', nombre: 'Euro', descripcion: 'EUR - Euro' },
  { codigo: 'MXN', nombre: 'Peso Mexicano', descripcion: 'MXN - Mexican Peso' },
  { codigo: 'CAD', nombre: 'Dólar Canadiense', descripcion: 'CAD - Canadian Dollar' },
];

// --- Runtime shape guards (fail-closed: malformed API payloads never reach render) ---

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function isValidTasa(t: unknown): t is TasaCambio {
  if (!t || typeof t !== 'object') return false;
  const r = t as Record<string, unknown>;
  return (
    typeof r.codigoMoneda === 'string' &&
    isFiniteNumber(r.tasaOficial) &&
    isFiniteNumber(r.tasaPublica) &&
    isFiniteNumber(r.tasaEspecial)
  );
}

export function isValidHistorico(h: unknown): h is TasaCambioHistorico {
  if (!h || typeof h !== 'object') return false;
  const r = h as Record<string, unknown>;
  return (
    typeof r.fecha === 'string' &&
    isFiniteNumber(r.tasaOficial) &&
    isFiniteNumber(r.tasaPublica) &&
    isFiniteNumber(r.tasaEspecial)
  );
}

export function isTasasActivasResponse(x: unknown): x is TasasActivasResponse {
  if (!x || typeof x !== 'object') return false;
  const r = x as Record<string, unknown>;
  return Array.isArray(r.tasas) && typeof r.fechaDia === 'string';
}
