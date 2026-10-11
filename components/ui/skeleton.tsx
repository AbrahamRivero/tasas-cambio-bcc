// Skeletons estilo Apple: placeholders pulsantes con la forma de las celdas.
// Se muestran mientras la red responde, en vez de spinner genérico.

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { BorderRadius, Colors, Spacing } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';

function usePulse(): Animated.Value {
  const v = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0.35, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return v;
}

const Block: React.FC<{ width: number | `${number}%`; height: number; radius?: number }> = ({
  width,
  height,
  radius = 6,
}) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const opacity = usePulse();
  return (
    <Animated.View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.borderLight,
        opacity,
      }}
    />
  );
};

const CellSkeleton: React.FC = () => {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <View style={styles.row}>
        <Block width={32} height={32} radius={8} />
        <View style={styles.texts}>
          <Block width="40%" height={14} />
          <View style={{ height: 6 }} />
          <Block width="70%" height={11} />
        </View>
        <Block width={64} height={16} />
      </View>
    </View>
  );
};

export const RateListSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <View style={{ gap: 10 }} accessibilityLabel="Cargando tasas…">
    {Array.from({ length: rows }).map((_, i) => (
      <CellSkeleton key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  texts: { flex: 1, minWidth: 0, marginHorizontal: Spacing.md },
});
