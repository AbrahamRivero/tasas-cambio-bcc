// Verifica la fuente cubanomic (widget público de elToque): ventana diaria
// 07:00→07:00, mediana como valor, header Origin obligatorio, sin key ni VPN,
// y el fallback al trmi directo con la key opcional.

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

import { isCubanomicXRates, mapCubanomicToRates } from '../types';

const dayISO = (back: number) =>
  new Date(Date.now() - back * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const stats = (usd: number, count: number) => ({
  USD: { median: usd, avg: usd - 5, count_messages: count, count_values: count },
  MLC: { median: 500, avg: 505, count_messages: count, count_values: count },
  ECU: { median: 800, avg: 810, count_messages: count, count_values: count },
  BTC: { median: 700, avg: 700, count_messages: count, count_values: count },
  TRX: { median: 250, avg: 250, count_messages: count, count_values: count },
  USDT_TRC20: { median: 900, avg: 900, count_messages: count, count_values: count },
});

/** Respuesta real de cubanomic: `date` es SIEMPRE hoy, no el día pedido. */
const cuboPayload = (usd: number, count = 10) => ({
  date: dayISO(0),
  hour: 10,
  minutes: 0,
  seconds: 0,
  statistics: stats(usd, count),
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
  direct?: (day: string) => RouteResult;
}): Request[] {
  const requests: Request[] = [];
  global.fetch = jest.fn(async (url: unknown, init?: RequestInit) => {
    const u = String(url);
    const headers = (init?.headers ?? {}) as Record<string, string>;
    requests.push({ url: u, headers });
    const m = u.match(/date_from=([^&]*)/);
    const day = m ? decodeURIComponent(m[1]).split(' ')[0] : 'unknown';
    const isCubo = u.includes('api.cubanomic.com');
    const handler = isCubo ? routes.cubanomic : routes.direct;
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
  requests.find((r) => r.url.includes('api.cubanomic.com'));
const directRequest = (requests: Request[]) =>
  requests.find((r) => r.url.includes('tasas.eltoque.com'));

describe('mapCubanomicToRates', () => {
  test('usa la mediana como valor, normaliza ECU a EUR y fecha el día pedido', () => {
    const rates = mapCubanomicToRates(cuboPayload(785) as never, '2026-10-17', 'x');
    expect(rates).toHaveLength(6);
    expect(usdValue(rates)).toBe(785);
    expect(rates.find((r) => r.code === 'EUR')?.value).toBe(800);
    expect(rates.find((r) => (r.code as string) === 'ECU')).toBeUndefined();
    // La API responde date:hoy; la fecha válida es la pedida.
    expect(rates.every((r) => r.date === '2026-10-17')).toBe(true);
  });

  test('cae a la media si falta la mediana', () => {
    const raw = cuboPayload(785);
    (raw.statistics.USD as { median: number | null }).median = null;
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
