// Cliente elToque (informal / calle) en modo directo, sin backend.
// Usa EXPO_PUBLIC_ELTOQUE_API_KEY del .env (modo sin recursos).
// Si EXPO_PUBLIC_ELTOQUE_PROXY_URL está definida, prefiere el proxy.

import { TtlCache, TTL_ELTOQUE_MS } from './cache';
import { storageGet, storageSet } from './storage';
import {
  isElToqueResponse,
  mapElToqueToRates,
  type ElToqueDaily,
  type ElToqueRawResponse,
} from './types';

const STORAGE_KEY = 'eltoque:daily:latest';
const HISTORY_KEY = 'eltoque:daily:history';
const HISTORY_CAP = 30;

async function loadPersisted(): Promise<ElToqueDaily | null> {
  try {
    const raw = await storageGet(STORAGE_KEY);
    if (!raw) return null;
    const json = JSON.parse(raw) as ElToqueDaily;
    if (!json || typeof json.date !== 'string' || !Array.isArray(json.rates)) return null;
    return json;
  } catch {
    return null;
  }
}

async function savePersisted(daily: ElToqueDaily): Promise<void> {
  try {
    await storageSet(STORAGE_KEY, JSON.stringify(daily));
    // Serie local rodante: cada día con datos se acumula (tope 30).
    const rawHist = await storageGet(HISTORY_KEY);
    const hist = rawHist ? (JSON.parse(rawHist) as ElToqueDaily[]) : [];
    const list = Array.isArray(hist) ? hist.filter((h) => h?.date !== daily.date) : [];
    list.unshift({ date: daily.date, rates: daily.rates, fetchedAt: daily.fetchedAt });
    await storageSet(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_CAP)));
  } catch {
    // almacenamiento no disponible: la caché en memoria sigue valiendo
  }
}

export async function loadElToqueLocalHistory(): Promise<ElToqueDaily[]> {
  try {
    const raw = await storageGet(HISTORY_KEY);
    const hist = raw ? (JSON.parse(raw) as ElToqueDaily[]) : [];
    if (!Array.isArray(hist)) return [];
    // Orden cronológico descendente siempre (el guardado es por llegada).
    return hist
      .filter((h) => h && typeof h.date === 'string' && Array.isArray(h.rates))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  } catch {
    return [];
  }
}

const REQUEST_TIMEOUT_MS = 25 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DIRECT_HOST = 'https://tasas.eltoque.com/v1/trmi';

/** Clasificación del fallo de red (para diagnóstico en UI). */
export type ElToqueNetKind = 'timeout' | 'network' | null;

export interface ElToqueRequestOptions {
  forceRefresh?: boolean;
  signal?: AbortSignal;
  proxyUrl?: string;
  apiKey?: string;
}

function getProxyBaseUrl(override?: string): string | null {
  const raw =
    override ??
    (typeof process !== 'undefined'
      ? (process.env as Record<string, string | undefined>).EXPO_PUBLIC_ELTOQUE_PROXY_URL
      : undefined);
  if (!raw || typeof raw !== 'string' || !raw.trim()) return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!/^https:\/\//.test(trimmed)) return null;
  return trimmed;
}

function getApiKey(override?: string): string | null {
  const raw =
    override ??
    (typeof process !== 'undefined'
      ? ((process.env as Record<string, string | undefined>).EXPO_PUBLIC_ELTOQUE_API_KEY ??
        (process.env as Record<string, string | undefined>).ELTOQUE_API_KEY)
      : undefined);
  if (!raw || typeof raw !== 'string' || raw.trim().length < 20) return null;
  return raw.trim();
}

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

export type ElToqueResult =
  | { ok: true; data: ElToqueDaily }
  | { ok: false; data: null; error: string; retryAfterSec?: number; blocked?: boolean; status?: number | null };

export class ElToqueClient {
  private cache = new TtlCache<ElToqueDaily>(TTL_ELTOQUE_MS);
  private inflight = new Map<string, Promise<ElToqueDaily | null>>();
  private retryAfterUntil = 0;
  /** Fallos recientes por día (caché negativa 60s: evita quemar la cuota reintentando). */
  private failCache = new Map<string, { ts: number; error: string; status: number | null }>();

