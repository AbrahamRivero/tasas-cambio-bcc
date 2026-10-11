import { HistoricalCard } from '@/components/HistoricalCard';
import { CurrencySelector } from '@/components/converter/CurrencySelector';
import { SourceSegmentedControl } from '@/components/rates/SourceSegmentedControl';
import { VpnHint } from '@/components/rates/VpnHint';
import { AppleCell, AppleSection } from '@/components/ui/apple';
import { EmptyState, ErrorState, Loading } from '@/components/ui/loading-error';
import { RateListSkeleton } from '@/components/ui/skeleton';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiService } from '@/services/api';
import { ratesRepository } from '@/services/rates/repository';
import type { ElToqueDaily } from '@/services/rates/types';
import type { TasaCambioHistorico } from '@/types';
import { formatCurrency, sortCurrencies } from '@/utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Hoisted (and memoized): declaring it inside the screen remounts every chip
// on each render because the component identity changes.
const FilterChip = React.memo(CurrencySelector);

export default function HistoricoScreen() {
  const [currencies, setCurrencies] = useState<TasaCambioHistorico[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('USD');
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  // Histórico por fuente: BCC (API 30 días) o elToque (serie local acumulada).
  const [sourceTab, setSourceTab] = useState<'BCC' | 'ELTOQUE'>('BCC');
  const [localHist, setLocalHist] = useState<ElToqueDaily[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localBlocked, setLocalBlocked] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [missingDays, setMissingDays] = useState<{ day: string; reason: string }[]>([]);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const loadAvailableCurrencies = useCallback(async () => {
    try {
      const response = await apiService.getActiveCurrencies();
      if (response.success && response.data?.tasas) {
        const currencies = response.data.tasas.map((t) => t.codigoMoneda);
        setAvailableCurrencies(currencies);
      }
    } catch { }
  }, []);

  // Monotonic id: only the latest request may touch state (rapid chip taps
  // fire overlapping fetches and a stale response must never win).
  const requestId = useRef(0);

  const loadHistoricalRates = useCallback(async (currencyCode?: string, options?: { forceRefresh?: boolean; signal?: AbortSignal }) => {
    const id = ++requestId.current;
    try {
      setError('');
      setLoading(true);
      const response = await apiService.getTasasHistorico(currencyCode, options);

      if (id !== requestId.current) return;

      if (response.success) {
        setCurrencies(response.data);
        setIsFallback(response.isFallback === true);
      } else {
        setIsFallback(false);
        setError(response.error || 'Error al cargar el histórico de tasas');
      }
    } catch {
      if (id !== requestId.current) return;
      setIsFallback(false);
      setError('Error de conexión. Verifique su internet e intente nuevamente.');
    } finally {
      if (id !== requestId.current) return;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAvailableCurrencies();
  }, [loadAvailableCurrencies]);

  useEffect(() => {
    // Debounce filter taps and cancel the superseded fetch on cleanup.
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const filterForApi = currencyFilter === 'USD' ? '' : currencyFilter;
      loadHistoricalRates(filterForApi, { signal: controller.signal });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [currencyFilter, loadHistoricalRates]);

  const loadLocalHistory = useCallback(async (refresh = false) => {
    setLocalLoading(true);
    setLocalBlocked(false);
    try {
      if (refresh) {
        const res = await ratesRepository.getElToqueDaily(undefined, { forceRefresh: true });
        if (!res.ok) setLocalBlocked(res.blocked === true);
      }
      setLocalHist(await ratesRepository.getElToqueLocalHistory());
    } finally {
      setLocalLoading(false);
      setRefreshing(false);
    }
    // Serie real: hoy + 3 días atrás (suficiente y cuida la cuota).
    // Completa días faltantes en segundo plano (secuencial; cada éxito se guarda).
    setBackfilling(true);
    try {
      const full = await ratesRepository.getElToqueHistory(3);
      setLocalHist(full.days);
      setMissingDays(full.missing.filter((m) => !full.days.some((d) => d.date === m.day)));
      if (full.days.length < 4) {
        const d = ratesRepository.getElToqueDiagnostics();
        if (d.lastNetKind !== null || d.lastStatus === 429) setLocalBlocked(true);
      }
    } catch {
      // serie parcial: lo local ya se muestra
    } finally {
      setBackfilling(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    if (sourceTab === 'ELTOQUE') {
      setRefreshing(true);
      void loadLocalHistory(true);
      return;
    }
    setRefreshing(true);
    loadHistoricalRates(currencyFilter, { forceRefresh: true });
  }, [currencyFilter, loadHistoricalRates, sourceTab, loadLocalHistory]);

  useEffect(() => {
    if (sourceTab === 'ELTOQUE') void loadLocalHistory(false);
  }, [sourceTab, loadLocalHistory]);

  const handleCurrencyFilter = useCallback((code: string) => {
    // The 'USD' chip doubles as the show-all sentinel: tapping the active chip
    // resets to 'USD', which the API layer maps to '' (all currencies).
    setCurrencyFilter(code === currencyFilter ? 'USD' : code);
  }, [currencyFilter]);

  // FlatList data: rows only when successfully loaded (loading/error/empty
  // render via ListEmptyComponent instead of mounting hundreds of cards).
  const listData = loading || error ? [] : (currencies ?? []);

  if (sourceTab === 'ELTOQUE') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + Spacing.sm, paddingBottom: tabBarHeight + Spacing.lg },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <Text style={[styles.heroTitle, { color: colors.text }]} maxFontSizeMultiplier={1.15}>
              Historial
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
              Serie real · {Math.min(localHist.length, 4)}/4 días{backfilling ? ' · completando…' : ''}
            </Text>
          </View>
          <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
            <SourceSegmentedControl value={sourceTab} onChange={(t) => { if (t !== 'COMPARAR') setSourceTab(t); }} options={['BCC', 'ELTOQUE']} />
          </View>
          {localLoading && localHist.length === 0 ? (
            <View style={{ paddingHorizontal: Spacing.lg }}>
              <RateListSkeleton rows={3} />
            </View>
          ) : localHist.length === 0 ? (
            <View style={{ paddingHorizontal: Spacing.lg }}>
              {localBlocked ? <VpnHint onRetry={() => loadLocalHistory(true)} /> : null}
              <EmptyState message="Aún sin días guardados. Actualiza con VPN para empezar la serie." />
            </View>
          ) : (
            <View style={{ gap: 2 }}>
              {localBlocked ? (
                <View style={{ paddingHorizontal: Spacing.lg }}>
                  <VpnHint onRetry={() => loadLocalHistory(true)} />
                </View>
              ) : null}
              {!backfilling && missingDays.length > 0 ? (
                <Text style={[styles.missingNote, { color: colors.textMuted }]}>
                  {missingDays.map((m) => {
                    const short = m.day.slice(5).replace('-', '/');
                    const why =
                      m.reason === 'no-data' ? 'la API no trae datos'
                      : m.reason === 'limited' ? 'límite elToque'
                      : m.reason === 'auth' ? 'token inválido'
                      : 'sin conexión (VPN)';
                    return `${short}: ${why}`;
                  }).join(' · ')}
                </Text>
              ) : null}
              {localHist.map((day) => (
                <AppleSection key={day.date} title={day.date}>
                  {day.rates.filter((r) => r.code === 'USD' || r.code === 'MLC' || r.code === 'EUR').map((r) => (
                    <AppleCell
                      key={r.code}
                      icon={r.code === 'USD' ? 'logo-usd' : r.code === 'MLC' ? 'card' : 'earth'}
                      iconBg="#FF9500"
                      title={r.code}
                      value={formatCurrency(r.value, 2)}
                    />
                  ))}
                </AppleSection>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
      />

      <FlatList
        data={listData}
        keyExtractor={(item, index) => `${item.codigoMoneda ?? 'all'}-${item.fecha ?? index}`}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: 10 }}>
            <HistoricalCard
              data={item}
              colors={colors}
              showCurrency={currencyFilter === 'USD' || !currencyFilter}
            />
          </View>
        )}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.sm, paddingBottom: tabBarHeight + Spacing.lg }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        ListHeaderComponent={
          <>
        {/* Cabecera Apple */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: colors.text }]} maxFontSizeMultiplier={1.15}>Historial</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
            BCC · {currencies?.length || 0} registros · {currencyFilter}
          </Text>
        </View>

        <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.md }}>
          <SourceSegmentedControl value={sourceTab} onChange={(t) => { if (t !== 'COMPARAR') setSourceTab(t); }} options={['BCC', 'ELTOQUE']} />
        </View>

        {/* Filtro por moneda (misma tarjeta agrupada que Convertir) */}
        <View style={styles.filterSection}>
          <View style={[styles.filterCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
              Moneda
            </Text>
            <FilterChip
              currencies={sortCurrencies(availableCurrencies).map((codigo) => ({ codigoMoneda: codigo }))}
              selectedCurrency={currencyFilter}
              onSelect={handleCurrencyFilter}
              colors={colors}
            />
          </View>
        </View>

        {/* Fallback notice: estimates shown when the BCC API is unreachable */}
        {isFallback && !loading && !error && (
          <View style={styles.fallbackSection}>
            <View style={[
              styles.fallbackCard,
              { backgroundColor: colors.warningLight, borderColor: colors.warning }
            ]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
              <Text style={[styles.fallbackText, { color: colors.warningDark }]}>
                Datos estimados — sin conexión con el BCC
              </Text>
            </View>
          </View>
        )}

          </>
        }
        ListEmptyComponent={
          loading ? (
            <Loading message="Cargando tasas de cambio..." />
          ) : error ? (
            <ErrorState message={error} onRetry={() => loadHistoricalRates(currencyFilter)} />
          ) : (
            <EmptyState
              message={
                currencyFilter
                  ? `No se encontraron tasas para ${currencyFilter.toUpperCase()}`
                  : 'No hay tasas de cambio disponibles'
              }
            />
          )
        }
        ListFooterComponent={
          <View style={styles.footerSection}>
            <View style={[styles.footerCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} />
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                Banco Central de Cuba.
              </Text>
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Hero Section Apple
  heroSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  heroTitle: {
    ...Typography.displayLarge,
  },
  heroSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  missingNote: {
    ...Typography.bodySmall,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // Filter Section (Apple: grupo hairline + chips iOS)
  filterSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filterCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
  },
  filterLabel: {
    ...Typography.labelMedium,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },

  // Fallback notice Section
  fallbackSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  fallbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  fallbackText: {
    ...Typography.bodyMedium,
    flex: 1,
  },

  // List Section
  listSection: {
    paddingHorizontal: Spacing.lg,
  },

  // Footer Section
  footerSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footerText: {
    ...Typography.bodySmall,
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    marginLeft: Spacing.sm,
    lineHeight: 20,
  },
});
