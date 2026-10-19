// Cliente elToque (informal / calle) en modo directo, sin backend.
// Cadena de fuentes: proxy (opcional) → cubanomic (el widget de elToque en
// iframe.cubanomic.com; sin key, misma TRMI) → trmi directo con
// EXPO_PUBLIC_ELTOQUE_API_KEY como respaldo.

import { TtlCache, TTL_ELTOQUE_MS } from './cache';
import { storageGet, storageSet } from './storage';
import {
  isCubanomicXRates,
  isElToqueResponse,
  mapCubanomicToRates,
  mapElToqueToRates,
  type ElToqueDaily,
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

// cubanomic: es el backend del widget público de elToque. Sirve el MISMO TRMI
// sin API key y sin VPN. El token es público (va embebido en el bundle del
// widget) y el header Origin de iframe.cubanomic.com es obligatorio: sin él
// responde 401 {"message":"Invalid token"}.
// ROTACIÓN: si elToque cambia el token del widget, hay que tomar el nuevo del
// bundle público (iframe.cubanomic.com/js/app.*.js, parámetro `token:`),
// actualizar esta constante y publicar una release (no es configurable en runtime).
const CUBANOMIC_HOST = 'https://api.cubanomic.com/api/v1/x-rates';
const CUBANOMIC_ORIGIN = 'https://iframe.cubanomic.com';
const CUBANOMIC_TOKEN = 'hRaCcY78gXC3k9WRv01pR7V1fgSxlg';
const CUBANOMIC_TIMEOUT_MS = 10 * 1000;
// La ventana diaria de elToque va de las 07:00 a las 07:00 del día siguiente.
const CUBANOMIC_WINDOW_START = '07:00:00';
// Enfriamiento propio del widget ante 429: el token es compartido, así que no
// conviene insistir en cada refresh (ni siquiera con forceRefresh).
const CUBANOMIC_BACKOFF_DEFAULT_S = 60;
const CUBANOMIC_BACKOFF_MAX_S = 600;

/** Día ISO siguiente (fin de la ventana 07:00→07:00 de cubanomic). */
function nextIsoDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split('T')[0];
}

