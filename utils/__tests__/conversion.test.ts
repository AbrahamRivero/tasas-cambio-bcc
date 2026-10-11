import {
  QUICK_AMOUNTS_COMPRA,
  QUICK_AMOUNTS_VENTA,
  convertAmount,
  getRateWithSpread,
  parseInputAmount,
} from '../conversion';

const tasa = { codigoMoneda: 'USD', nombreMoneda: 'Dollar', tasaOficial: 100, tasaPublica: 200, tasaEspecial: 300 };

describe('parseInputAmount', () => {
  test('parses plain and decimal input', () => {
    expect(parseInputAmount('123')).toBe(123);
    expect(parseInputAmount('12.5')).toBe(12.5);
  });

  test('treats comma as decimal separator', () => {
    expect(parseInputAmount('12,5')).toBe(12.5);
  });

  test('returns 0 for empty or non-numeric input', () => {
    expect(parseInputAmount('')).toBe(0);
    expect(parseInputAmount('abc')).toBe(0);
  });

  test('strips currency symbols and spaces', () => {
    expect(parseInputAmount('$ 1 000')).toBe(1000);
  });
});

describe('getRateWithSpread', () => {
  test('applies the operation spread to the selected rate type', () => {
    expect(getRateWithSpread(tasa, 'especial', 'compra')).toBeCloseTo(300 * 1.02);
    expect(getRateWithSpread(tasa, 'oficial', 'venta')).toBeCloseTo(100 * 0.98);
  });

  test('returns 0 without a tasa', () => {
    expect(getRateWithSpread(undefined, 'especial', 'compra')).toBe(0);
  });
});

describe('convertAmount', () => {
  test('divides CUP by the rate when buying foreign currency', () => {
    expect(convertAmount(100, 25, 'compra')).toBe(4);
  });

  test('multiplies by the rate when selling foreign currency', () => {
    expect(convertAmount(100, 25, 'venta')).toBe(2500);
  });

  test('returns 0 instead of Infinity/NaN for bad rates', () => {
    expect(convertAmount(100, 0, 'compra')).toBe(0);
    expect(convertAmount(100, NaN, 'venta')).toBe(0);
    expect(convertAmount(NaN, 25, 'compra')).toBe(0);
  });
});

describe('quick amounts', () => {
  test('both operation lists are non-empty', () => {
    expect(QUICK_AMOUNTS_COMPRA.length).toBeGreaterThan(0);
    expect(QUICK_AMOUNTS_VENTA.length).toBeGreaterThan(0);
  });
});
