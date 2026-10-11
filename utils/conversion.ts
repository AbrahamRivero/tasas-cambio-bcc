import { applySpread, getRateByType } from './rates';
import type { OperationType, RateType } from './rates';

export interface ConverterTasa {
  codigoMoneda: string;
  nombreMoneda: string;
  tasaOficial: number;
  tasaPublica: number;
  tasaEspecial: number;
}

export const QUICK_AMOUNTS_COMPRA = [100, 500, 1000, 5000];
export const QUICK_AMOUNTS_VENTA = [10, 50, 100, 500];

export function parseInputAmount(value: string): number {
  const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function getRateWithSpread(
  tasa: ConverterTasa | undefined,
  rateType: RateType,
  operation: OperationType
): number {
  return applySpread(getRateByType(tasa, rateType), operation);
}

export function convertAmount(inputAmount: number, rate: number, operation: OperationType): number {
  // Guarded: a missing rate used to render as Infinity instead of 0.
  if (!Number.isFinite(inputAmount) || !Number.isFinite(rate) || rate <= 0) return 0;
  return operation === 'compra' ? inputAmount / rate : inputAmount * rate;
}
