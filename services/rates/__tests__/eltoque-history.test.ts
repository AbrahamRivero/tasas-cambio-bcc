// Verifica que el histórico elToque pide días anteriores reales
// (date_from/date_to del día pedido) y acumula la serie local.

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

const dayISO = (back: number) =>
  new Date(Date.now() - back * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

const payload = (usd: number) => ({
  // La API real responde SIEMPRE con date: hoy aunque se pida otro día.
  date: dayISO(0),
  hour: 10,
  minutes: 0,
  seconds: 0,
  tasas: { USD: usd, MLC: 500, ECU: 800, BTC: 700, TRX: 250, USDT_TRC20: 900 },
});

type Handler = (day: string) => { status: number; body?: unknown } | { reject: true };

function installFetch(handler: Handler): string[] {
  const calls: string[] = [];
  global.fetch = jest.fn(async (url: unknown) => {
    const u = String(url);
    const m = u.match(/date_from=([^&]*)/);
    const day = m ? decodeURIComponent(m[1]).split(' ')[0] : 'unknown';
    calls.push(day);
    const h = handler(day);
    if ('reject' in h) throw new Error('Network request failed');
    return {
      status: h.status,
      ok: h.status >= 200 && h.status < 300,
      headers: { get: () => null },
      json: async () => h.body,
    };
  }) as unknown as typeof fetch;
  return calls;
}

/** Módulos frescos (memoria y store limpios) + fetch mockeado por día. */
function freshClient(handler: Handler) {
  jest.resetModules();
  process.env.EXPO_PUBLIC_ELTOQUE_API_KEY = 'test-key-para-jest-1234567890';
  const calls = installFetch(handler);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../eltoque-client');
  return { calls, client: new mod.ElToqueClient(), loadElToqueLocalHistory: mod.loadElToqueLocalHistory };
}

/** Nuevo cliente sobre el MISMO registro (conserva lo persistido, memoria limpia). */
function sameRegistryClient(handler: Handler) {
  const calls = installFetch(handler);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('../eltoque-client');
  return { calls, client: new mod.ElToqueClient() };
}

test('pide días anteriores uno por uno y acumula la serie', async () => {
  const { calls, client, loadElToqueLocalHistory } = freshClient((day) =>
    day === dayISO(3)
      ? { status: 422, body: {} }
      : { status: 200, body: payload(day === dayISO(1) ? 780 : 775) },
  );
  const { days: hist, missing } = await client.getHistory(3);
  // Ayer y anteayer con datos; el 3er día 422 se salta sin romper.
  expect(calls).toEqual([dayISO(1), dayISO(2), dayISO(3)]);
  expect(missing).toEqual([{ day: dayISO(3), reason: 'no-data' }]);
  // Aunque la API responda date:hoy, cada día se archiva con SU fecha
  // (si no, cada día sobrescribiría al anterior y la serie quedaría en 1).
  const byDate = new Map<string, { date: string; rates: { code: string; value: number }[] }>(
    hist.map((d: { date: string; rates: { code: string; value: number }[] }) => [d.date, d]),
  );
  expect([...byDate.keys()].sort()).toEqual([dayISO(1), dayISO(2)].sort());
  expect(byDate.get(dayISO(1))?.rates.find((r) => r.code === 'USD')?.value).toBe(780);
  expect(byDate.get(dayISO(2))?.rates.find((r) => r.code === 'USD')?.value).toBe(775);
  expect(await loadElToqueLocalHistory()).toHaveLength(2);
});

test('la serie local sale ordenada descendente', async () => {
  const { loadElToqueLocalHistory } = freshClient((day) => ({ status: 200, body: payload(780) }));
  // Forzar inserción desordenada simulando sesiones en distinto orden.
  const { client } = sameRegistryClient((day) => ({ status: 200, body: payload(780) }));
  await client.getDaily(dayISO(2));
  await client.getDaily(dayISO(1));
  const hist = await loadElToqueLocalHistory();
  expect(hist.map((d: { date: string }) => d.date)).toEqual([dayISO(1), dayISO(2)]);
});

test('un fallo aislado de red no impide traer días más viejos', async () => {
  const { calls, client } = freshClient((day) =>
    day === dayISO(1) ? { reject: true } : { status: 200, body: payload(780) },
  );
  const { days: hist, missing } = await client.getHistory(2);
  expect(calls).toEqual(expect.arrayContaining([dayISO(1), dayISO(2)]));
  expect(hist.map((d: { date: string }) => d.date)).toEqual([dayISO(2)]);
  expect(missing).toEqual([{ day: dayISO(1), reason: 'blocked' }]);
}, 30000);

test('dos fallos seguidos sin respuesta detienen el relleno', async () => {
  const { calls, client } = freshClient(() => ({ reject: true }));
  const { days: hist, missing } = await client.getHistory(3);
  // Día 1 y 2 fallan sin respuesta (con su reintento interno) -> para antes del día 3.
  expect(calls).toEqual([dayISO(1), dayISO(1), dayISO(2), dayISO(2)]);
  expect(hist).toHaveLength(0);
  expect(missing).toEqual([
    { day: dayISO(1), reason: 'blocked' },
    { day: dayISO(2), reason: 'blocked' },
  ]);
}, 60000);

test('salta días ya guardados sin gastar requests', async () => {
  const first = freshClient((day) => ({ status: 200, body: payload(780) }));
  await first.client.getHistory(1);
  // Relanzar la app: misma persistencia, memoria limpia.
  const second = sameRegistryClient((day) => ({ status: 200, body: payload(780) }));
  const { days: hist2, missing: missing2 } = await second.client.getHistory(2);
  // Ayer ya estaba guardado: solo pide anteayer.
  expect(second.calls).toEqual([dayISO(2)]);
  expect(missing2).toEqual([]);
  expect(hist2.map((d: { date: string }) => d.date).sort()).toEqual([dayISO(1), dayISO(2)].sort());
});

test('se detiene ante 401 sin insistir', async () => {
  const { calls, client } = freshClient(() => ({ status: 401, body: {} }));
  const { days: hist, missing } = await client.getHistory(3);
  expect(calls).toHaveLength(1);
  expect(hist).toHaveLength(0);
  expect(missing).toEqual([{ day: dayISO(1), reason: 'auth' }]);
});
