import { RATE_TYPES, SPREAD_COMPRA, SPREAD_VENTA, applySpread, getRateByType, spreadLabel } from '../rates';

const tasa = { tasaOficial: 100, tasaPublica: 200, tasaEspecial: 300 };

describe('getRateByType', () => {
  test('returns each rate by key', () => {
    expect(getRateByType(tasa, 'oficial')).toBe(100);
    expect(getRateByType(tasa, 'publica')).toBe(200);
    expect(getRateByType(tasa, 'especial')).toBe(300);
  });

  test('returns 0 for missing tasa', () => {
    expect(getRateByType(undefined, 'oficial')).toBe(0);
    expect(getRateByType(null, 'especial')).toBe(0);
  });
});

describe('applySpread', () => {
  test('adds 2% when buying', () => {
    expect(applySpread(100, 'compra')).toBeCloseTo(100 * SPREAD_COMPRA);
  });

  test('subtracts 2% when selling', () => {
    expect(applySpread(100, 'venta')).toBeCloseTo(100 * SPREAD_VENTA);
  });
});

describe('spreadLabel', () => {
  test('labels match the applied spread', () => {
    expect(spreadLabel('compra')).toBe('+2%');
    expect(spreadLabel('venta')).toBe('-2%');
  });
});

describe('RATE_TYPES', () => {
  test('covers the three BCC rate types with unique keys', () => {
    expect(RATE_TYPES.map((r) => r.key).sort()).toEqual(['especial', 'oficial', 'publica']);
    expect(RATE_TYPES.every((r) => r.label.length > 0)).toBe(true);
  });
});
