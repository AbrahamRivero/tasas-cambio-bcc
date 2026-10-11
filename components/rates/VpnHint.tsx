// Aviso cuando la red bloquea tasas.eltoque.com (ETECSA/filtros):
// la BCC carga pero la calle no. Sugiere VPN + reintentar.

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';

export const VpnHint: React.FC<{ onRetry: () => void }> = ({ onRetry }) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  return (
    <View style={[styles.card, { backgroundColor: colors.warningLight, borderColor: colors.warning }]}>
      <Ionicons name="shield-half-outline" size={22} color={colors.warningDark} />
      <View style={styles.texts}>
        <Text style={[styles.title, { color: colors.warningDark }]}>
          Tu red bloquea la tasa de calle
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          Activa un VPN y pulsa Reintentar para actualizar los valores de elToque.
        </Text>
      </View>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Reintentar con VPN"
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: colors.warningDark, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={styles.btnText}>Reintentar</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  texts: { flex: 1, minWidth: 0, flexShrink: 1, marginHorizontal: Spacing.md },
  title: { ...Typography.labelMedium },
  body: { ...Typography.bodySmall, marginTop: 2, lineHeight: 18 },
  btn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  btnText: { color: '#FFFFFF', ...Typography.labelMedium },
});
