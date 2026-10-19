import {
  buildCompareRows,
  isElToqueResponse,
  isValidElToqueTasas,
  mapElToqueToRates,
} from '../types';

const raw = {
  date: '2026-10-11',
  hour: 10,
  minutes: 23,
  seconds: 44,
  tasas: { BTC: 769.85, ECU: 874.27, MLC: 497.36, TRX: 253.75, USD: 780, USDT_TRC20: 946.9 },
};

describe('isElToqueResponse', () => {
  test('accepts the documented trmi payload', () => {
    expect(isElToqueResponse(raw)).toBe(true);
  });
  test('rejects bad shapes', () => {
    expect(isElToqueResponse(null)).toBe(false);
    expect(isElToqueResponse({})).toBe(false);
    expect(isElToqueResponse({ ...raw, date: '11/10/2026' })).toBe(false);
    expect(isElToqueResponse({ ...raw, tasas: null })).toBe(false);
  });
});

describe('isValidElToqueTasas', () => {
  test('accepts finite numbers, rejects strings/NaN', () => {
    expect(isValidElToqueTasas(raw.tasas as Record<string, unknown>)).toBe(true);
    expect(isValidElToqueTasas({ USD: '780' })).toBe(false);
    expect(isValidElToqueTasas({ USD: NaN })).toBe(false);
  });
});

describe('mapElToqueToRates', () => {
  test('maps to informal domain with source tag, skips non-positive', () => {
    const rates = mapElToqueToRates(raw as never, '2026-10-11T00:00:00.000Z');
    expect(rates).toHaveLength(6);
    expect(rates[0].source).toBe('ELTOQUE');
    const withZero = mapElToqueToRates(
      { ...raw, tasas: { ...raw.tasas, USD: 0 } } as never,
      'x',
    );
    expect(withZero.find((r) => r.code === 'USD')).toBeUndefined();
  });
  test('returns [] on malformed payload (fail-closed)', () => {
    expect(mapElToqueToRates(null as never, 'x')).toEqual([]);
  });
  test('la fecha pedida manda sobre el `date` que devuelve el servidor', () => {
    // La API responde siempre date:hoy; la serie histórica depende de esto.
    const rates = mapElToqueToRates(raw as never, 'x', '2026-10-01');
    expect(rates.every((r) => r.date === '2026-10-01')).toBe(true);
    // Sin día explícito se conserva el de la respuesta (compat).
    expect(mapElToqueToRates(raw as never, 'x')[0].date).toBe('2026-10-11');
  });
});

describe('buildCompareRows', () => {
  test('ECU crudo se normaliza a EUR y compara con el euro BCC', () => {
    const rates = mapElToqueToRates(raw as never, 'x');
    const eur = rates.find((r) => r.code === 'EUR')!;
    expect(eur.value).toBe(874.27);
    expect(eur.name).toBe('Euro');
    expect(rates.find((r) => (r.code as string) === 'ECU')).toBeUndefined();
  });
  test('side-by-side only, never averaged; BTC/TRX/USDT excluded', () => {
    const bcc = new Map([['USD', 100], ['MLC', 200], ['EUR', 150]]);
    const informal = mapElToqueToRates(raw as never, 'x');
    const rows = buildCompareRows(bcc, informal);
    const codes = rows.map((r) => r.code);
    expect(codes).toEqual(expect.arrayContaining(['USD', 'MLC', 'EUR']));
    expect(codes).not.toContain('BTC');
    const usd = rows.find((r) => r.code === 'USD')!;
    expect(usd.bccValue).toBe(100);
    expect(usd.elToqueValue).toBe(780);
    expect(usd.spreadPct).toBeCloseTo(6.8, 5);
    const eurRow = rows.find((r) => r.code === 'EUR')!;
    expect(eurRow.bccValue).toBe(150);
    expect(eurRow.elToqueValue).toBe(874.27);
  });
});
