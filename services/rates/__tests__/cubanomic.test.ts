// Verifica la fuente cubanomic (widget público de elToque): ventana diaria
// 07:00→07:00, valor publicado por el widget (mediana con ofertas suficientes,
// EMA si la serie es flaca), header Origin obligatorio, sin key ni VPN, las
// series extra (CAD, Clásica y el dólar vía Zelle), la vista "tiempo real" y el
// fallback al trmi directo con la key opcional.

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: (k: string) => Promise.resolve(store.get(k) ?? null),
      setItem: (k: string, v: string) => {
        store.set(k, v);
        return Promise.resolve();
      },
      removeItem: (k: string) => {
        store.delete(k);
        return Promise.resolve();
      },
    },
  };
});

import {
  isCubanomicXRates,
  mapCubanomicToRates,
  mapCubanomicZelleToRate,
  type ElToqueRate,
} from '../types';

const dayISO = (back: number) =>
  new Date(Date.now() - back * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

/**
 * Estadística de cubanomic. `count` manda en la regla publicada: con
 * count_values >= 50 elToque publica la mediana; por debajo, la EMA.
 * `ema` es opcional y por defecto igual a la mediana, para que los casos que no
 * prueban la regla queden neutros (la API real siempre trae `ema_value`).
 */
const stat = (median: number, avg: number, count: number, ema?: number) => ({
  median,
  avg,
  ema_value: ema ?? median,
  count_messages: count,
  count_values: count,
});

const stats = (usd: number, count: number) => ({
  USD: stat(usd, usd - 5, count),
  MLC: stat(500, 505, count),
  ECU: stat(800, 810, count),
  BTC: stat(700, 700, count),
  TRX: stat(250, 250, count),
  USDT_TRC20: stat(900, 900, count),
});

/** Series que solo publica cubanomic (no vienen en el trmi directo). */
const extraStats = (count: number) => ({
  CAD: stat(500, 500, count),
  CLA: stat(760, 755, count),
});

/** Respuesta real de cubanomic: `date` es SIEMPRE hoy, no el día pedido. */
const cuboPayload = (usd: number, count = 10) => ({
  date: dayISO(0),
  hour: 10,
  minutes: 0,
  seconds: 0,
  statistics: stats(usd, count),
});

/** Serie del dólar pagado por Zelle: clave única `USD_Zelle.CUP`. */
const zellePayload = (median: number, count: number, ema?: number) => ({
  date: dayISO(0),
  hour: 10,
  minutes: 0,
  seconds: 0,
  statistics: {
    'USD_Zelle.CUP': stat(median, median - 2, count, ema),
  },
});

/** Respuesta del trmi directo (respaldo con key). */
const trmiPayload = (usd: number) => ({
  date: dayISO(0),
  hour: 10,
  minutes: 0,
  seconds: 0,
  tasas: { USD: usd, MLC: 500, ECU: 800, BTC: 700, TRX: 250, USDT_TRC20: 900 },
});

type RouteResult = { status: number; body?: unknown } | { reject: true };

interface Request {
  url: string;
  headers: Record<string, string>;
}

function installFetch(routes: {
  cubanomic?: (day: string) => RouteResult;
  zelle?: (day: string) => RouteResult;
  direct?: (day: string) => RouteResult;
}): Request[] {
  const requests: Request[] = [];
  global.fetch = jest.fn(async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    requests.push({ url: u, headers });
    const m = u.match(/date_from=([^&]*)/);
    const day = m ? decodeURIComponent(m[1]).split(' ')[0] : 'unknown';
    const isZelle = u.includes('x-rates-filter-by-pm');
    const isCubo = u.includes('api.cubanomic.com');
    const handler = isZelle ? routes.zelle : isCubo ? routes.cubanomic : routes.direct;
    const h: RouteResult = handler ? handler(day) : { status: 404, body: {} };
    if ('reject' in h) throw new Error('Network request failed');
    return {
      status: h.status,
      ok: h.status >= 200 && h.status < 300,
      headers: { get: () => null },
      json: async () => h.body,
    };
  }) as unknown as typeof fetch;
  return requests;
}

