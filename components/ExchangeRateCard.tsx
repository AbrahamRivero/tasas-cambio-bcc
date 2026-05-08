import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { TasaCambioHistorico } from '../types';
import { formatCurrency, formatDateShort, getCurrencyFlag } from '../utils/formatters';

// ============================================
// Types & Interfaces
// ============================================

type RateType = 'oficial' | 'publica' | 'especial';

interface RateData {
  codigoMoneda: string;
  nombreMoneda: string;
  tasaOficial: number;
  tasaPublica: number;
  tasaEspecial: number;
  fechaActivacion: string;
}

interface ExchangeRateCardProps {
  tasa: RateData;
  onRateTypePress?: (type: RateType) => void;
  selectedRateType?: RateType;
  historicalData?: TasaCambioHistorico[];
}

// ============================================
// Sub Components
// ============================================

interface TransactionCardProps {
  type: 'compra' | 'venta';
  value: string;
  percentage: string;
  colors: typeof Colors.light;
}

const TransactionCard: React.FC<TransactionCardProps> = ({
  type,
  value,
  percentage,
  colors,
}) => {
  const isCompra = type === 'compra';
  const iconName = isCompra ? 'arrow-down-circle' : 'arrow-up-circle';

  return (
    <View
      style={[
        styles.transactionCard,
        { backgroundColor: isCompra ? colors.successLight : colors.warningLight }
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${isCompra ? 'Compra' : 'Venta'}: ${value} CUP, ${percentage}`}
    >
      <View style={styles.transactionIconRow}>
        <View style={[
          styles.transactionIcon,
          { backgroundColor: isCompra ? colors.success : colors.warning }
        ]}>
          <Ionicons
            name={iconName}
            size={16}
            color="#FFFFFF"
          />
        </View>
        <Text style={[
          styles.transactionLabel,
          { color: isCompra ? colors.successDark : colors.warningDark }
        ]}>
          {isCompra ? 'Compra' : 'Venta'}
        </Text>
      </View>
      <Text style={[styles.transactionValue, { color: colors.text }]}>
        {value}
        <Text style={[styles.transactionCurrency, { color: colors.textMuted }]}> CUP</Text>
      </Text>
      <View style={[
        styles.percentageBadge,
        { backgroundColor: isCompra ? colors.success : colors.warning }
      ]}>
        <Text style={styles.percentageText}>{percentage}</Text>
      </View>
    </View>
  );
};

interface RateTypeSelectorProps {
  rateTypes: { key: RateType; label: string; value: number }[];
  selectedRateType: RateType;
  onSelect: (type: RateType) => void;
  colors: typeof Colors.light;
}

const RateTypeSelector: React.FC<RateTypeSelectorProps> = ({
  rateTypes,
  selectedRateType,
  onSelect,
  colors,
}) => (
  <View style={[styles.rateSelector, { backgroundColor: colors.borderLight }]}>
    {rateTypes.map((rate) => {
      const isSelected = selectedRateType === rate.key;
      return (
        <Pressable
          key={rate.key}
          onPress={() => onSelect(rate.key)}
          style={[
            styles.rateButton,
            {
              backgroundColor: isSelected ? colors.surface : 'transparent',
              ...Platform.select({
                ios: isSelected ? Shadows.sm : {},
                android: { elevation: isSelected ? 2 : 0 },
              }),
            }
          ]}
        >
          <Text style={[
            styles.rateButtonLabel,
            { color: isSelected ? colors.primary : colors.textMuted }
          ]}>
            {rate.label}
          </Text>
          <Text style={[
            styles.rateButtonValue,
            { color: isSelected ? colors.text : colors.textSecondary }
          ]}>
            {formatCurrency(rate.value)}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

// ============================================
// Main Component
// ============================================

export const ExchangeRateCard: React.FC<ExchangeRateCardProps> = ({
  tasa,
  onRateTypePress,
  selectedRateType = 'especial',
  historicalData = []
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const cardScale = useRef(new Animated.Value(1)).current;
  const [internalSelectedRate, setInternalSelectedRate] = React.useState<RateType>(selectedRateType);

  const handleRateSelect = useCallback((type: RateType) => {
    setInternalSelectedRate(type);
    onRateTypePress?.(type);
  }, [onRateTypePress]);

  // Rate types configuration
  const rateTypes = useMemo(() => [
    { key: 'oficial' as RateType, label: 'Oficial', value: tasa.tasaOficial },
    { key: 'publica' as RateType, label: 'Pública', value: tasa.tasaPublica },
    { key: 'especial' as RateType, label: 'Especial', value: tasa.tasaEspecial },
  ], [tasa]);

  const currentRate = rateTypes.find((t) => t.key === internalSelectedRate)?.value || tasa.tasaEspecial;

  // Calculate buy/sell values (±2%)
  const buyValue = formatCurrency(currentRate * 1.02);
  const sellValue = formatCurrency(currentRate * 0.98);

  // Determine trend indicator based on historical data
  const trendData = useMemo(() => {
    if (historicalData.length === 0) {
      // If no historical data, use default logic
      return { trendUp: false, hasData: false };
    }

    // Sort historical data by date (newest first)
    const sortedHistorical = [...historicalData].sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    // Get the most recent historical rate (excluding today)
    const yesterdayData = sortedHistorical.find(item => {
      const itemDate = new Date(item.fecha).toDateString();
      const todayDate = new Date().toDateString();
      return itemDate !== todayDate;
    });

    if (!yesterdayData) {
      return { trendUp: false, hasData: false };
    }

    // Get the previous rate based on the selected rate type
    const getPreviousRate = () => {
      switch (internalSelectedRate) {
        case 'oficial':
          return yesterdayData.tasaOficial;
        case 'publica':
          return yesterdayData.tasaPublica;
        case 'especial':
        default:
          return yesterdayData.tasaEspecial;
      }
    };

    const previousRate = getPreviousRate();
    const trendUp = currentRate > previousRate;

    return { trendUp, hasData: true, previousRate };
  }, [historicalData, currentRate, internalSelectedRate]);

  const { trendUp } = trendData;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.cardBorder,
          transform: [{ scale: cardScale }],
          ...Platform.select({
            ios: Shadows.lg,
            android: Shadows.lg,
          }),
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Tasa de cambio para ${tasa.nombreMoneda}`}
    >
      {/* Top accent bar */}
      <LinearGradient
        colors={colors.gradientPrimary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.accentBar}
      />

      {/* Header Section */}
      <View style={styles.header}>
        {/* Currency Info */}
        <View style={styles.currencyRow}>
          <View style={[styles.flagContainer, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.flag} accessibilityLabel={`Bandera de ${tasa.nombreMoneda}`}>
              {getCurrencyFlag(tasa.codigoMoneda)}
            </Text>
          </View>
          <View style={styles.currencyDetails}>
            <View style={styles.currencyCodeRow}>
              <Text style={[styles.currencyCode, { color: colors.text }]}>
                {tasa.codigoMoneda}
              </Text>
            </View>
            <Text style={[styles.currencyName, { color: colors.textSecondary }]}>
              {tasa.nombreMoneda}
            </Text>
          </View>
        </View>

        {/* Main Rate Display */}
        <View style={styles.mainRateContainer}>
          <Text style={[styles.rateLabel, { color: colors.textMuted }]}>
            1 {tasa.codigoMoneda} equivale a
          </Text>
          <View style={styles.rateValueRow}>
            <Text style={[styles.mainRate, { color: colors.text }]}>
              {formatCurrency(currentRate, 2)}
            </Text>
            <View style={styles.trendContainer}>
              <Ionicons
                name={trendUp ? 'trending-up' : 'trending-down'}
                size={20}
                color={trendUp ? colors.error : colors.success}
              />
            </View>
          </View>
          <Text style={[styles.rateCurrency, { color: colors.primary }]}>CUP</Text>
        </View>
      </View>

      {/* Rate Type Selector */}
      <RateTypeSelector
        rateTypes={rateTypes}
        selectedRateType={internalSelectedRate}
        onSelect={handleRateSelect}
        colors={colors}
      />

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      {/* Buy/Sell Section */}
      <View style={styles.transactionSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Operaciones
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            Spread de ±2%
          </Text>
        </View>
        <View style={styles.transactionGrid}>
          <TransactionCard
            type="compra"
            value={buyValue}
            percentage="+2%"
            colors={colors}
          />
          <TransactionCard
            type="venta"
            value={sellValue}
            percentage="-2%"
            colors={colors}
          />
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.borderLight }]}>
        <View style={styles.footerContent}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.updateText, { color: colors.textMuted }]}>
            {formatDateShort(tasa.fechaActivacion, true)}
          </Text>
        </View>
        <View style={styles.footerBadge}>
          <Text style={[styles.footerBadgeText, { color: colors.primary }]}>BCC</Text>
        </View>
      </View>
    </Animated.View>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: {
    height: 3,
  },
  header: {
    padding: Platform.select({ ios: Spacing.xl, android: Spacing.lg }),
    paddingBottom: Platform.select({ ios: Spacing.lg, android: Spacing.md }),
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.select({ ios: Spacing['2xl'], android: Spacing.lg }),
  },
  flagContainer: {
    width: Platform.select({ ios: 56, android: 48 }),
    height: Platform.select({ ios: 56, android: 48 }),
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Platform.select({ ios: Spacing.lg, android: Spacing.md }),
  },
  flag: {
    fontSize: Platform.select({ ios: 32, android: 26 }),
  },
  currencyDetails: {
    flex: 1,
  },
  currencyCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  currencyCode: {
    ...Typography.headlineMedium,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    ...Typography.labelSmall,
    textTransform: 'uppercase',
  },
  currencyName: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  mainRateContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  rateLabel: {
    ...Typography.bodySmall,
    marginBottom: 2,
  },
  rateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mainRate: {
    ...Typography.headlineLarge,
  },
  trendContainer: {
    marginTop: 6,
  },
  rateCurrency: {
    ...Typography.labelMedium,
    marginTop: 2,
  },
  rateSelector: {
    flexDirection: 'row',
    marginHorizontal: Platform.select({ ios: Spacing.lg, android: Spacing.md }),
    marginBottom: Spacing.lg,
    padding: 4,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  rateButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.sm,
  },
  rateButtonLabel: {
    ...Typography.labelSmall,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  rateButtonValue: {
    ...Typography.labelMedium,
  },
  divider: {
    height: 1,
    marginHorizontal: Platform.select({ ios: Spacing.xl, android: Spacing.lg }),
  },
  transactionSection: {
    padding: Platform.select({ ios: Spacing.xl, android: Spacing.lg }),
    paddingTop: Platform.select({ ios: Spacing.lg, android: Spacing.md }),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.headlineSmall,
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
  },
  transactionGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  transactionCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Platform.select({ ios: Spacing.lg, android: Spacing.md }),
    alignItems: 'center',
  },
  transactionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  transactionIcon: {
    width: Platform.select({ ios: 28, android: 24 }),
    height: Platform.select({ ios: 28, android: 24 }),
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionLabel: {
    ...Typography.labelSmall,
    textTransform: 'uppercase',
  },
  transactionValue: {
    ...Typography.headlineSmall,
    marginBottom: Spacing.sm,
  },
  transactionCurrency: {
    ...Typography.bodySmall,
  },
  percentageBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  percentageText: {
    color: '#FFFFFF',
    ...Typography.labelSmall,
    fontWeight: '700',
  },
  footer: {
    paddingVertical: Platform.select({ ios: Spacing.md, android: Spacing.sm }),
    paddingHorizontal: Platform.select({ ios: Spacing.xl, android: Spacing.lg }),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  updateText: {
    ...Typography.bodySmall,
  },
  footerBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'currentColor',
  },
  footerBadgeText: {
    ...Typography.labelSmall,
    fontWeight: '700',
  },
});

export default ExchangeRateCard;
