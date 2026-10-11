import * as Haptics from 'expo-haptics';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { BorderRadius, Colors, Typography } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { sortCurrencies } from '../../utils/formatters';

export const CurrencySelector: React.FC<{
  currencies: { codigoMoneda: string }[];
  selectedCurrency: string;
  onSelect: (codigo: string) => void;
  colors: typeof Colors.light;
}> = ({ currencies, selectedCurrency, onSelect, colors }) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const codes = useMemo(() => sortCurrencies([...new Set(currencies.map((t) => t.codigoMoneda))]), [currencies]);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {codes.map((code) => {
        const active = selectedCurrency === code;
        return (
          <Pressable
            key={code}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              onSelect(code);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : isDark ? '#2C2C2E' : '#E5E5EA',
              },
            ]}
          >
            <Text style={[styles.text, { color: active ? '#FFFFFF' : colors.textMuted }]}>{code}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { paddingVertical: 2, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full },
  text: { ...Typography.labelMedium },
});