/** La key es opcional: sin ella solo cubanomic puede responder. */
function setKey(present: boolean) {
  if (present) process.env.EXPO_PUBLIC_ELTOQUE_API_KEY = 'test-key-para-jest-1234567890';
  else delete process.env.EXPO_PUBLIC_ELTOQUE_API_KEY;
}

/** Módulos frescos (memoria limpia) + key según el caso. */
function freshClient(withKey: boolean) {
  jest.resetModules();
  setKey(withKey);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../eltoque-client');
  return new mod.ElToqueClient();
}

/** Nuevo cliente sobre el MISMO registro (conserva lo persistido). */
function sameRegistryClient(withKey: boolean) {
  setKey(withKey);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../eltoque-client');
  return new mod.ElToqueClient();
}

const usdValue = (rates: { code: string; value: number }[]) =>
  rates.find((r) => r.code === 'USD')?.value;
const cuboRequest = (requests: Request[]) =>
  requests.find((r) => r.url.includes('api.cubanomic.com') && !r.url.includes('x-rates-filter-by-pm'));
const zelleRequest = (requests: Request[]) =>
  requests.find((r) => r.url.includes('x-rates-filter-by-pm'));
const directRequest = (requests: Request[]) =>
  requests.find((r) => r.url.includes('tasas.eltoque.com'));

describe('mapCubanomicToRates', () => {
  test('normaliza ECU a EUR, fecha el día pedido y mapea el TRMI del widget', () => {
    const rates = mapCubanomicToRates(cuboPayload(785) as never, '2026-10-17', 'x');
    expect(rates).toHaveLength(6);
    expect(usdValue(rates)).toBe(785);
    expect(rates.find((r) => r.code === 'EUR')?.value).toBe(800);
    expect(rates.find((r) => (r.code as string) === 'ECU')).toBeUndefined();
    // La API responde date:hoy; la fecha válida es la pedida.
    expect(rates.every((r) => r.date === '2026-10-17')).toBe(true);
  });

  test('incluye las series extra de cubanomic (CAD y Clásica) con actividad', () => {
    const raw = {
      ...cuboPayload(815),
      statistics: { ...stats(815, 10), ...extraStats(10) },
    };
    const rates = mapCubanomicToRates(raw as never, '2026-10-17', 'x');
    expect(rates.map((r) => r.code)).toEqual([
      'USD',
      'MLC',
      'EUR',
      'CAD',
      'CLA',
      'BTC',
      'TRX',
      'USDT_TRC20',
    ]);
    expect(rates.find((r) => r.code === 'CLA')?.name).toBe('Clásica');
    expect(rates.find((r) => r.code === 'CAD')?.value).toBe(500);
  });

  test('cae a la media si faltan la mediana y la EMA', () => {
    const raw = cuboPayload(785);
    const usd = raw.statistics.USD as { median: number | null; ema_value: number | null };
    usd.median = null;
    usd.ema_value = null;
    const rates = mapCubanomicToRates(raw as never, '2026-10-17', 'x');
    expect(usdValue(rates)).toBe(780);
  });

  test('descarta monedas sin mensajes salvo allowEmpty (ventana vigente)', () => {
    const raw = cuboPayload(785, 0);
    expect(mapCubanomicToRates(raw as never, '2026-10-17', 'x')).toEqual([]);
    // Hoy sí se acepta: cubanomic devuelve la mediana arrastrada.
    const today = mapCubanomicToRates(raw as never, '2026-10-17', 'x', true);
    expect(usdValue(today)).toBe(785);
  });

  test('rechaza payloads mal formados (fail-closed)', () => {
    expect(isCubanomicXRates(null)).toBe(false);
    expect(isCubanomicXRates({ date: '2026-10-17', hour: 1, minutes: 1 })).toBe(false);
    // El guard de elToque no acepta la forma de cubanomic ni viceversa.
    expect(isCubanomicXRates(trmiPayload(780) as never)).toBe(false);
    expect(mapCubanomicToRates(null as never, 'x', 'y')).toEqual([]);
  });
});

