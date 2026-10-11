// Fachada BCC (oficial). Delega al ApiService existente para no duplicar
// transporte/cache. Este archivo es el único punto de acceso oficial;
// la UI no debe importar services/api directamente para tasas BCC nuevas.

import { apiService } from '../api';
import type { RequestOptions } from '../api';
import type { TasaCambioHistorico, TasasActivasResponse } from '../../types';
import type { ApiResponse } from '../../types';

export async function getBccActive(
  options?: RequestOptions,
): Promise<ApiResponse<TasasActivasResponse>> {
  return apiService.getActiveCurrencies(options);
}

export async function getBccHistorico(
  moneda?: string,
  options?: RequestOptions,
): Promise<ApiResponse<TasaCambioHistorico[]>> {
  return apiService.getTasasHistorico(moneda, options);
}

/** Mapa codigo -> tasaEspecial (la usada en hero/cards). Solo BCC. */
export function bccSpecialByCode(tasas: TasasActivasResponse): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tasas.tasas) {
    if (typeof t.codigoMoneda === 'string' && Number.isFinite(t.tasaEspecial)) {
      m.set(t.codigoMoneda.toUpperCase(), t.tasaEspecial);
    }
  }
  return m;
}
