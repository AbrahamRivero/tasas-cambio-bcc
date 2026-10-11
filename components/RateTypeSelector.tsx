// Segmentado iOS para tipos de tasa — usado en el conversor.

import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Typography } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { RATE_TYPES } from '../utils/rates';
import type { RateType } from '../utils/rates';

export const RateTypeSelector: React.FC<{
  selectedRateType: RateType;
  onSelect: (type: RateType) => void;
}> = ({ selectedRateType, onSelect }) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const isDark = scheme === 'dark';
  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
      {RATE_TYPES.map((rate) => {
        const active = selectedRateType === rate.key;
        return (
          <Pressable
            key={rate.key}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              onSelect(rate.key);
            }}
            style={[
              styles.btn,
              active && {
                backgroundColor: isDark ? '#636366' : '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15,
                shadowRadius: 3,
                elevation: 2,
              },
            ]}
          >
            <Text style={[styles.label, { color: active ? colors.text : colors.textMuted }]}>
              {rate.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flexDirection: 'row', padding: 2, borderRadius: 9 },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 7 },
  label: { ...Typography.labelMedium, textTransform: 'capitalize' as const },
});
