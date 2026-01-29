import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  style,
  variant = 'default' 
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.surface,
          borderWidth: 0,
          ...Platform.select({
            ios: Shadows.lg,
            android: Shadows.lg,
          }),
        };
      case 'outlined':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.cardBorder,
        };
      case 'gradient':
        return {
          backgroundColor: 'transparent',
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          ...Platform.select({
            ios: Shadows.md,
            android: Shadows.md,
          }),
        };
    }
  };

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={colors.gradientCard as [string, string]}
        style={[styles.card, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.card, getVariantStyles(), style]}>
      {children}
    </View>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  rightElement?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  icon,
  rightElement,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerLeft}>
        {icon && (
          <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
            <Text style={styles.iconText}>{icon}</Text>
          </View>
        )}
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightElement && (
        <View style={styles.headerRight}>{rightElement}</View>
      )}
    </View>
  );
};

// Quick Stats Card Component
interface QuickStatCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  accentColor?: string;
}

export const QuickStatCard: React.FC<QuickStatCardProps> = ({
  label,
  value,
  icon,
  trend = 'neutral',
  accentColor,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return colors.success;
      case 'down':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  return (
    <View style={[
      styles.statCard, 
      { 
        backgroundColor: colors.surface,
        borderColor: colors.cardBorder,
      }
    ]}>
      <View style={[
        styles.statIconContainer,
        { backgroundColor: accentColor ? `${accentColor}20` : colors.primaryLight }
      ]}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: accentColor || getTrendColor() }]}>
        {value}
      </Text>
    </View>
  );
};

// Section Header Component
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {action}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    overflow: 'hidden',
  },
  
  // Header styles
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconText: {
    fontSize: 24,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    ...Typography.headlineSmall,
    marginBottom: 2,
  },
  subtitle: {
    ...Typography.bodySmall,
  },
  headerRight: {
    marginLeft: Spacing.md,
  },

  // Quick Stat styles
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    ...Platform.select({
      ios: Shadows.sm,
      android: Shadows.sm,
    }),
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statIcon: {
    fontSize: 18,
  },
  statLabel: {
    ...Typography.labelSmall,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  statValue: {
    ...Typography.headlineMedium,
  },

  // Section Header styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.headlineSmall,
  },
  sectionSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
});

export default Card;
