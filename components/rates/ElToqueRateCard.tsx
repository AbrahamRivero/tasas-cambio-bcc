// AppleCell informal — misma fila que BCC: icono, moneda, monto a la derecha.

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { formatCurrency } from '../../utils/formatters';
import type { ElToqueRate } from '../../services/rates/types';

const ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  USD: 'logo-usd',
  MLC: 'card',
  EUR: 'earth',
  BTC: 'logo-bitcoin',
  TRX: 'flash',
  USDT_TRC20: 'wallet',
};

export const ElToqueRateCard: React.FC<{ rate: ElToqueRate }> = ({ rate }) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
      accessibilityRole="summary"
      accessibilityLabel={`Tasa informal de ${rate.code}: ${rate.value} CUP`}
    >
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: '#FF9500' }]}>
          <Ionicons name={ICON[rate.code] ?? 'storefront'} size={17} color="#FFFFFF" />
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {rate.code}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {rate.name}
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
            {formatCurrency(rate.value, 2)}
          </Text>
          <Text style={[styles.unit, { color: colors.textMuted }]}>CUP</Text>
        </View>
      </View>
    </View>
  );
};

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
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  iconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  texts: { flex: 1, minWidth: 0, flexShrink: 1 },
  title: { ...Typography.bodyLarge, fontWeight: '600' as const },
  subtitle: { ...Typography.bodySmall, marginTop: 1 },
  valueWrap: { flexShrink: 1, minWidth: 0, alignItems: 'flex-end', marginLeft: Spacing.sm },
  value: { ...Typography.headlineSmall, fontWeight: '600' as const, fontVariant: ['tabular-nums'], textAlign: 'right' as const },
  unit: { ...Typography.bodySmall, marginTop: 1 },
});
