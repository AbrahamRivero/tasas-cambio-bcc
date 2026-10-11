// Repository con separación estricta. No existe getUnified ni mezcla.
// Cada fuente se pide, cachea y muestra por separado. Comparar es
// solo proyección lado-a-lado, nunca insumo para convertir o promediar.

import { bccSpecialByCode, getBccActive } from './bcc-client';
import { elToqueClient, loadElToqueLocalHistory } from './eltoque-client';
import { buildCompareRows, type CompareRow, type ElToqueDaily } from './types';
import type { TasasActivasResponse } from '../../types';

export type SourceTab = 'BCC' | 'ELTOQUE' | 'COMPARAR';

export interface CompareResult {
  rows: CompareRow[];
  bccDate: string;
  eltoqueDate: string | null;
  eltoqueAvailable: boolean;
  eltoqueBlocked: boolean;
  eltoqueStale: boolean;
}

export async function getCompareRows(): Promise<CompareResult> {
  const [bccRes, informalRes] = await Promise.all([
    getBccActive(),
    elToqueClient.getLatestDaily(),
  ]);

  const bcc: TasasActivasResponse | null = bccRes.success ? bccRes.data : null;
  const informal: ElToqueDaily | null = informalRes.ok ? informalRes.data : null;

  const bccByCode = bcc ? bccSpecialByCode(bcc) : new Map<string, number>();
  const rows = buildCompareRows(bccByCode, informal?.rates ?? []);

  return {
    rows,
    bccDate: bcc?.fechaDia ?? bcc?.fechaHoy ?? '',
    eltoqueDate: informal?.date ?? null,
    eltoqueAvailable: informal !== null,
    eltoqueBlocked: !informalRes.ok && informalRes.blocked === true,
    eltoqueStale: informal?.stale === true,
  };
}

export const ratesRepository = {
  getBccActive,
  getElToqueDaily: (date?: string, opts?: { forceRefresh?: boolean; proxyUrl?: string }) =>
    date ? elToqueClient.getDaily(date, opts) : elToqueClient.getLatestDaily(opts),
  getCompareRows,
  getElToqueDiagnostics: () => elToqueClient.getDiagnostics(),
  getElToqueLocalHistory: () => loadElToqueLocalHistory(),
  /** Completa la serie local con días anteriores reales (respeta cuota/bloqueo). */
  getElToqueHistory: (daysBack?: number) => elToqueClient.getHistory(daysBack),
};
