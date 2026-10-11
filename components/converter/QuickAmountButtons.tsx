import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';

interface QuickAmountProps {
  amounts: number[];
  onSelect: (amount: number) => void;
  colors: typeof Colors.light;
  currency: string;
}

const QuickAmountButtonsInner: React.FC<QuickAmountProps> = ({
  amounts,
  onSelect,
  colors,
  currency,
}) => {
  return (
    <View style={styles.quickAmountContainer}>
      <Text style={[styles.quickAmountLabel, { color: colors.textMuted }]}>
        Montos rapidos
      </Text>
      <View style={styles.quickAmountRow}>
        {amounts.map((amount) => {
          return (
            <Pressable
              key={amount}
              onPress={() => onSelect(amount)}
              style={[
                styles.quickAmountButton,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text style={[styles.quickAmountText, { color: colors.primary }]}>
                {amount} {currency}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

export const QuickAmountButtons = React.memo(QuickAmountButtonsInner);

const styles = StyleSheet.create({
  quickAmountContainer: {
    marginTop: Spacing.md,
  },
  quickAmountLabel: {
    ...Typography.labelSmall,
    marginBottom: Spacing.sm,
  },
  quickAmountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  quickAmountButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Platform.select({ ios: Spacing.md, android: Spacing.sm }),
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  quickAmountText: {
    ...Typography.labelSmall,
  },
});
