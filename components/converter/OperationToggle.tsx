import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Typography } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';
import type { OperationType } from '../../utils/rates';

export const OperationToggle: React.FC<{
  selectedOperation: OperationType;
  onSelect: (operation: OperationType) => void;
  colors: typeof Colors.light;
}> = ({ selectedOperation, onSelect }) => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = Colors[scheme ?? 'light'];
  const opts: { key: OperationType; label: string }[] = [
    { key: 'compra', label: 'Comprar' },
    { key: 'venta', label: 'Vender' },
  ];
  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
      {opts.map((o) => {
        const active = selectedOperation === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => undefined);
              onSelect(o.key);
            }}
            accessibilityRole="button"
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
            <Text style={[styles.label, { color: active ? colors.text : colors.textMuted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flexDirection: 'row', padding: 2, borderRadius: 9 },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 7 },
  label: { ...Typography.labelMedium },
});
