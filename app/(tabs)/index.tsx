import { ExchangeRateList } from "@/components/ExchangeRateList";
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { apiService } from "@/services/api";
import { TasaCambioHistorico, TasasActivasResponse } from "@/types";
import { formatDate } from "@/utils/formatters";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TasasActivasScreen() {
  const [currencies, setCurrencies] = useState<TasasActivasResponse[] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState("");
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState<Date | null>(
    null,
  );
  const [historicalData, setHistoricalData] = useState<TasaCambioHistorico[]>(
    [],
  );
  // Consecutive fetch failures drive the polling backoff (reset on success).
  const failures = useRef(0);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const loadRates = useCallback(
    async (options?: { forceRefresh?: boolean; signal?: AbortSignal }) => {
      try {
        setError("");
        setLoading(true);

        // Load active rates
        const [ratesResponse, historicalResponse] = await Promise.all([
          apiService.getActiveCurrencies({
            signal: options?.signal,
            forceRefresh: options?.forceRefresh,
          }),
          apiService.getTasasHistorico(undefined, {
            signal: options?.signal,
            forceRefresh: options?.forceRefresh,
          }),
        ]);

        if (ratesResponse.success) {
          failures.current = 0;
          setCurrencies([ratesResponse.data]);
          setLastUpdate(ratesResponse.data.fechaHoy);
          setLastUpdateTimestamp(new Date()); // Track when we actually fetched the data

          // Load historical data if available
          if (historicalResponse.success) {
            setHistoricalData(historicalResponse.data);
          }
        } else {
          failures.current += 1;
          setError(
            ratesResponse.error || "Error al cargar las tasas de cambio",
          );
        }
      } catch {
        failures.current += 1;
        setError(
          "Error de conexión. Verifique su internet e intente nuevamente.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadRates({ signal: controller.signal });

    // Poll every 5 minutes while the app is foregrounded, backing off
    // exponentially (capped at 60 min) while fetches keep failing.
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const factor = Math.min(2 ** failures.current, 12);
      timer = setTimeout(
        async () => {
          if (AppState.currentState === "active") {
            await loadRates();
          }
          schedule();
        },
        5 * 60 * 1000 * factor,
      );
    };
    schedule();

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loadRates]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setLoading(true);
    loadRates({ forceRefresh: true });
  }, [loadRates]);

  // Calculate stats from tasas
  const stats = React.useMemo(() => {
    if (!currencies || !currencies[0]?.tasas) {
      return { totalMonedas: 0, usdRate: "0.00", eurRate: "0.00" };
    }
    const tasasList = currencies[0].tasas;
    const usd = tasasList.find((t) => t.codigoMoneda === "USD");
    const eur = tasasList.find((t) => t.codigoMoneda === "EUR");
    return {
      totalMonedas: tasasList.length,
      usdRate: usd?.tasaEspecial?.toFixed(2) || "0.00",
      eurRate: eur?.tasaEspecial?.toFixed(2) || "0.00",
    };
  }, [currencies]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colorScheme === "dark" ? "light-content" : "dark-content"}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.sm,
            paddingBottom: tabBarHeight + Spacing.lg,
          },
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
      >
        {/* Cabecera Apple: título grande */}
        <View style={styles.heroSection}>
          <Text
            style={[styles.appleTitle, { color: colors.text }]}
            maxFontSizeMultiplier={1.15}
          >
            BCC
          </Text>
          <Text
            style={[styles.appleSubtitle, { color: colors.textMuted }]}
            numberOfLines={2}
          >
            Referencia ·{" "}
            {lastUpdateTimestamp
              ? lastUpdateTimestamp.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : lastUpdate
                ? formatDate(lastUpdate)
                : "cargando…"}
          </Text>

          <View
            style={[
              styles.appleHeroCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <View style={styles.heroStats}>
              {[
                { label: "USD", value: stats.usdRate },
                { label: "EUR", value: stats.eurRate },
                { label: "MONEDAS", value: String(stats.totalMonedas) },
              ].map((s, i) => (
                <React.Fragment key={s.label}>
                  {i > 0 ? (
                    <View
                      style={[
                        styles.heroStatDivider,
                        { backgroundColor: colors.cardBorder },
                      ]}
                    />
                  ) : null}
                  <View style={styles.heroStatItem}>
                    <Text
                      style={[
                        styles.heroStatLabel,
                        { color: colors.textMuted },
                      ]}
                    >
                      {s.label}
                    </Text>
                    <Text
                      style={[styles.heroStatValue, { color: colors.text }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                      maxFontSizeMultiplier={1.15}
                    >
                      {s.value}
                    </Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        </View>

        {/* Solo tasas oficiales BCC */}
        <View style={styles.listSection}>
          <ExchangeRateList
            currencies={currencies?.[0]?.tasas ?? null}
            loading={loading}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            error={error}
            onRetry={loadRates}
            historicalData={historicalData}
          />
        </View>

        {/* Footer Info */}
        <View style={styles.footerSection}>
          <View
            style={[
              styles.footerCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.textMuted}
            />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Tasas oficiales del Banco Central de Cuba.
            </Text>
          </View>
        </View>
      </ScrollView>
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

  // Hero Section — Apple grouped
  heroSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  appleTitle: {
    ...Typography.displayLarge,
  },
  appleSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  appleHeroCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    ...(Platform.OS === "android" ? { elevation: 1 } : Shadows.sm),
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroStatItem: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    alignItems: "center",
    paddingHorizontal: 2,
  },
  heroStatDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    marginHorizontal: Spacing.sm,
    alignSelf: "center",
  },
  heroStatLabel: {
    ...Typography.labelSmall,
    marginBottom: 2,
  },
  heroStatValue: {
    ...Typography.headlineLarge,
    fontVariant: ["tabular-nums"],
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
    flexDirection: "row",
    alignItems: "flex-start",
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
