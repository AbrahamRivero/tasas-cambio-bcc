import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { formatCurrency } from '../../utils/formatters';
import type { OperationType } from '../../utils/rates';

interface ResultCardProps {
  operation: OperationType;
  inputAmount: number;
  outputAmount: number;
  inputCurrency: string;
  outputCurrency: string;
  rate: number;
  colors: typeof Colors.light;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  operation,
  inputAmount,
  outputAmount,
  inputCurrency,
  outputCurrency,
  rate,
  colors,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.02,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [outputAmount, pulseAnim]);

  const isCompra = operation === 'compra';
  const gradientColors = isCompra
    ? [colors.success, colors.successDark] as [string, string]
    : [colors.warning, colors.warningDark] as [string, string];
  const foreign = isCompra ? outputCurrency : inputCurrency;

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.resultCard}
      >
        <View style={styles.resultHeader}>
          <View style={styles.resultIconContainer}>
            <Ionicons
              name={isCompra ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={24}
              color="rgba(255,255,255,0.9)"
            />
          </View>
          <View>
            <Text style={styles.resultLabel}>
              {isCompra ? 'Recibes' : 'Obtienes'}
            </Text>
            <Text style={styles.resultSubLabel}>
              Al {isCompra ? 'comprar' : 'vender'} {inputCurrency}
            </Text>
          </View>
        </View>

        <View style={styles.resultAmountContainer}>
          <Text
            style={styles.resultAmount}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {formatCurrency(outputAmount)}
          </Text>
          <Text style={styles.resultCurrency}>{outputCurrency}</Text>
        </View>

        <View style={styles.resultDivider} />

        <View style={styles.resultDetails}>
          <View style={styles.resultDetailRow}>
            <Text style={styles.resultDetailLabel}>Monto ingresado</Text>
            <Text style={styles.resultDetailValue}>
              {formatCurrency(inputAmount)} {inputCurrency}
            </Text>
          </View>
          <View style={styles.resultDetailRow}>
            <Text style={styles.resultDetailLabel}>Tasa aplicada</Text>
            <Text style={styles.resultDetailValue}>
              1 {foreign} = {formatCurrency(rate, 2)}
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  resultCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  resultIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultLabel: {
    ...Typography.labelLarge,
    color: 'rgba(255,255,255,0.9)',
  },
  resultSubLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
  },
  resultAmountContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  resultAmount: {
    ...Typography.displayMedium,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  resultCurrency: {
    ...Typography.headlineSmall,
    color: 'rgba(255,255,255,0.9)',
    marginTop: Spacing.xs,
  },
  resultDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: Spacing.lg,
  },
  resultDetails: {
    gap: Spacing.sm,
  },
  resultDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultDetailLabel: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
  },
  resultDetailValue: {
    ...Typography.labelMedium,
    color: '#FFFFFF',
  },
});