  async getDaily(date?: string, options?: ElToqueRequestOptions): Promise<ElToqueResult> {
    const day = date ?? todayIsoDate();
    if (!DATE_RE.test(day)) {
      return { ok: false, data: null, error: 'Fecha inválida. Use YYYY-MM-DD.', status: null };
    }
    if (Date.now() < this.retryAfterUntil && !options?.forceRefresh) {
      const cached = this.cache.get(`daily:${day}`);
      if (cached) return { ok: true, data: cached };
      return { ok: false, data: null, error: 'Límite de la fuente informal. Reintente en unos minutos.', status: 429 };
    }

    const key = `daily:${day}`;
    if (!options?.forceRefresh) {
      const hit = this.cache.get(key);
      if (hit) return { ok: true, data: hit };
      const fail = this.failCache.get(key);
      if (fail && Date.now() - fail.ts < 60 * 1000) {
        return { ok: false, data: null, error: fail.error, status: fail.status };
      }
      const ongoing = this.inflight.get(key);
      if (ongoing) {
        const data = await ongoing;
        return data
          ? { ok: true, data }
          : { ok: false, data: null, error: 'No se pudo cargar la tasa informal.', status: null };
      }
    } else {
      this.cache.clear(key);
      this.inflight.delete(key);
    }

    const p = this.fetchDaily(day, options);
    this.inflight.set(key, p);
    try {
      const data = await p;
      if (data) {
        this.cache.set(key, data);
        this.failCache.delete(key);
        await savePersisted(data);
        return { ok: true, data };
      }
      const err = this.lastError ?? 'No se pudo cargar la tasa informal.';
      const status = this.lastStatus ?? null;
      this.failCache.set(key, { ts: Date.now(), error: err, status });
      // Sin red pero con datos guardados: servir stale (marcado) en vez de vacío.
      // Solo ante fallo de red/429; ante 401 la key está mal y hay que ver el error.
      const blocked = this.lastNetKind !== null;
      if ((blocked || status === 429) && status !== 401) {
        const stale = await loadPersisted();
        if (stale) return { ok: true, data: { ...stale, stale: true } };
      }
      return { ok: false, data: null, error: err, blocked, status };
    } finally {
      if (this.inflight.get(key) === p) this.inflight.delete(key);
    }
  }

