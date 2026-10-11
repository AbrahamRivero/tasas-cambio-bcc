// Apple UIKit — inset grouped lists, celdas Settings, headers/footers.
// Uso: <AppleSection title footer><AppleCell .../></AppleSection>

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';

export const AppleSection: React.FC<{
  title?: string;
  footer?: string;
  children: React.ReactNode;
}> = ({ title, footer, children }) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const kids = React.Children.toArray(children);
  return (
    <View style={styles.section}>
      {title ? <Text style={[styles.header, { color: colors.textMuted }]}>{title.toUpperCase()}</Text> : null}
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        {kids.map((child, i) => (
          <View key={i}>
            {child}
            {i < kids.length - 1 ? (
              <View style={[styles.separator, { backgroundColor: colors.cardBorder, marginLeft: 58 }]} />
            ) : null}
          </View>
        ))}
      </View>
      {footer ? <Text style={[styles.footer, { color: colors.textMuted }]}>{footer}</Text> : null}
    </View>
  );
};

export const AppleCell: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  subtitle?: string;
  value?: string;
  valueColor?: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  chevron?: boolean;
  onPress?: () => void;
}> = ({ icon, iconBg, title, subtitle, value, valueColor, badge, badgeColor, badgeBg, chevron, onPress }) => {
  const scheme = useColorScheme();
  const colors = Colors[scheme ?? 'light'];
  const inner = (
    <View style={styles.cell}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={17} color="#FFFFFF" />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={[styles.pill, { backgroundColor: badgeBg ?? colors.borderLight }]}>
          <Text style={[styles.pillText, { color: badgeColor ?? colors.textMuted }]}>{badge}</Text>
        </View>
      ) : null}
      {value ? (
        <Text style={[styles.value, { color: valueColor ?? colors.textMuted }]}>{value}</Text>
      ) : null}
      {chevron || onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: 4 }} />
      ) : null}
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable onPress={onPress} android_ripple={{ color: colors.borderLight }} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
      {inner}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  header: {
    ...Typography.labelSmall,
    marginBottom: 6,
    marginLeft: 4,
  },
  group: {
    borderRadius: BorderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  footer: {
    ...Typography.bodySmall,
    marginTop: 6,
    marginLeft: 4,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  iconBox: {
    width: 29,
    height: 29,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  texts: { flex: 1 },
  title: { ...Typography.bodyLarge, fontWeight: '400' as const },
  subtitle: { ...Typography.bodySmall, marginTop: 1 },
  value: { ...Typography.bodyLarge, marginLeft: Spacing.sm },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  pillText: { ...Typography.labelSmall, fontWeight: '600' as const },
});
