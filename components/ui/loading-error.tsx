import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../constants/theme';
import { useColorScheme } from '../../hooks/use-color-scheme';

interface LoadingProps {
  message?: string;
  submessage?: string;
}

export const Loading: React.FC<LoadingProps> = ({ 
  message = 'Cargando...', 
  submessage = 'Conectando con el servidor...' 
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
        <Text style={[styles.subtext, { color: colors.textMuted }]}>
          {submessage}
        </Text>
      </View>
    </View>
  );
};

interface ErrorProps {
  message: string;
  onRetry?: () => void;
  title?: string;
}

export const ErrorState: React.FC<ErrorProps> = ({ 
  message, 
  onRetry,
  title = 'Error de conexión'
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="alert-circle" size={32} color={colors.error} />
        </View>
        <Text style={[styles.text, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtext, { color: colors.textSecondary }]}>{message}</Text>
        {onRetry && (
          <View style={[styles.button, { backgroundColor: colors.primary }]}>
            <Text style={styles.buttonText} onPress={onRetry}>
              Reintentar
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

interface EmptyProps {
  message: string;
  title?: string;
}

export const EmptyState: React.FC<EmptyProps> = ({ 
  message,
  title = 'Sin resultados'
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.borderLight }]}>
          <Ionicons name="search-outline" size={32} color={colors.textMuted} />
        </View>
        <Text style={[styles.text, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtext, { color: colors.textMuted }]}>{message}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
  },
  card: {
    alignItems: 'center',
    padding: Spacing['3xl'],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    ...Shadows.md,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  text: {
    ...Typography.headlineSmall,
    marginBottom: Spacing.sm,
  },
  subtext: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  button: {
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    color: '#FFFFFF',
    ...Typography.labelLarge,
  },
});