  /**
   * Serie real de días anteriores: completa los días que falten en la serie
   * local (secuencial, 1 request/día; cada éxito se persiste vía getDaily).
   * Se detiene ante 401/429 y tras 2 fallos seguidos sin respuesta: no quema cuota.
   */
  async getHistory(daysBack = 6, options?: ElToqueRequestOptions): Promise<{
    days: ElToqueDaily[];
    missing: { day: string; reason: 'no-data' | 'blocked' | 'limited' | 'auth' }[];
  }> {
    const local = await loadElToqueLocalHistory();
    const have = new Set(local.map((d) => d.date));
    const now = new Date();
    const missing: { day: string; reason: 'no-data' | 'blocked' | 'limited' | 'auth' }[] = [];
    let requested = 0;
    let offlineStreak = 0;
    for (let i = 1; i <= daysBack; i++) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      if (have.has(day)) continue;
      const res = await this.getDaily(day, options);
      if (res.ok) {
        requested++;
        offlineStreak = 0;
      } else {
        const s = res.status ?? null;
        // Key/límite: parar del todo. Sin respuesta: tolerar 1 fallo aislado
        // (un timeout suelto no debe impedir traer los días más viejos).
        if (s === 401) {
          missing.push({ day, reason: 'auth' });
          break;
        }
        if (s === 429) {
          missing.push({ day, reason: 'limited' });
          break;
        }
        if (s === null) {
          missing.push({ day, reason: 'blocked' });
          if (++offlineStreak >= 2) break;
        } else {
          missing.push({ day, reason: 'no-data' });
        }
      }
      // Pausa entre días: no disparar la cuota (límite 10) con ráfagas.
      if (i < daysBack) await new Promise((r) => setTimeout(r, 1500));
      if (requested >= daysBack) break;
    }
    return { days: await loadElToqueLocalHistory(), missing };
  }

  /** Diagnóstico para mostrar en UI (sin exponer la key). */
  getDiagnostics(): { keyPresent: boolean; lastDay: string | null; lastStatus: number | null; lastNetKind: ElToqueNetKind; lastError: string | null } {
    return {
      keyPresent: getApiKey() !== null,
      lastDay: this.lastRequestedDay,
      lastStatus: this.lastStatus ?? null,
      lastNetKind: this.lastNetKind,
      lastError: this.lastError ?? null,
    };
  }

  private lastRequestedDay: string | null = null;
  private lastNetKind: ElToqueNetKind = null;

  private lastError: string | undefined;
  /** Último código HTTP visto (para decidir si vale reintentar otro día). */
  private lastStatus: number | undefined;

  /**
   * Día más reciente con datos: prueba hoy y retrocede hasta 3 días
   * (la serie profunda la completa getHistory con pausa entre días).
   * Solo retrocede ante "sin datos" (422/respuesta vacía); ante 401/429/
   * timeout NO insiste (son sistémicos y quemarían la cuota).
   */
  async getLatestDaily(options?: ElToqueRequestOptions): Promise<ElToqueResult> {
    const days: string[] = [];
    const now = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      days.push(d.toISOString().split('T')[0]);
    }
    let firstError: ElToqueResult | null = null;
    for (const day of days) {
      const res = await this.getDaily(day, options);
      if (res.ok) return res;
      if (!firstError) firstError = res;
      // 422 o "sin tasas" => el día aún no tiene publicación, probar ayer.
      const retryDay = this.lastStatus === 422 || /sin tasas|inesperada/i.test(res.error);
      if (!retryDay) return res;
    }
    return firstError ?? { ok: false, data: null, error: 'No se pudo cargar la tasa informal.' };
  }

  private async fetchDaily(day: string, options?: ElToqueRequestOptions): Promise<ElToqueDaily | null> {
    this.lastError = undefined;
    this.lastStatus = undefined;
    const proxy = getProxyBaseUrl(options?.proxyUrl);
    if (proxy) {
      const viaProxy = await this.fetchViaProxy(proxy, day, options?.signal);
      if (viaProxy) return viaProxy;
      // cae a directo solo si el proxy falla con 502, no con 429
    }
    return this.fetchDirect(day, options);
  }

  private async fetchViaProxy(base: string, day: string, signal?: AbortSignal): Promise<ElToqueDaily | null> {
    try {
      const res = await this.fetchWithTimeout(
        `${base}/trmi-daily?date=${encodeURIComponent(day)}`,
        { headers: { Accept: 'application/json' } },
        signal,
      );
      if (!res) return null;
      if (res.status === 429) {
        this.applyRetryAfter(res);
        this.lastError = 'Límite de la fuente informal. Reintente en unos minutos.';
        return null;
      }
      if (!res.ok) return null;
      const json = (await res.json()) as { date?: string; rates?: ElToqueDaily['rates']; fetchedAt?: string };
      if (json && typeof json.date === 'string' && Array.isArray(json.rates) && json.rates.length > 0) {
        return { date: json.date, rates: json.rates, fetchedAt: json.fetchedAt ?? new Date().toISOString() };
      }
      return null;
    } catch {
      return null;
    }
  }

  private async fetchDirect(day: string, options?: ElToqueRequestOptions): Promise<ElToqueDaily | null> {
    const key = getApiKey(options?.apiKey);
    this.lastRequestedDay = day;
    this.lastNetKind = null;
    if (!key) {
      this.lastError =
        'Falta EXPO_PUBLIC_ELTOQUE_API_KEY en el bundle. Reinicie Metro con `npx expo start -c`.';
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[elToque] API key ausente en process.env (¿Metro sin -c tras editar .env?)');
      }
      return null;
    }
    const dateFrom = `${day} 00:00:01`;
    const dateTo = `${day} 23:59:01`;
    const url = `${DIRECT_HOST}?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`;
    const headers = { accept: '*/*', Authorization: `Bearer ${key}` };
    // Un solo reintento ante timeout (el servidor quizá ni vio la 1ra).
    // Nunca se reintenta 401/422/429: son respuestas, no fallos de red.
    let res: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 2000));
        if (options?.signal?.aborted) break;
      }
      try {
        res = await this.fetchWithTimeout(url, { headers }, options?.signal);
        break;
      } catch (e) {
        this.lastNetKind = this.isTimeoutError(e) ? 'timeout' : 'network';
        if (attempt === 1 || options?.signal?.aborted) {
          this.lastError =
            this.lastNetKind === 'timeout'
              ? 'El servidor informal no responde (25s). Conexión muy lenta o bloqueada.'
              : 'Sin ruta a tasas.eltoque.com. Pruebe datos móviles, otro wifi o VPN.';
          if (typeof __DEV__ !== 'undefined' && __DEV__ && !process.env.JEST_WORKER_ID) {
            console.log(`[elToque] ${day} -> ${this.lastNetKind}: ${(e as Error)?.message ?? e}`);
          }
          return null;
        }
      }
    }
    if (!res) {
      this.lastError = 'Tiempo de espera agotado con la fuente informal.';
      return null;
    }
    this.lastStatus = res.status;
    if (typeof __DEV__ !== 'undefined' && __DEV__ && !process.env.JEST_WORKER_ID) {
      console.log(`[elToque] ${day} -> HTTP ${res.status}`);
    }
    if (res.status === 400) {
      this.lastError = 'Rango inválido para la fuente informal.';
      return null;
    }
    if (res.status === 401 || res.status === 422) {
      this.lastError = 'Token de elToque inválido o expirado. Revise el .env.';
      return null;
    }
    if (res.status === 429) {
      this.applyRetryAfter(res);
      this.lastError = 'Límite de elToque superado. Reintente en unos minutos.';
      return null;
    }
    if (!res.ok) {
      this.lastError = 'Fuente informal no disponible.';
      return null;
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      this.lastError = 'Respuesta inesperada de la fuente informal.';
      return null;
    }
    if (!isElToqueResponse(json as ElToqueRawResponse)) {
      this.lastError = 'Respuesta inesperada de la fuente informal.';
      return null;
    }
    const fetchedAt = new Date().toISOString();
    const rates = mapElToqueToRates(json as ElToqueRawResponse, fetchedAt);
    if (rates.length === 0) {
      this.lastError = 'Sin tasas informales para esa fecha.';
      return null;
    }
    // OJO: la API responde siempre con `date: hoy` aunque se pida otro día;
    // la fecha válida es la pedida, si no cada día sobrescribe al anterior.
    const stamped = rates.map((r) => ({ ...r, date: day }));
    return { date: day, rates: stamped, fetchedAt };
  }

  private applyRetryAfter(res: Response): void {
    const raw = res.headers.get('Retry-After') ?? res.headers.get('retry-after');
    const secs = raw ? Number.parseInt(raw, 10) : 60;
    const wait = Number.isFinite(secs) && secs > 0 ? Math.min(secs, 600) : 60;
    this.retryAfterUntil = Date.now() + wait * 1000;
  }

  private isTimeoutError(e: unknown): boolean {
    return this.timedOutFlag && (e as Error)?.name === 'AbortError';
  }

  private timedOutFlag = false;

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    signal?: AbortSignal,
  ): Promise<Response | null> {
    const controller = new AbortController();
    this.timedOutFlag = false;
    const timer = setTimeout(() => {
      this.timedOutFlag = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    const onAbort = () => controller.abort();
    try {
      if (signal?.aborted) return null;
      signal?.addEventListener('abort', onAbort, { once: true });
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.inflight.clear();
    this.retryAfterUntil = 0;
  }
}

export const elToqueClient = new ElToqueClient();
