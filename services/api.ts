import { ApiResponse, isTasasActivasResponse, isValidHistorico, isValidTasa, TasaCambio, TasaCambioHistorico, TasasActivasResponse } from '../types';

const BASE_URL = 'https://api.bc.gob.cu/v1/tasas-de-cambio';

// Rates change daily: a 5-minute TTL avoids redundant traffic across tab
// mounts, polls and manual refreshes without risking stale figures.
const CACHE_TTL_MS = 5 * 60 * 1000;
// Fail-closed: never hang the UI on a slow network.
const REQUEST_TIMEOUT_MS = 15 * 1000;

export interface RequestOptions {
  /** Bypass the TTL cache and fetch fresh data. */
  forceRefresh?: boolean;
  /** Aborts the underlying fetch (e.g. effect cleanup on unmount). */
  signal?: AbortSignal;
}

interface CacheEntry {
  ts: number;
  res: ApiResponse<any>;
}

class ApiService {
  private cache = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<ApiResponse<any>>>();

  private async fetchFresh<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    const onExternalAbort = () => controller.abort();
    try {
      if (options?.signal?.aborted) {
        return { success: false, data: {} as T, error: 'Solicitud cancelada' };
      }
      options?.signal?.addEventListener('abort', onExternalAbort, { once: true });

      // Cache-buster only on explicit refresh so CDN/device caches stay usable.
      const url = options?.forceRefresh
        ? `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`
        : `${BASE_URL}${endpoint}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        data,
      };
    } catch (error) {
      let errorMessage = 'Error desconocido';

      if (timedOut) {
        errorMessage = 'Tiempo de espera agotado. Intente nuevamente.';
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        errorMessage = 'Solicitud cancelada';
      } else if (error instanceof Error) {
        // Handle specific network errors
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Error de conexión. Verifique su acceso a internet.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Tiempo de espera agotado. Intente nuevamente.';
        } else if (error.message.includes('HTTP error! status: 404')) {
          errorMessage = 'Servicio no disponible. Intente más tarde.';
        } else if (error.message.includes('HTTP error! status: 500')) {
          errorMessage = 'Error del servidor. Intente más tarde.';
        } else if (error.message.includes('HTTP error! status: 503')) {
          errorMessage = 'Servicio en mantenimiento. Intente más tarde.';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        data: {} as T,
        error: errorMessage,
      };
    } finally {
      clearTimeout(timer);
      options?.signal?.removeEventListener('abort', onExternalAbort);
    }
  }

  private async request<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    if (options?.forceRefresh) {
      this.cache.delete(endpoint);
      this.inflight.delete(endpoint);
    } else {
      const hit = this.cache.get(endpoint);
      if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
        return hit.res as ApiResponse<T>;
      }
      // Coalesce concurrent identical calls (the three tabs fetch /activas).
      const ongoing = this.inflight.get(endpoint);
      if (ongoing) {
        return ongoing as Promise<ApiResponse<T>>;
      }
    }

    const p = this.fetchFresh<T>(endpoint, options);
    this.inflight.set(endpoint, p);
    try {
      const res = await p;
      if (res.success) {
        this.cache.set(endpoint, { ts: Date.now(), res });
      }
      return res;
    } finally {
      if (this.inflight.get(endpoint) === p) {
        this.inflight.delete(endpoint);
      }
    }
  }

  async getActiveCurrencies(options?: RequestOptions): Promise<ApiResponse<TasasActivasResponse>> {
    const res = await this.request<TasasActivasResponse>('/activas', options);
    if (!res.success) {
      return res;
    }
    // Fail-closed: a malformed payload never reaches render as if it were valid.
    if (!isTasasActivasResponse(res.data)) {
      return {
        success: false,
        data: { tasas: [], fechaDia: '', fechaHoy: '' },
        error: 'Respuesta inesperada del servidor. Intente más tarde.',
      };
    }
    const raw = res.data.tasas;
    const tasas = raw.filter(isValidTasa);
    if (tasas.length === 0 && raw.length > 0) {
      return {
        success: false,
        data: { tasas: [], fechaDia: res.data.fechaDia, fechaHoy: '' },
        error: 'Respuesta inesperada del servidor. Intente más tarde.',
      };
    }
    return {
      ...res,
      data: {
        tasas,
        fechaDia: res.data.fechaDia,
        fechaHoy: typeof res.data.fechaHoy === 'string' ? res.data.fechaHoy : '',
      },
    };
  }

  async getTasasHistorico(moneda?: string, options?: RequestOptions): Promise<ApiResponse<TasaCambioHistorico[]>> {
    try {
      // Calculate date range for last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const fechaFin = today.toISOString().split('T')[0];
      const fechaInicio = thirtyDaysAgo.toISOString().split('T')[0];

      // Build endpoint with fechaInicio and fechaFin parameters
      let endpoint = `/historico?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      // Allowlist + encode: currency codes come from the API list, but never
      // interpolate them into the query string blindly.
      const codigo = (moneda ?? '').toUpperCase();
      if (/^[A-Z]{3,4}$/.test(codigo)) {
        endpoint += `&codigoMoneda=${encodeURIComponent(codigo)}`;
      }

      const response = await this.request<TasaCambioHistorico[]>(endpoint, options);

      // If the API call is successful, return the response (dropping malformed rows)
      if (response.success) {
        const rows = Array.isArray(response.data) ? response.data.filter(isValidHistorico) : [];
        return { ...response, data: rows };
      }

      // If the API call fails, generate mock historical data from active rates.
      // Why 7 days (not the requested 30): the mock only needs to suggest a
      // trend shape, and stays clearly behind real data in volume. Retire this
      // fallback once the /historico endpoint is reliable (tracked via the
      // isFallback banner in history.tsx).
      const activasResponse = await this.getActiveCurrencies(options);
      if (!activasResponse.success) {
        return {
          success: false,
          data: [],
          error: 'No se pudieron cargar las tasas históricas ni las tasas activas'
        };
      }

      // Convert active rates to historical format
      const mockHistoricalData: TasaCambioHistorico[] = [];
      const tasas = activasResponse.data.tasas;

      // Filter by currency if specified
      const filteredTasas = moneda
        ? tasas.filter(tasa => tasa.codigoMoneda === moneda.toUpperCase())
        : tasas;

      // Generate historical data for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        filteredTasas.forEach(tasa => {
          const variation = 0.98 + Math.random() * 0.04;
          mockHistoricalData.push({
            fecha: dateStr,
            tasaOficial: parseFloat((tasa.tasaOficial * variation).toFixed(4)),
            tasaPublica: parseFloat((tasa.tasaPublica * variation).toFixed(4)),
            tasaEspecial: parseFloat((tasa.tasaEspecial * variation).toFixed(4)),
            codigoMoneda: tasa.codigoMoneda
          });
        });
      }

      // Mark the provenance: these are local estimates, not official BCC data.
      return {
        success: true,
        data: mockHistoricalData,
        isFallback: true
      };

    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Error al cargar datos históricos'
      };
    }
  }

  async getTasaPorMoneda(moneda: string, options?: RequestOptions): Promise<ApiResponse<TasaCambio>> {
    const tasasResponse = await this.getActiveCurrencies(options);

    if (!tasasResponse.success) {
      return {
        success: false,
        data: null as unknown as TasaCambio,
        error: tasasResponse.error || 'Error al cargar las tasas',
      };
    }

    const tasa = tasasResponse.data.tasas.find(t => t.codigoMoneda === moneda.toUpperCase());

    if (!tasa) {
      return {
        success: false,
        data: {} as TasaCambio,
        error: `No se encontró tasa para la moneda ${moneda}`,
      };
    }

    return {
      success: true,
      data: tasa,
    };
  }
}

export const apiService = new ApiService();
