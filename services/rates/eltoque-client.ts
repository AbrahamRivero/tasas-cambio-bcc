// Cliente elToque (informal / calle) en modo directo, sin backend.
// Cadena de fuentes: proxy (opcional) → cubanomic (el widget de elToque en
// iframe.cubanomic.com; sin key, misma TRMI) → trmi directo con
// EXPO_PUBLIC_ELTOQUE_API_KEY como respaldo.
// cubanomic publica además series que el TRMI directo no trae (CAD, Clásica,
// dólar vía Zelle): se mapean solo las monedas de la lista blanca de types.ts.
// El hop de proxy y el trmi directo sirven el juego del TRMI (sin CAD/CLA/Zelle).
// Además del día publicado (getDaily, ventana 07:00→07:00) existe la vista
// "tiempo real" (getRealtime, sin fechas), la tarjeta viva del widget; esa solo
// la sirve cubanomic y no se persiste.

import { TtlCache, TTL_ELTOQUE_MS, TTL_ELTOQUE_REALTIME_MS } from './cache';
import { storageGet, storageSet } from './storage';
import {
  isCubanomicXRates,
  isElToqueResponse,
  mapCubanomicToRates,
  mapCubanomicZelleToRate,
  mapElToqueToRates,
  type ElToqueDaily,
  type ElToqueRate,
} from './types';

const STORAGE_KEY = 'eltoque:daily:latest';
const HISTORY_KEY = 'eltoque:daily:history';
const HISTORY_CAP = 30;
/** Clave de caché de la vista "tiempo real" (no se persiste como el publicado). */
const REALTIME_CACHE_KEY = 'realtime';

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
// La serie del dólar pagado por Zelle no está en el TRMI: vive en un endpoint
// aparte (solo v2) filtrado por método de pago.
const CUBANOMIC_ZELLE_HOST = 'https://api.cubanomic.com/api/v2/x-rates-filter-by-pm';
const CUBANOMIC_ZELLE_PAYMENT_METHOD = 'Zelle';
const CUBANOMIC_ZELLE_X_CUR = 'CUP';
const CUBANOMIC_ORIGIN = 'https://iframe.cubanomic.com';
const CUBANOMIC_TOKEN = 'hRaCcY78gXC3k9WRv01pR7V1fgSxlg';
const CUBANOMIC_HEADERS = {
  accept: 'application/json, text/plain, */*',
  Origin: CUBANOMIC_ORIGIN,
};
const CUBANOMIC_TIMEOUT_MS = 10 * 1000;
// El extra de Zelle es opcional y no debe retrasar las series principales:
// va secuencial y con un timeout corto (ver fetchCubanomicSnapshot).
const CUBANOMIC_ZELLE_TIMEOUT_MS = 2500;
// La ventana diaria de elToque va de las 07:00 a las 07:00 del día siguiente.
const CUBANOMIC_WINDOW_START = '07:00:00';
// Enfriamiento propio del widget ante 429: el token es compartido, así que no
// conviene insistir en cada refresh (ni siquiera con forceRefresh).
const CUBANOMIC_BACKOFF_DEFAULT_S = 60;
const CUBANOMIC_BACKOFF_MAX_S = 600;
// Enfriamiento corto y SEPARADO para el extra de Zelle: si ese endpoint falla
// se omite la tarjeta sin tocar el hop principal (que ya sirvió la tasa).
const CUBANOMIC_ZELLE_BACKOFF_DEFAULT_S = 300;
const CUBANOMIC_ZELLE_BACKOFF_MAX_S = 900;

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

/**
 * Query común de cubanomic. Con `day` pide la ventana publicada 07:00→07:00;
 * con `null` pide el **tiempo real** (sin fechas), la vista viva del widget
 * (`?real_time=true`), que es un valor rodante y no está alineado a las 07:00.
 */