/** Fecha ISO existente de verdad (DATE_RE aceptaría 2026-13-45). */
function isValidIsoDay(day: string): boolean {
  if (!DATE_RE.test(day)) return false;
  const d = new Date(`${day}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().split('T')[0] === day;
}

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
      ? process.env.EXPO_PUBLIC_ELTOQUE_PROXY_URL
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
      ? (process.env.EXPO_PUBLIC_ELTOQUE_API_KEY ??
        process.env.ELTOQUE_API_KEY)
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
  /** Enfriamiento propio del hop cubanomic (token compartido: no insistir). */
  private cubanomicBackoffUntil = 0;
  /** Fallos recientes por día (caché negativa 60s: evita quemar la cuota reintentando). */
  private failCache = new Map<string, { ts: number; error: string; status: number | null }>();

  async getDaily(date?: string, options?: ElToqueRequestOptions): Promise<ElToqueResult> {
    const day = date ?? todayIsoDate();
    if (!isValidIsoDay(day)) {
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
    this.lastNetKind = null;
    const proxy = getProxyBaseUrl(options?.proxyUrl);
    if (proxy) {
      const viaProxy = await this.fetchViaProxy(proxy, day, options?.signal);
      if (viaProxy) return viaProxy;
      // El proxy solo cede ante un fallo suyo; si él mismo limitó (429), parar.
      if (this.lastStatus === 429) return null;
    }
    // El enfriamiento del widget salta ese hop (sin frenar el respaldo directo).
    if (Date.now() < this.cubanomicBackoffUntil) {
      this.lastStatus = 429;
      this.lastError = 'Límite de la fuente informal. Reintente en unos minutos.';
    } else {
      const viaCubanomic = await this.fetchViaCubanomic(day, options?.signal);
      if (viaCubanomic) return viaCubanomic;
    }
    const key = getApiKey(options?.apiKey);
    // Sin key no hay respaldo directo: se conserva el diagnóstico de cubanomic
    // (su 401/429/sin red es el error real, no "falta la key").
    if (!key) return null;
    return this.fetchDirect(day, key, options);
  }

  /**
   * cubanomic (widget público de elToque): mismo TRMI, sin key ni VPN.
   * Ventana `day 07:00:00` → `day+1 07:00:00` (fin de ventana = el día que
   * elToque publica como TRMI). El valor publicado es la mediana del día.
   */
  private async fetchViaCubanomic(day: string, signal?: AbortSignal): Promise<ElToqueDaily | null> {
    const url =
      `${CUBANOMIC_HOST}?msg=false` +
      `&date_from=${encodeURIComponent(`${day} ${CUBANOMIC_WINDOW_START}`)}` +
      `&date_to=${encodeURIComponent(`${nextIsoDay(day)} ${CUBANOMIC_WINDOW_START}`)}` +
      `&token=${encodeURIComponent(CUBANOMIC_TOKEN)}`;
    const headers = {
      accept: 'application/json, text/plain, */*',
      Origin: CUBANOMIC_ORIGIN,
    };
    let res: Response | null = null;
    try {
      res = await this.fetchWithTimeout(url, { headers }, signal, CUBANOMIC_TIMEOUT_MS);
    } catch (e) {
      this.lastNetKind = this.isTimeoutError(e) ? 'timeout' : 'network';
      this.lastError =
        this.lastNetKind === 'timeout'
          ? `La fuente informal (widget) no responde (${CUBANOMIC_TIMEOUT_MS / 1000}s).`
          : 'Sin ruta a api.cubanomic.com. Pruebe datos móviles, otro wifi o VPN.';
      if (typeof __DEV__ !== 'undefined' && __DEV__ && !process.env.JEST_WORKER_ID) {
        console.log(`[elToque/cubanomic] ${day} -> ${this.lastNetKind}: ${(e as Error)?.message ?? e}`);
      }
      return null;
    }
    if (!res) return null;
    this.lastStatus = res.status;
    if (typeof __DEV__ !== 'undefined' && __DEV__ && !process.env.JEST_WORKER_ID) {
      console.log(`[elToque/cubanomic] ${day} -> HTTP ${res.status}`);
    }
    if (res.status === 429) {
      // Límite del widget (token compartido), ajeno a nuestra key: NO activa el
      // backoff global (bloquearía también el respaldo directo) pero sí un
      // enfriamiento propio de este hop.
      this.applyCubanomicBackoff(res);
      this.lastError = 'Límite de la fuente informal. Reintente en unos minutos.';
      return null;
    }
    if (res.status === 400) {
      this.lastError = 'Rango inválido para la fuente informal.';
      return null;
    }
    if (res.status === 401) {
      this.lastError = 'Token del widget informal inválido o expirado.';
      return null;
    }
    if (!res.ok) {
      this.lastError = 'Fuente informal (widget) no disponible.';
      return null;
    }
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      this.lastError = 'Respuesta inesperada de la fuente informal.';
      return null;
    }
    if (!isCubanomicXRates(json)) {
      this.lastError = 'Respuesta inesperada de la fuente informal.';
      return null;
    }
    const fetchedAt = new Date().toISOString();
    const rates = mapCubanomicToRates(
      json,
      day,
      fetchedAt,
      // Solo la ventana vigente (hoy) puede venir sin mensajes: cubanomic
      // devuelve entonces la mediana arrastrada de días previos.
      day === todayIsoDate(),
    );
    if (rates.length === 0) {
      this.lastError = 'Sin tasas informales para esa fecha.';
      return null;
    }
    return { date: day, rates, fetchedAt };
  }

  /** Enfriamiento del hop cubanomic (honra Retry-After, tope 10 min). */
  private applyCubanomicBackoff(res: Response): void {
    const raw = res.headers.get('Retry-After') ?? res.headers.get('retry-after');
    const secs = raw ? Number.parseInt(raw, 10) : CUBANOMIC_BACKOFF_DEFAULT_S;
    const wait =
      Number.isFinite(secs) && secs > 0
        ? Math.min(secs, CUBANOMIC_BACKOFF_MAX_S)
        : CUBANOMIC_BACKOFF_DEFAULT_S;
    this.cubanomicBackoffUntil = Date.now() + wait * 1000;
  }

  private async fetchViaProxy(base: string, day: string, signal?: AbortSignal): Promise<ElToqueDaily | null> {
    try {
      const res = await this.fetchWithTimeout(
        `${base}/trmi-daily?date=${encodeURIComponent(day)}`,
        { headers: { Accept: 'application/json' } },
        signal,
      );
      if (!res) return null;
      this.lastStatus = res.status;
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

  private async fetchDirect(day: string, key: string, options?: ElToqueRequestOptions): Promise<ElToqueDaily | null> {
    this.lastRequestedDay = day;
    this.lastNetKind = null;
    // Última fuente de la cadena: su resultado manda sobre el diagnóstico previo.
    this.lastStatus = undefined;
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
    if (!isElToqueResponse(json)) {
      this.lastError = 'Respuesta inesperada de la fuente informal.';
      return null;
    }
    const fetchedAt = new Date().toISOString();
    const rates = mapElToqueToRates(json, fetchedAt, day);
    if (rates.length === 0) {
      this.lastError = 'Sin tasas informales para esa fecha.';
      return null;
    }
    return { date: day, rates, fetchedAt };
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
    timeoutMs: number = REQUEST_TIMEOUT_MS,
  ): Promise<Response | null> {
    const controller = new AbortController();
    this.timedOutFlag = false;
    const timer = setTimeout(() => {
      this.timedOutFlag = true;
      controller.abort();
    }, timeoutMs);
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
    this.cubanomicBackoffUntil = 0;
  }
}

export const elToqueClient = new ElToqueClient();
