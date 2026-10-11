import { isTasasActivasResponse, isValidHistorico, isValidTasa } from '../../types';

const validTasa = {
  _id: '1',
  codigoMoneda: 'USD',
  nombreMoneda: 'Dollar',
  tasaOficial: 100,
  tasaPublica: 200,
  tasaEspecial: 300,
  fechaDia: '2026-10-01',
};

describe('isValidTasa', () => {
  test('accepts a well-formed rate', () => {
    expect(isValidTasa(validTasa)).toBe(true);
  });

  test('rejects non-objects', () => {
    expect(isValidTasa(null)).toBe(false);
    expect(isValidTasa(undefined)).toBe(false);
    expect(isValidTasa('USD')).toBe(false);
  });

  test('rejects missing currency code', () => {
    const { codigoMoneda, ...rest } = validTasa;
    void codigoMoneda;
    expect(isValidTasa(rest)).toBe(false);
  });

  test('rejects non-finite rates', () => {
    expect(isValidTasa({ ...validTasa, tasaOficial: '100' })).toBe(false);
    expect(isValidTasa({ ...validTasa, tasaPublica: NaN })).toBe(false);
    expect(isValidTasa({ ...validTasa, tasaEspecial: Infinity })).toBe(false);
  });
});

describe('isValidHistorico', () => {
  const row = { fecha: '2026-10-01', tasaOficial: 100, tasaPublica: 200, tasaEspecial: 300, codigoMoneda: 'USD' };

  test('accepts a well-formed history row', () => {
    expect(isValidHistorico(row)).toBe(true);
  });

  test('rejects rows with bad fecha or rates', () => {
    expect(isValidHistorico({ ...row, fecha: 20261001 })).toBe(false);
    expect(isValidHistorico({ ...row, tasaOficial: null })).toBe(false);
    expect(isValidHistorico(null)).toBe(false);
  });
});

describe('isTasasActivasResponse', () => {
  test('accepts the active-rates envelope', () => {
    expect(isTasasActivasResponse({ tasas: [validTasa], fechaDia: '2026-10-01', fechaHoy: '2026-10-02' })).toBe(true);
  });

  test('rejects malformed envelopes', () => {
    expect(isTasasActivasResponse(null)).toBe(false);
    expect(isTasasActivasResponse({})).toBe(false);
    expect(isTasasActivasResponse({ tasas: {}, fechaDia: 'x' })).toBe(false);
    expect(isTasasActivasResponse({ tasas: [] })).toBe(false);
  });
});