function cubanomicQuery(day: string | null): string {
  const base = `msg=false&token=${encodeURIComponent(CUBANOMIC_TOKEN)}`;
  if (!day) return base;
  return (
    `${base}` +
    `&date_from=${encodeURIComponent(`${day} ${CUBANOMIC_WINDOW_START}`)}` +
    `&date_to=${encodeURIComponent(`${nextIsoDay(day)} ${CUBANOMIC_WINDOW_START}`)}`
  );
}

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
  /** Vista "tiempo real" del widget: valor vivo, TTL corto y sin histórico. */
  private realtimeCache = new TtlCache<ElToqueDaily>(TTL_ELTOQUE_REALTIME_MS);
  private inflight = new Map<string, Promise<ElToqueDaily | null>>();
  private retryAfterUntil = 0;
  /** Enfriamiento propio del hop cubanomic (token compartido: no insistir). */
  private cubanomicBackoffUntil = 0;
  /** Enfriamiento del extra de Zelle: opcional, no debe penalizar al hop principal. */
  private cubanomicZelleBackoffUntil = 0;
  /** Fallos recientes por día (caché negativa 60s: evita quemar la cuota reintentando). */
  private failCache = new Map<string, { ts: number; error: string; status: number | null }>();

  /**
   * Andamiaje común de caché: valor vigente, fallo reciente (60s) o petición en
   * vuelo. `null` significa que hay que ir a la red. `cache` permite usar la
   * caché de vida corta de la vista "tiempo real" sin duplicar la lógica.
   */
  private async cachedOrInflight(
    key: string,
    cache: TtlCache<ElToqueDaily> = this.cache,
  ): Promise<ElToqueResult | null> {
    const hit = cache.get(key);
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
    return null;
  }

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
    if (options?.forceRefresh) {
      this.cache.clear(key);
      this.inflight.delete(key);
    } else {
      const cached = await this.cachedOrInflight(key);
      if (cached) return cached;
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
   * Tiempo real: el valor vivo que pinta la tarjeta del widget (sin ventana,
   * `?real_time=true`). Es lo que se ve en iframe.cubanomic.com cuando el
   * interruptor "Tiempo Real" está activo. No se persiste ni entra en el
   * histórico: el día cerrado es competencia de getDaily.
   */
  async getRealtime(options?: ElToqueRequestOptions): Promise<ElToqueResult> {
    const key = REALTIME_CACHE_KEY;
    if (options?.forceRefresh) {
      this.realtimeCache.clear(key);
      this.inflight.delete(key);
    } else {
      const cached = await this.cachedOrInflight(key, this.realtimeCache);
      if (cached) return cached;
    }

    const p = this.fetchRealtime(options?.signal);
    this.inflight.set(key, p);
    try {
      const data = await p;
      if (data) {
        this.realtimeCache.set(key, data);
        this.failCache.delete(key);
        return { ok: true, data };
      }
      const err = this.lastError ?? 'No se pudo cargar la tasa informal.';
      const status = this.lastStatus ?? null;
      this.failCache.set(key, { ts: Date.now(), error: err, status });
      // Sin respaldo que servir en tiempo real: no hay stale (el guardado es
      // siempre un día publicado, no una vista viva).
      return { ok: false, data: null, error: err, blocked: this.lastNetKind !== null, status };
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
      const viaCubanomic = await this.fetchCubanomicSnapshot(day, options?.signal);
      if (viaCubanomic) return viaCubanomic;
    }
    const key = getApiKey(options?.apiKey);
    // Sin key no hay respaldo directo: se conserva el diagnóstico de cubanomic
    // (su 401/429/sin red es el error real, no "falta la key").
    if (!key) return null;
    return this.fetchDirect(day, key, options);
  }

  /**
   * Vista "tiempo real" del widget (`?real_time=true`): sin fechas, un valor
   * rodante que no se corta a las 07:00. Solo la sirve el widget: ni el proxy
   * ni el trmi directo publican una vista viva, así que no hay respaldo.
   */
  private async fetchRealtime(signal?: AbortSignal): Promise<ElToqueDaily | null> {
    this.lastError = undefined;
    this.lastStatus = undefined;
    this.lastNetKind = null;
    if (Date.now() < this.cubanomicBackoffUntil) {
      this.lastStatus = 429;
      this.lastError = 'Límite de la fuente informal. Reintente en unos minutos.';
      return null;
    }
    return this.fetchCubanomicSnapshot(null, signal);
  }

  /**
   * cubanomic (widget público de elToque): mismo TRMI, sin key ni VPN.
   * `day` pide la ventana publicada `day 07:00:00` → `day+1 07:00:00` (fin de
   * ventana = el día que elToque publica como TRMI); `null` pide el tiempo real
   * (sin fechas), la tarjeta viva del widget. El valor de cada serie es el que
   * publica el widget: mediana si hay ofertas suficientes, EMA si es flaca.
   * A la vista vigente se le suma la serie del canal Zelle (ver
   * fetchCubanomicZelle).
   */
  private async fetchCubanomicSnapshot(
    day: string | null,
    signal?: AbortSignal,
  ): Promise<ElToqueDaily | null> {
    const realtime = day === null;
    const label = day ?? 'tiempo real';
    const logTag = realtime ? '[elToque/cubanomic/realtime]' : '[elToque/cubanomic]';
    const url = `${CUBANOMIC_HOST}?${cubanomicQuery(day)}`;
    let res: Response | null = null;
    try {
      res = await this.fetchWithTimeout(
        url,
        { headers: CUBANOMIC_HEADERS },
        signal,
        CUBANOMIC_TIMEOUT_MS,
      );
    } catch (e) {
      this.lastNetKind = this.isTimeoutError(e) ? 'timeout' : 'network';
      this.lastError =
        this.lastNetKind === 'timeout'
          ? `La fuente informal (widget) no responde (${CUBANOMIC_TIMEOUT_MS / 1000}s).`
          : 'Sin ruta a api.cubanomic.com. Pruebe datos móviles, otro wifi o VPN.';
      if (typeof __DEV__ !== 'undefined' && __DEV__ && !process.env.JEST_WORKER_ID) {
        console.log(`${logTag} ${label} -> ${this.lastNetKind}: ${(e as Error)?.message ?? e}`);
      }
      return null;
    }
    if (!res) return null;
    this.lastStatus = res.status;
    if (typeof __DEV__ !== 'undefined' && __DEV__ && !process.env.JEST_WORKER_ID) {
      console.log(`${logTag} ${label} -> HTTP ${res.status}`);
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
    // Vista viva (tiempo real) o ventana del día en curso: el widget pinta un
    // valor aunque no haya mensajes, porque cubanomic devuelve el arrastrado de
    // días previos. Nunca se acepta para el relleno de días históricos.
    const isLive = realtime || day === todayIsoDate();
    const rateDay = day ?? todayIsoDate();
    const rates = mapCubanomicToRates(json, rateDay, fetchedAt, isLive);
    if (rates.length === 0) {
      this.lastError = 'Sin tasas informales para esa fecha.';
      return null;
    }
    // La serie del dólar vía Zelle solo se pide para la vista viva: en el
    // relleno histórico duplicaría el coste (cuota limitada) sin mostrarse.
    // Va secuencial a propósito: `fetchWithTimeout` comparte `timedOutFlag` en la
    // instancia, así que dos peticiones concurrentes se pisarían ese diagnóstico.
    const zelle = isLive ? await this.fetchCubanomicZelle(day, signal) : null;
    const done: ElToqueDaily = {
      date: rateDay,
      rates: zelle ? [...rates, zelle] : rates,
      fetchedAt,
      ...(realtime ? { realtime: true } : {}),
    };
    return done;
  }

  /**
   * Serie del dólar pagado por Zelle (`x-rates-filter-by-pm`, solo v2).
   * El widget la pide SIEMPRE sin fechas (es un canal de pago con su propia
   * vista viva), así que `day` null = tiempo real y `day` = ventana del día.
   * Es un extra best-effort: si falla se omite la tarjeta sin tocar el
   * diagnóstico ni el enfriamiento del hop principal (que ya respondió bien en
   * esta misma pasada). Un timeout más corto evita retrasar las series que sí
   * llegaron por el hop principal.
   */
  private async fetchCubanomicZelle(
    day: string | null,
    signal?: AbortSignal,
  ): Promise<ElToqueRate | null> {
    if (Date.now() < this.cubanomicZelleBackoffUntil) return null;
    const url =
      `${CUBANOMIC_ZELLE_HOST}?${cubanomicQuery(day)}` +
      `&payment_method=${encodeURIComponent(CUBANOMIC_ZELLE_PAYMENT_METHOD)}` +
      `&x_cur=${encodeURIComponent(CUBANOMIC_ZELLE_X_CUR)}`;
    try {
      const res = await this.fetchWithTimeout(
        url,
        { headers: CUBANOMIC_HEADERS },
        signal,
        CUBANOMIC_ZELLE_TIMEOUT_MS,
      );
      if (!res) return null;
      if (typeof __DEV__ !== 'undefined' && __DEV__ && !process.env.JEST_WORKER_ID) {
        console.log(`[elToque/cubanomic/zelle] ${day ?? 'tiempo real'} -> HTTP ${res.status}`);
      }
      if (!res.ok) {
        // 429 o 5xx de este extra: enfriarlo sin tocar el hop principal.
        this.applyCubanomicZelleBackoff(res);
        return null;
      }
      const json: unknown = await res.json();
      // La serie de Zelle es un bloque `statistics` con una única clave.
      if (!isCubanomicXRates(json)) return null;
      // Sin mensajes cubanomic devuelve el valor arrastrado, igual que el widget
      // pinta su tarjeta: la Zelle solo se pide para la vista viva (ver arriba).
      return mapCubanomicZelleToRate(json, day ?? todayIsoDate(), new Date().toISOString(), true);
    } catch (e) {
      if (typeof __DEV__ !== 'undefined' && __DEV__ && !process.env.JEST_WORKER_ID) {
        console.log(`[elToque/cubanomic/zelle] ${day ?? 'tiempo real'} -> error: ${(e as Error)?.message ?? e}`);
      }
      // Fallo de red/timeout de un extra opcional: no repetirlo en cada refresh.
      this.applyCubanomicZelleBackoff(null);
      return null;
    }
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

  /**
   * Enfriamiento corto del extra de Zelle (honra Retry-After, tope 15 min).
   * `res` null = fallo de red/timeout: se usa el valor por defecto.
   */
  private applyCubanomicZelleBackoff(res: Response | null): void {
    const raw = res?.headers.get('Retry-After') ?? res?.headers.get('retry-after');
    const secs = raw ? Number.parseInt(raw, 10) : CUBANOMIC_ZELLE_BACKOFF_DEFAULT_S;
    const wait =
      Number.isFinite(secs) && secs > 0
        ? Math.min(secs, CUBANOMIC_ZELLE_BACKOFF_MAX_S)
        : CUBANOMIC_ZELLE_BACKOFF_DEFAULT_S;
    this.cubanomicZelleBackoffUntil = Date.now() + wait * 1000;
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
    this.realtimeCache.clear();
    this.inflight.clear();
    this.retryAfterUntil = 0;
    this.cubanomicBackoffUntil = 0;
    this.cubanomicZelleBackoffUntil = 0;
  }
}

export const elToqueClient = new ElToqueClient();
