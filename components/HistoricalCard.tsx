import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';
import { TasaCambioHistorico } from '../types';
import { formatCurrency } from '../utils/formatters';

interface HistoricalCardProps {
  data: TasaCambioHistorico;
  colors: typeof Colors.light;
  showCurrency?: boolean;
}

const HistoricalCardInner: React.FC<HistoricalCardProps> = ({ data, colors, showCurrency }) => {
  const d = new Date(data.fecha);
  const dateStr = Number.isNaN(d.getTime())
    ? data.fecha
    : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <View style={styles.header}>
        <Text style={[styles.date, { color: colors.text }]}>{dateStr}</Text>
        {showCurrency && data.codigoMoneda ? (
          <View style={[styles.pill, { backgroundColor: colors.borderLight }]}>
            <Text style={[styles.pillText, { color: colors.textMuted }]}>{data.codigoMoneda}</Text>
          </View>
        ) : null}
      </View>
      <View style={[styles.grid, { borderTopColor: colors.cardBorder }]}>
        {[
          { label: 'Oficial', v: data.tasaOficial },
          { label: 'Pública', v: data.tasaPublica },
          { label: 'Especial', v: data.tasaEspecial },
        ].map((r) => (
          <View key={r.label} style={styles.item}>
            <Text style={[styles.label, { color: colors.textMuted }]}>{r.label.toUpperCase()}</Text>
            <Text style={[styles.value, { color: colors.text }]}>{formatCurrency(r.v, 2)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const HistoricalCard = React.memo(HistoricalCardInner);
export default HistoricalCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  date: { ...Typography.labelMedium },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  pillText: { ...Typography.labelSmall, fontWeight: '600' as const },
  grid: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: Spacing.sm },
  item: { flex: 1, alignItems: 'center' },
  label: { ...Typography.labelSmall },
  value: { ...Typography.bodyLarge, fontWeight: '600' as const, fontVariant: ['tabular-nums'], marginTop: 2 },
});
