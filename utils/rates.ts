import type { TasaCambio } from '../types';

export type RateType = 'oficial' | 'publica' | 'especial';
export type OperationType = 'compra' | 'venta';

// Single source of truth for rate types (labels included: they already
// diverged once between screens, 'Publica' vs 'Publica' with accent).
export const RATE_TYPES: { key: RateType; label: string }[] = [
  { key: 'oficial', label: 'Oficial' },
  { key: 'publica', label: 'P\u00fablica' },
  { key: 'especial', label: 'Especial' },
];

// Buy/sell spread: +/-2% business rule. Centralized here so a change (or a
// per-currency spread) touches one place, not every screen.
export const SPREAD_COMPRA = 1.02;
export const SPREAD_VENTA = 0.98;

type RateSource = Pick<TasaCambio, 'tasaOficial' | 'tasaPublica' | 'tasaEspecial'>;

export function getRateByType(tasa: RateSource | undefined | null, type: RateType): number {
  if (!tasa) return 0;
  switch (type) {
    case 'oficial':
      return tasa.tasaOficial;
    case 'publica':
      return tasa.tasaPublica;
    case 'especial':
      return tasa.tasaEspecial;
  }
}

export function applySpread(baseRate: number, operation: OperationType): number {
  return operation === 'compra' ? baseRate * SPREAD_COMPRA : baseRate * SPREAD_VENTA;
}

export function spreadLabel(operation: OperationType): '+2%' | '-2%' {
  return operation === 'compra' ? '+2%' : '-2%';
}
