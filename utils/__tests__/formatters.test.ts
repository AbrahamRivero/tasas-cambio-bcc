import { formatCurrency, getCurrencyFlag, sortCurrencies } from '../formatters';

const FLAG_US = '\uD83C\uDDFA\uD83C\uDDF8';
const FLAG_FALLBACK = '\uD83D\uDCB1';

describe('sortCurrencies', () => {
  test('orders priority currencies first (MONEDAS_PRINCIPALES order)', () => {
    expect(sortCurrencies(['MXN', 'JPY', 'USD', 'CAD', 'EUR'])).toEqual(['USD', 'EUR', 'MXN', 'CAD', 'JPY']);
  });

  test('sorts non-priority currencies alphabetically without mutating input', () => {
    const input = ['JPY', 'GBP'];
    expect(sortCurrencies(input)).toEqual(['GBP', 'JPY']);
    expect(input).toEqual(['JPY', 'GBP']);
  });

  test('handles an empty list', () => {
    expect(sortCurrencies([])).toEqual([]);
  });
});

describe('getCurrencyFlag', () => {
  test('returns the flag for known codes (case-insensitive)', () => {
    expect(getCurrencyFlag('USD')).toBe(FLAG_US);
    expect(getCurrencyFlag('usd')).toBe(FLAG_US);
  });

  test('falls back for unknown codes', () => {
    expect(getCurrencyFlag('XXX')).toBe(FLAG_FALLBACK);
  });
});

describe('formatCurrency', () => {
  test('formats with two decimals by default', () => {
    expect(typeof formatCurrency(150.5)).toBe('string');
    expect(formatCurrency(0)).toContain('0');
  });
});
