// Comparar Apple — dos columnas oficiales vs calle, spread informativo.

import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { formatCurrency } from '../../utils/formatters';
import type { CompareRow } from '../../services/rates/types';

function fmt(v: number | null): string {
  return v === null ? '—' : formatCurrency(v, 2);
}

export const CompareRowCard: React.FC<{ row: CompareRow }> = ({ row }) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <Text style={[styles.code, { color: colors.text }]}>{row.code}</Text>
      <View style={styles.cols}>
        <View style={[styles.col, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.colLabel, { color: colors.primary }]}>OFICIAL</Text>
          <Text style={[styles.colValue, { color: colors.text }]}>{fmt(row.bccValue)}</Text>
          <Text style={[styles.colUnit, { color: colors.textMuted }]}>BCC · CUP</Text>
        </View>
        <View style={[styles.col, { backgroundColor: colors.warningLight }]}>
          <Text style={[styles.colLabel, { color: colors.warningDark }]}>elToque</Text>
          <Text style={[styles.colValue, { color: colors.text }]}>{fmt(row.elToqueValue)}</Text>
          <Text style={[styles.colUnit, { color: colors.textMuted }]}>CUP · informal</Text>
        </View>
      </View>
      {row.spreadPct !== null ? (
        <Text style={[styles.spread, { color: colors.textMuted }]}>
          {(row.spreadPct >= 0 ? '+' : '') + (row.spreadPct * 100).toFixed(1)}% calle vs oficial
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 1 },
    }),
  },
  code: { ...Typography.headlineSmall, textAlign: 'center', marginBottom: Spacing.sm },
  cols: { flexDirection: 'row', marginHorizontal: -4 },
  col: { flex: 1, minWidth: 0, flexShrink: 1, marginHorizontal: 4, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center' },
  colLabel: { ...Typography.labelSmall },
  colValue: { ...Typography.headlineSmall, fontVariant: ['tabular-nums'], marginTop: 4 },
  colUnit: { ...Typography.bodySmall, marginTop: 2 },
  spread: { ...Typography.bodySmall, textAlign: 'center', marginTop: Spacing.sm },
});
