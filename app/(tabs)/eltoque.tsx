// Tab elToque — tasas informales. Pantalla propia y visible,
// separada del dominio oficial BCC. Incluye Comparar lado-a-lado.

import { CompareRowCard } from "@/components/rates/CompareRowCard";
import { ElToqueRateCard } from "@/components/rates/ElToqueRateCard";
import { SourceSegmentedControl } from "@/components/rates/SourceSegmentedControl";
import { VpnHint } from "@/components/rates/VpnHint";
import { EmptyState, ErrorState } from "@/components/ui/loading-error";
import {
  SegmentedControl,
  type SegmentedOption,
} from "@/components/ui/segmented-control";
import { RateListSkeleton } from "@/components/ui/skeleton";
import {
  BorderRadius,
  Colors,
  Shadows,
  Spacing,
  Typography,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ratesRepository } from "@/services/rates/repository";
import type { CompareRow, ElToqueDaily } from "@/services/rates/types";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Mode = "ELTOQUE" | "COMPARAR";
/** Ventana de la tasa informal: la publicada (07:00→07:00) o el valor vivo. */
type RateWindow = "published" | "realtime";

const WINDOW_OPTIONS: SegmentedOption<RateWindow>[] = [
  { key: "published", label: "Publicada" },
  { key: "realtime", label: "Tiempo real" },
];