// La web del widget (iframe.cubanomic.com) publica la mediana cuando la serie
// tiene ofertas suficientes y la EMA cuando es flaca. La app debe mostrar la
// misma cifra: mismos números que la tabla de la web en ambos casos.
describe('regla de valor publicado (mediana vs EMA)', () => {
  const oneStat = (usd: Record<string, unknown>) => ({
    date: dayISO(0),
    hour: 10,
    minutes: 0,
    seconds: 0,
    statistics: { USD: usd },
  });
  const value = (usd: Record<string, unknown>) =>
    usdValue(mapCubanomicToRates(oneStat(usd) as never, dayISO(0), 'x'));

  test('serie con ofertas suficientes (>= 50) publica la mediana, no la EMA', () => {
    expect(value({ median: 815, avg: 814.15, ema_value: 803.34, count_messages: 325, count_values: 333 })).toBe(815);
  });

  test('justo en el umbral (50 ofertas) sigue siendo mediana', () => {
    expect(value({ median: 810, avg: 811.61, ema_value: 799.46, count_messages: 50, count_values: 50 })).toBe(810);
  });

  test('serie flaca (< 50 ofertas) publica la EMA, no la mediana', () => {
    // MLC real: 13 ofertas. La web muestra 569.83 (EMA), no 565 (mediana).
    expect(value({ median: 565, avg: 565, ema_value: 569.83, count_messages: 13, count_values: 13 })).toBe(569.83);
  });

  test('serie flaca sin EMA cae a la mediana (no se pierde la tarjeta)', () => {
    expect(value({ median: 535, avg: 548.57, count_messages: 7, count_values: 7 })).toBe(535);
  });

  test('sin count_values se trata como flaca (EMA), igual que el widget', () => {
    // El widget compara `count_values >= 50`: un campo ausente no la cumple.
    expect(value({ median: 500, avg: 500, ema_value: 517.48, count_messages: 1 })).toBe(517.48);
  });

  test('la misma regla aplica al dólar vía Zelle', () => {
    const raw = {
      date: dayISO(0),
      hour: 10,
      minutes: 0,
      seconds: 0,
      statistics: {
        'USD_Zelle.CUP': {
          median: 795,
          avg: 793,
          ema_value: 805,
          count_messages: 4,
          count_values: 9,
        },
      },
    };
    expect(mapCubanomicZelleToRate(raw as never, dayISO(0), 'x')?.value).toBe(805);
  });
});

describe('mapCubanomicZelleToRate', () => {
  test('mapea USD_Zelle.CUP al código ZELLE con el día pedido', () => {
    const rate = mapCubanomicZelleToRate(zellePayload(795, 4) as never, '2026-10-17', 'x');
    expect(rate).toMatchObject({
      code: 'ZELLE',
      value: 795,
      source: 'ELTOQUE',
      date: '2026-10-17',
    });
    expect(rate?.name).toBe('Dólar vía Zelle');
  });

  test('respeta el gate de actividad salvo allowEmpty (ventana vigente)', () => {
    expect(mapCubanomicZelleToRate(zellePayload(795, 0) as never, '2026-10-17', 'x')).toBeNull();
    expect(
      mapCubanomicZelleToRate(zellePayload(795, 0) as never, '2026-10-17', 'x', true)?.value,
    ).toBe(795);
  });

  test('fail-closed si la serie no viene o el payload es inválido', () => {
    // El TRMI normal no trae la clave de Zelle.
    expect(mapCubanomicZelleToRate(cuboPayload(785) as never, '2026-10-17', 'x')).toBeNull();
    expect(mapCubanomicZelleToRate(null as never, 'x', 'y')).toBeNull();
  });
});

