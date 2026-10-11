// AppleCell expandible — estilo Settings: icono 29px, título, valor, chevron.
// Tap expande detalle (Oficial/Pública/Especial + Compra/Venta). Haptic via activeOpacity.

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { TasaCambioHistorico } from '../types';
import { formatCurrency } from '../utils/formatters';
import { applySpread, getRateByType } from '../utils/rates';
import type { RateType } from '../utils/rates';

interface RateData {
  codigoMoneda: string;
  nombreMoneda: string;
  tasaOficial: number;
  tasaPublica: number;
  tasaEspecial: number;
  fechaActivacion: string;
}

const CURRENCY_ICON: Record<string, { icon: keyof typeof Ionicons.glyphMap; bg: string }> = {
  USD: { icon: 'logo-usd', bg: '#34C759' },
  EUR: { icon: 'earth', bg: '#007AFF' },
  MXN: { icon: 'cash', bg: '#FF9500' },
  CAD: { icon: 'leaf', bg: '#FF3B30' },
};

const ExchangeRateCardInner: React.FC<{
  tasa: RateData;
  previousData?: TasaCambioHistorico | null;
}> = ({ tasa, previousData = null }) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const [expanded, setExpanded] = useState(false);
  const [rateType, setRateType] = useState<RateType>('especial');

  const currentRate = getRateByType(tasa, rateType) || getRateByType(tasa, 'especial');
  const trendUp = useMemo(() => {
    if (!previousData) return null;
    const prev =
      rateType === 'oficial' ? previousData.tasaOficial
      : rateType === 'publica' ? previousData.tasaPublica
      : previousData.tasaEspecial;
    if (!Number.isFinite(prev) || !Number.isFinite(currentRate)) return null;
    return currentRate > prev;
  }, [previousData, currentRate, rateType]);

  const toggle = useCallback(() => {
    void Haptics.selectionAsync().catch(() => undefined);
    setExpanded((v) => !v);
  }, []);

  const meta = CURRENCY_ICON[tasa.codigoMoneda] ?? { icon: 'cash-outline' as const, bg: colors.primary };
  const buy = formatCurrency(applySpread(currentRate, 'compra'));
  const sell = formatCurrency(applySpread(currentRate, 'venta'));

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <Pressable
        onPress={toggle}
        android_ripple={{ color: colors.borderLight }}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${tasa.codigoMoneda}, ${formatCurrency(currentRate, 2)} CUP. Toque para detalle.`}
      >
        <View style={[styles.iconBox, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={17} color="#FFFFFF" />
        </View>
        <View style={styles.texts}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {tasa.codigoMoneda}
            </Text>
            {trendUp !== null ? (
              <Ionicons
                name={trendUp ? 'arrow-up-circle' : 'arrow-down-circle'}
                size={14}
                color={trendUp ? colors.error : colors.success}
                style={{ marginLeft: 6 }}
              />
            ) : null}
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {tasa.nombreMoneda}
          </Text>
        </View>
        <View style={styles.valueWrap}>
          <Text
            style={[styles.value, { color: colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            maxFontSizeMultiplier={1.15}
          >
            {formatCurrency(currentRate, 2)}
          </Text>
          <Text style={[styles.unit, { color: colors.textMuted }]}>CUP</Text>
        </View>
        <Ionicons
          name="chevron-forward" size={16} color={colors.textMuted}
          style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
        />
      </Pressable>

      {expanded ? (
        <View style={[styles.detail, { borderTopColor: colors.cardBorder }]}>
          <View style={styles.typeRow}>
            {(['oficial', 'publica', 'especial'] as RateType[]).map((t) => {
              const active = rateType === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => {
                    void Haptics.selectionAsync().catch(() => undefined);
                    setRateType(t);
                  }}
                  style={[
                    styles.typeBtn,
                    { backgroundColor: active ? colors.primary : colors.borderLight },
                  ]}
                >
                  <Text style={[styles.typeText, { color: active ? '#FFFFFF' : colors.textMuted }]} numberOfLines={1}>
                    {t === 'publica' ? 'pública' : t}
                  </Text>
                  <Text
                    style={[styles.typeValue, { color: active ? '#FFFFFF' : colors.text }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    maxFontSizeMultiplier={1.15}
                  >
                    {formatCurrency(getRateByType(tasa, t), 2)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.opsRow}>
            <View style={[styles.op, { backgroundColor: colors.successLight }]}>
              <Text style={[styles.opLabel, { color: colors.successDark }]}>COMPRA</Text>
              <Text
                style={[styles.opValue, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                maxFontSizeMultiplier={1.15}
              >
                {buy}
              </Text>
            </View>
            <View style={[styles.op, { backgroundColor: colors.warningLight }]}>
              <Text style={[styles.opLabel, { color: colors.warningDark }]}>VENTA</Text>
              <Text
                style={[styles.opValue, { color: colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                maxFontSizeMultiplier={1.15}
              >
                {sell}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
};

export const ExchangeRateCard = React.memo(ExchangeRateCardInner);
export default ExchangeRateCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  iconBox: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginRight: Spacing.md,
  },
  texts: { flex: 1, minWidth: 0, flexShrink: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  title: { ...Typography.bodyLarge, fontWeight: '600' as const },
  subtitle: { ...Typography.bodySmall, marginTop: 1 },
  valueWrap: { flexShrink: 1, minWidth: 0, alignItems: 'flex-end', marginLeft: Spacing.sm },
  value: { ...Typography.headlineSmall, fontWeight: '600' as const, fontVariant: ['tabular-nums'], textAlign: 'right' as const },
  unit: { ...Typography.bodySmall, marginTop: 1 },
  detail: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
  },
  typeRow: { flexDirection: 'row', marginHorizontal: -4, marginBottom: Spacing.md },
  typeBtn: {
    flex: 1, minWidth: 0, flexShrink: 1, marginHorizontal: 4, borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm, paddingHorizontal: 2, alignItems: 'center',
  },
  typeText: { ...Typography.labelSmall, textTransform: 'capitalize' as const },
  typeValue: { ...Typography.labelMedium, fontVariant: ['tabular-nums'], marginTop: 2 },
  opsRow: { flexDirection: 'row', marginHorizontal: -4 },
  op: { flex: 1, minWidth: 0, flexShrink: 1, marginHorizontal: 4, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  opLabel: { ...Typography.labelSmall },
  opValue: { ...Typography.headlineSmall, fontVariant: ['tabular-nums'], marginTop: 4 },
});
