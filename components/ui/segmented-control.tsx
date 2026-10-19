// UISegmentedControl auténtico: fondo systemFill, thumb blanco con sombra.
// Genérico sobre la clave para reutilizarlo en varias vistas (fuente, ventana).

import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Typography } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';

export interface SegmentedOption<T extends string> {
  key: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (key: T) => void;
  accessibilityLabel: string;
}) {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const isDark = scheme === 'dark';
  return (
    <View
      style={[styles.root, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      {options.map((t) => {
        const active = value === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              onChange(t.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
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
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    padding: 2,
    borderRadius: 9,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 7,
  },
  label: {
    ...Typography.labelMedium,
  },
});