describe('ElToqueClient vía cubanomic', () => {
  test('pide la ventana 07:00→07:00 del día con el Origin del widget', async () => {
    const requests = installFetch({ cubanomic: () => ({ status: 200, body: cuboPayload(785) }) });
    const client = freshClient(false);
    const res = await client.getDaily('2026-10-17');
    expect(res.ok).toBe(true);
    expect(res.data?.date).toBe('2026-10-17');
    expect(usdValue(res.data!.rates)).toBe(785);
    const req = cuboRequest(requests)!;
    expect(req.url).toContain('date_from=2026-10-17%2007%3A00%3A00');
    expect(req.url).toContain('date_to=2026-10-18%2007%3A00%3A00');
    // El token del widget va en la query (no se aserta su valor para no
    // duplicar el literal: se rota junto con la constante del cliente).
    expect(req.url).toMatch(/[?&]token=[A-Za-z0-9_-]+/);
    expect(req.headers.Origin).toBe('https://iframe.cubanomic.com');
    // Sin key no se toca el trmi directo.
    expect(directRequest(requests)).toBeUndefined();
    // Día histórico: no se pide la serie de Zelle (solo ventana vigente).
    expect(zelleRequest(requests)).toBeUndefined();
  });

  test('la ventana vigente añade el dólar vía Zelle desde el endpoint filtrado', async () => {
    const requests = installFetch({
      cubanomic: () => ({ status: 200, body: cuboPayload(815) }),
      zelle: () => ({ status: 200, body: zellePayload(795, 4) }),
    });
    const client = freshClient(false);
    const res = await client.getDaily(dayISO(0));
    expect(res.ok).toBe(true);
    expect(res.data?.date).toBe(dayISO(0));
    // La serie de Zelle se suma al final del mismo día.
    const zelle = res.data!.rates.find((r: ElToqueRate) => r.code === 'ZELLE');
    expect(zelle?.value).toBe(795);
    expect(zelle?.date).toBe(dayISO(0));
    expect(res.data!.rates).toHaveLength(7);
    // Orden de presentación: Zelle va al final (llega por un endpoint aparte).
    const codes = res.data!.rates.map((r: ElToqueRate) => r.code);
    expect(codes[codes.length - 1]).toBe('ZELLE');

    const req = zelleRequest(requests)!;
    expect(req.url).toContain('/api/v2/x-rates-filter-by-pm');
    expect(req.url).toContain('payment_method=Zelle');
    expect(req.url).toContain('x_cur=CUP');
    expect(req.url).toMatch(/date_from=[^&]*%2007%3A00%3A00/);
    expect(req.url).toMatch(/date_to=[^&]*%2007%3A00%3A00/);
    expect(req.url).toMatch(/[?&]token=[A-Za-z0-9_-]+/);
    expect(req.headers.Origin).toBe('https://iframe.cubanomic.com');
  });

  test('si Zelle falla, el día se sirve igual sin esa tarjeta', async () => {
    installFetch({
      cubanomic: () => ({ status: 200, body: cuboPayload(815) }),
      zelle: () => ({ status: 500, body: {} }),
    });
    const client = freshClient(false);
    const res = await client.getDaily(dayISO(0));
    expect(res.ok).toBe(true);
    expect(res.data!.rates).toHaveLength(6);
    expect(res.data!.rates.find((r: ElToqueRate) => r.code === 'ZELLE')).toBeUndefined();
  });

  test('un fallo de red del extra de Zelle no rompe el día', async () => {
    installFetch({
      cubanomic: () => ({ status: 200, body: cuboPayload(815) }),
      zelle: () => ({ reject: true }),
    });
    const client = freshClient(false);
    const res = await client.getDaily(dayISO(0));
    expect(res.ok).toBe(true);
    expect(usdValue(res.data!.rates)).toBe(815);
    expect(res.data!.rates.find((r: ElToqueRate) => r.code === 'ZELLE')).toBeUndefined();
  });

  test('un 429 del extra de Zelle lo enfría sin tocar el hop principal', async () => {
    const requests = installFetch({
      cubanomic: () => ({ status: 200, body: cuboPayload(815) }),
      zelle: () => ({ status: 429, body: {} }),
    });
    const client = freshClient(false);
    const first = await client.getDaily(dayISO(0));
    expect(first.ok).toBe(true);
    expect(usdValue(first.data!.rates)).toBe(815);
    // Refresh con forceRefresh: el hop principal se repite, el extra no.
    await client.getDaily(dayISO(0), { forceRefresh: true });
    expect(requests.filter((r) => r.url.includes('x-rates-filter-by-pm'))).toHaveLength(1);
    expect(requests.filter((r) => r.url.includes('api.cubanomic.com'))).toHaveLength(3);
  });

  test('rechaza una fecha sintácticamente válida pero no calendárica', async () => {
    const requests = installFetch({ cubanomic: () => ({ status: 200, body: cuboPayload(785) }) });
    const client = freshClient(false);
    const res = await client.getDaily('2026-13-45');
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/Fecha inválida/);
    expect(requests).toHaveLength(0);
  });

  test('un 429 del widget activa un enfriamiento propio (no se insiste)', async () => {
    const requests = installFetch({ cubanomic: () => ({ status: 429, body: {} }) });
    const client = freshClient(false);
    await client.getDaily(dayISO(1));
    // Refresh posterior de otro día: no vuelve a golpear el token compartido
    // (puede servir stale guardado, pero sin nueva petición al widget).
    await client.getDaily(dayISO(2), { forceRefresh: true });
    expect(requests.filter((r) => r.url.includes('api.cubanomic.com'))).toHaveLength(1);
  });

  test('un 401 del widget cae al trmi directo con la key', async () => {
    const requests = installFetch({
      cubanomic: () => ({ status: 401, body: { message: 'Invalid token' } }),
      direct: () => ({ status: 200, body: trmiPayload(790) }),
    });
    const client = freshClient(true);
    const res = await client.getDaily('2026-10-17');
    expect(res.ok).toBe(true);
    expect(usdValue(res.data!.rates)).toBe(790);
    expect(cuboRequest(requests)).toBeDefined();
    expect(directRequest(requests)).toBeDefined();
  });

  test('una ventana histórica sin mensajes no inventa tasa', async () => {
    installFetch({ cubanomic: () => ({ status: 200, body: cuboPayload(785, 0) }) });
    const client = freshClient(false);
    const res = await client.getDaily(dayISO(3));
    expect(res.ok).toBe(false);
    expect(res.status).toBe(200);
  });

  test('sin red y sin key queda bloqueado (blocked, sin status)', async () => {
    installFetch({ cubanomic: () => ({ reject: true }) });
    const client = freshClient(false);
    const res = await client.getDaily(dayISO(3));
    expect(res.ok).toBe(false);
    expect(res.blocked).toBe(true);
    expect(res.status).toBeNull();
  });

  test('sin red y sin key sirve lo guardado como stale', async () => {
    // 1ª sesión: cubanomic cae, el directo responde y se persiste.
    installFetch({
      cubanomic: () => ({ reject: true }),
      direct: () => ({ status: 200, body: trmiPayload(780) }),
    });
    const seeder = freshClient(true);
    expect((await seeder.getDaily(dayISO(0))).ok).toBe(true);

    // 2ª sesión sobre la misma persistencia: red caída y sin key.
    installFetch({ cubanomic: () => ({ reject: true }) });
    const client = sameRegistryClient(false);
    const res = await client.getDaily(dayISO(0));
    expect(res.ok).toBe(true);
    expect(res.data?.stale).toBe(true);
    expect(usdValue(res.data!.rates)).toBe(780);
  }, 30000);

  test('un 401 del widget no sirve datos stale', async () => {
    // Semilla: un día válido persistido para que exista stale disponible.
    installFetch({
      cubanomic: () => ({ reject: true }),
      direct: () => ({ status: 200, body: trmiPayload(781) }),
    });
    const seeder = freshClient(true);
    expect((await seeder.getDaily(dayISO(0))).ok).toBe(true);

    installFetch({ cubanomic: () => ({ status: 401, body: { message: 'Invalid token' } }) });
    const client = sameRegistryClient(false);
    const res = await client.getDaily(dayISO(0));
    expect(res.ok).toBe(false);
    expect(res.blocked).toBe(false);
    expect(res.status).toBe(401);
  }, 30000);
});