export default function ElToqueScreen() {
  const [mode, setMode] = useState<Mode>("ELTOQUE");
  const [rateWindow, setRateWindow] = useState<RateWindow>("published");
  const [daily, setDaily] = useState<ElToqueDaily | null>(null);
  const [rows, setRows] = useState<CompareRow[]>([]);
  const [compareStaleDate, setCompareStaleDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);

  const scheme = useColorScheme();
  const colors = Colors[scheme ?? "light"];
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const load = useCallback(
    async (force = false) => {
      try {
        if (!force) setLoading(true);
        setError("");
        setBlocked(false);
        if (mode === "ELTOQUE") {
          const opts = force ? { forceRefresh: true } : undefined;
          const res =
            rateWindow === "realtime"
              ? await ratesRepository.getElToqueRealtime(opts)
              : await ratesRepository.getElToqueDaily(undefined, opts);
          if (res.ok && res.data) setDaily(res.data);
          else {
            setError(res.error ?? "No se pudo cargar la tasa informal.");
            setBlocked(res.blocked === true);
          }
        } else {
          const res = await ratesRepository.getCompareRows();
          setRows(res.rows);
          setBlocked(res.eltoqueBlocked);
          setCompareStaleDate(res.eltoqueStale ? res.eltoqueDate : null);
          if (!res.eltoqueAvailable) setError("Fuente informal no disponible.");
          else if (res.rows.length === 0)
            setError("Sin coincidencias para comparar hoy.");
        }
      } catch {
        setError("Error de conexión. Verifique su internet.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [mode, rateWindow],
  );

  useEffect(() => {
    const c = new AbortController();
    void c.signal;
    void load(false);
    return () => c.abort();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load(true);
  }, [load]);

  // Al cambiar de ventana se descarta lo cargado: no debe quedar en pantalla el
  // valor publicado mientras se pide el de tiempo real (ni al revés).
  const onWindowChange = useCallback((next: RateWindow) => {
    setDaily(null);
    setError("");
    setBlocked(false);
    setLoading(true);
    setRateWindow(next);
  }, []);

  // Resumen clonado del tab BCC: USD / EUR (euro) / conteo, todo informal.
  const stats = useMemo(() => {
    const rates = daily?.rates ?? [];
    const usd = rates.find((r) => r.code === "USD");
    const eur = rates.find((r) => r.code === "EUR");
    return {
      total: rates.length,
      usd: usd ? usd.value.toFixed(2) : "—",
      eur: eur ? eur.value.toFixed(2) : "—",
    };
  }, [daily]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={scheme === "dark" ? "light-content" : "dark-content"}
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.sm,
            paddingBottom: tabBarHeight + Spacing.lg,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Text
            style={[styles.title, { color: colors.text }]}
            maxFontSizeMultiplier={1.15}
          >
            elToque
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.textMuted }]}
            numberOfLines={2}
          >
            {mode === "ELTOQUE" && rateWindow === "realtime"
              ? `Tiempo real · ${daily?.date ?? "hoy"}`
              : `Referencia · ${daily?.date ?? "hoy"}`}
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
                { label: "USD", value: stats.usd },
                { label: "EUR", value: stats.eur },
                { label: "MONEDAS", value: String(stats.total) },
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

        <View style={styles.switchSection}>
          <SourceSegmentedControl
            value={mode}
            onChange={(t) => {
              if (t !== "BCC") setMode(t);
            }}
            options={["ELTOQUE", "COMPARAR"]}
          />
        </View>

        {mode === "ELTOQUE" ? (
          <View style={styles.switchSection}>
            <SegmentedControl
              value={rateWindow}
              onChange={onWindowChange}
              options={WINDOW_OPTIONS}
              accessibilityLabel="Ventana de la tasa informal: publicada o tiempo real"
            />
          </View>
        ) : null}

        {loading ? (
          <View style={{ paddingHorizontal: Spacing.lg }}>
            <RateListSkeleton rows={mode === "ELTOQUE" ? 5 : 3} />
          </View>
        ) : error && (mode === "ELTOQUE" ? !daily : rows.length === 0) ? (
          <View style={{ gap: Spacing.md, paddingHorizontal: Spacing.lg }}>
            {blocked ? <VpnHint onRetry={() => load(true)} /> : null}
            <ErrorState message={error} onRetry={() => load(true)} />
          </View>
        ) : mode === "ELTOQUE" ? (
          daily && daily.rates.length > 0 ? (
            <View style={{ gap: Spacing.md, paddingHorizontal: Spacing.lg }}>
              {daily.stale ? (
                <View
                  style={[
                    styles.note,
                    {
                      backgroundColor: colors.warningLight,
                      borderColor: colors.warning,
                    },
                  ]}
                >
                  <Ionicons
                    name="cloud-offline-outline"
                    size={18}
                    color={colors.warningDark}
                  />
                  <Text
                    style={[styles.noteText, { color: colors.warningDark }]}
                  >
                    Datos guardados del {daily.date}. Active un VPN y reintente
                    para actualizar.
                  </Text>
                </View>
              ) : null}
              {daily.realtime ? (
                <View
                  style={[
                    styles.note,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="pulse-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={[styles.noteText, { color: colors.textMuted }]}>
                    Valor vivo del widget: se mueve durante el día y no es la tasa
                    publicada de las 07:00.
                  </Text>
                </View>
              ) : null}
              {daily.rates.map((r) => (
                <ElToqueRateCard key={r.code} rate={r} />
              ))}
              <View
                style={[
                  styles.note,
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
                <Text style={[styles.noteText, { color: colors.textMuted }]}>
                  Valores informales, no válidos para instituciones estatales.
                </Text>
              </View>
            </View>
          ) : (
            <EmptyState message="Sin tasas informales hoy" />
          )
        ) : (
          <View style={{ gap: Spacing.md, paddingHorizontal: Spacing.lg }}>
            {blocked ? <VpnHint onRetry={() => load(true)} /> : null}
            {compareStaleDate ? (
              <Text
                style={[
                  styles.noteText,
                  { color: colors.warningDark, textAlign: "center" },
                ]}
              >
                elToque del {compareStaleDate} (guardado) · BCC actualizado
              </Text>
            ) : null}
            {rows.map((row) => (
              <CompareRowCard key={row.code} row={row} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1 },
  heroSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  title: { ...Typography.displayLarge },
  subtitle: { ...Typography.bodySmall, marginTop: 2 },
  appleHeroCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    marginTop: Spacing.md,
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
  switchSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  note: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: Spacing.md,
  },
  noteText: { ...Typography.bodySmall, flex: 1, marginLeft: Spacing.sm },
});
