import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { MONEDAS_PRINCIPALES, TasaCambio, TasaCambioHistorico, isTasasActivasResponse } from '../types';
import { ExchangeRateCard } from './ExchangeRateCard';
import { EmptyState, ErrorState, Loading } from './ui/loading-error';

interface ExchangeRateListProps {
  currencies: (TasaCambio | TasaCambioHistorico)[] | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  error?: string;
  onRetry?: () => void;
  currencyFilter?: string;
  historicalData?: TasaCambioHistorico[];
}

export const ExchangeRateList: React.FC<ExchangeRateListProps> = ({
  currencies,
  loading,
  refreshing = false,
  onRefresh,
  error,
  onRetry,
  currencyFilter,
  historicalData = [],
}) => {
  // Latest pre-today record per currency, computed once. Cards receive a
  // scalar previous record instead of filtering/sorting the whole array
  // themselves on every render (and never mix currencies in the trend).
  const previousByCurrency = useMemo(() => {
    const map = new Map<string, TasaCambioHistorico>();
    const todayStr = new Date().toDateString();
    for (const item of historicalData) {
      if (!item || !item.codigoMoneda || !item.fecha) continue;
      const date = new Date(item.fecha);
      if (Number.isNaN(date.getTime())) continue;
      if (date.toDateString() === todayStr) continue;
      const prev = map.get(item.codigoMoneda);
      if (!prev || date.getTime() > new Date(prev.fecha).getTime()) {
        map.set(item.codigoMoneda, item);
      }
    }
    return map;
  }, [historicalData]);

  if (!currencies) {
    return <Loading message="Cargando tasas de cambio..." />;
  }

  const ratesData: (TasaCambio | TasaCambioHistorico)[] = Array.isArray(currencies) && currencies.length > 0 && isTasasActivasResponse(currencies[0])
    ? currencies[0].tasas
    : (currencies || []);

  const filteredRates = currencyFilter
    ? ratesData.filter((tasa: TasaCambio | TasaCambioHistorico) => {
        const codigo = (tasa as TasaCambio).codigoMoneda || '';
        return codigo.toLowerCase() === currencyFilter.toLowerCase();
      })
    : ratesData;

  const ratesToShow = !currencyFilter
    ? [...filteredRates].sort((a, b) => {
        const codigoA = (a as TasaCambio).codigoMoneda || '';
        const codigoB = (b as TasaCambio).codigoMoneda || '';

        const esPrincipalA = MONEDAS_PRINCIPALES.some(moneda => moneda.codigo === codigoA);
        const esPrincipalB = MONEDAS_PRINCIPALES.some(moneda => moneda.codigo === codigoB);

        if (esPrincipalA && !esPrincipalB) return -1;
        if (!esPrincipalA && esPrincipalB) return 1;
        return 0;
      })
    : filteredRates;

  if (loading) {
    return <Loading message="Cargando tasas de cambio..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (ratesToShow.length === 0) {
    return (
      <EmptyState
        message={
          currencyFilter
            ? `No se encontraron tasas para ${currencyFilter.toUpperCase()}`
            : 'No hay tasas de cambio disponibles'
        }
      />
    );
  }

  // Active rates rendering
  return (
    <View style={styles.listContainer}>
      {ratesToShow.map((tasa: TasaCambio | TasaCambioHistorico, index: number) => {
        const tasaCambio = tasa as TasaCambio;
        return (
          <ExchangeRateCard
            key={`${tasaCambio.codigoMoneda}-${tasaCambio.fechaActivacion}-${index}`}
            tasa={tasaCambio}
            previousData={previousByCurrency.get(tasaCambio.codigoMoneda) ?? null}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    gap: 10,
  },
});

export default ExchangeRateList;
