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

// ============================================
// Types & Interfaces
// ============================================

type RateType = 'oficial' | 'publica' | 'especial';

interface TasaData {
  codigoMoneda: string;
  nombreMoneda: string;
  tasaOficial: number;
  tasaPublica: number;
  tasaEspecial: number;
  fechaActivacion: string;
}

interface TasaCambioItemProps {
  tasa: TasaData;
  onRateTypePress?: (type: RateType) => void;
  selectedRateType?: RateType;
  historico?: TasaCambioHistorico[];
}

// ============================================
// Utility Functions
// ============================================

const getMonedaFlag = (codigo: string): string => {
  const flags: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    MLC: '🇨🇺',
    CAD: '🇨🇦',
    MXN: '🇲🇽',
    GBP: '🇬🇧',
    CHF: '🇨🇭',
    JPY: '🇯🇵',
    CNY: '🇨🇳',
  };
  return flags[codigo] || '💱';
};

const formatDateShort = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

const formatCurrency = (value: number, decimals = 2): string => {
  return value.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

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

export const TasaCambioItem: React.FC<TasaCambioItemProps> = ({
  tasa,
  onRateTypePress,
  selectedRateType = 'especial',
  historico = []
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
  const valorCompra = formatCurrency(currentRate * 1.02);
  const valorVenta = formatCurrency(currentRate * 0.98);

  // Determine trend indicator based on historical data
  const trendData = useMemo(() => {
    if (historico.length === 0) {
      // If no historical data, use default logic
      return { trendUp: false, hasData: false };
    }

    // Sort historical data by date (newest first)
    const sortedHistorico = [...historico].sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );

    // Get the most recent historical rate (excluding today)
    const yesterdayData = sortedHistorico.find(item => {
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
  }, [historico, currentRate, internalSelectedRate]);

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
              {getMonedaFlag(tasa.codigoMoneda)}
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
              {formatCurrency(currentRate, 4)}
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
            value={valorCompra}
            percentage="+2%"
            colors={colors}
          />
          <TransactionCard
            type="venta"
            value={valorVenta}
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
            {formatDateShort(tasa.fechaActivacion)}
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
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: {
    height: 4,
  },
  header: {
    padding: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  flagContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  flag: {
    fontSize: 32,
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
    ...Typography.headlineLarge,
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
    ...Typography.bodyMedium,
    marginTop: 2,
  },
  mainRateContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  rateLabel: {
    ...Typography.bodySmall,
    marginBottom: Spacing.xs,
  },
  rateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mainRate: {
    ...Typography.displayLarge,
  },
  trendContainer: {
    marginTop: 8,
  },
  rateCurrency: {
    ...Typography.labelLarge,
    marginTop: Spacing.xs,
  },
  rateSelector: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: 4,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  rateButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  rateButtonLabel: {
    ...Typography.labelSmall,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  rateButtonValue: {
    ...Typography.labelLarge,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.xl,
  },
  transactionSection: {
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
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
    padding: Spacing.lg,
    alignItems: 'center',
  },
  transactionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  transactionIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionLabel: {
    ...Typography.labelMedium,
    textTransform: 'uppercase',
  },
  transactionValue: {
    ...Typography.headlineMedium,
    marginBottom: Spacing.sm,
  },
  transactionCurrency: {
    ...Typography.bodySmall,
  },
  percentageBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  percentageText: {
    color: '#FFFFFF',
    ...Typography.labelSmall,
    fontWeight: '700',
  },
  footer: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
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

export default TasaCambioItem;