// La tarjeta "Tiempo Real" del widget pide la API sin fechas (valor vivo) y su
// Zelle también va sin fechas. Verificado contra iframe.cubanomic.com.
describe('ElToqueClient tiempo real', () => {
  test('pide la vista viva sin fechas y añade la Zelle sin fechas', async () => {
    const requests = installFetch({
      cubanomic: () => ({ status: 200, body: cuboPayload(815) }),
      zelle: () => ({ status: 200, body: zellePayload(805, 9, 779.08) }),
    });
    const client = freshClient(false);
    const res = await client.getRealtime();
    expect(res.ok).toBe(true);
    expect(res.data?.realtime).toBe(true);
    expect(usdValue(res.data!.rates)).toBe(815);
    const req = cuboRequest(requests)!;
    expect(req.url).toContain('msg=false');
    expect(req.url).not.toContain('date_from');
    expect(req.url).not.toContain('date_to');
    expect(req.url).toMatch(/[?&]token=[A-Za-z0-9_-]+/);
    expect(req.headers.Origin).toBe('https://iframe.cubanomic.com');
    // El widget pide la Zelle siempre sin fechas, también en tiempo real.
    const z = zelleRequest(requests)!;
    expect(z.url).not.toContain('date_from');
    expect(z.url).toContain('payment_method=Zelle');
    expect(z.headers.Origin).toBe('https://iframe.cubanomic.com');
    // La Zelle flaca (9 ofertas) publica su EMA, no la mediana.
    const zelle = res.data!.rates.find((r: ElToqueRate) => r.code === 'ZELLE');
    expect(zelle?.value).toBe(779.08);
  });

  test('aplica la regla mediana/EMA igual que el widget', async () => {
    const body = {
      date: dayISO(0),
      hour: 10,
      minutes: 0,
      seconds: 0,
      statistics: {
        USD: stat(815, 814.15, 333), // gruesa -> mediana
        MLC: stat(550, 550, 12, 563.53), // flaca -> EMA
      },
    };
    installFetch({
      cubanomic: () => ({ status: 200, body }),
      zelle: () => ({ status: 500, body: {} }),
    });
    const client = freshClient(false);
    const res = await client.getRealtime();
    expect(res.ok).toBe(true);
    expect(usdValue(res.data!.rates)).toBe(815);
    expect(res.data!.rates.find((r: ElToqueRate) => r.code === 'MLC')?.value).toBe(563.53);
  });

  test('la vista viva no se persiste (el histórico es de días publicados)', async () => {
    installFetch({
      cubanomic: () => ({ status: 200, body: cuboPayload(815) }),
      zelle: () => ({ status: 200, body: zellePayload(805, 9) }),
    });
    jest.resetModules();
    setKey(false);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../eltoque-client');
    const client = new mod.ElToqueClient();
    expect((await client.getRealtime()).ok).toBe(true);
    expect(await mod.loadElToqueLocalHistory()).toEqual([]);
  });

  test('cachea la vista viva y forceRefresh la vuelve a pedir', async () => {
    const requests = installFetch({
      cubanomic: () => ({ status: 200, body: cuboPayload(815) }),
      zelle: () => ({ status: 200, body: zellePayload(805, 9) }),
    });
    const client = freshClient(false);
    await client.getRealtime();
    await client.getRealtime();
    // Una sola pasada: principal + Zelle (la 2ª llamada sale de caché).
    expect(requests.filter((r) => r.url.includes('api.cubanomic.com'))).toHaveLength(2);
    await client.getRealtime({ forceRefresh: true });
    expect(requests.filter((r) => r.url.includes('api.cubanomic.com'))).toHaveLength(4);
  });

  test('sin red queda bloqueada y sin datos guardados que servir', async () => {
    installFetch({ cubanomic: () => ({ reject: true }) });
    const client = freshClient(false);
    const res = await client.getRealtime();
    expect(res.ok).toBe(false);
    expect(res.blocked).toBe(true);
    expect(res.status).toBeNull();
  });
});
