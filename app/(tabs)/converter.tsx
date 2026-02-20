import { CurrencyConverter } from '@/components/CurrencyConverter';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { apiService } from '@/services/api';
import { TasaCambio } from '@/types';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';

const LoadingState: React.FC = () => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.loadingIconContainer, { backgroundColor: colors.primaryLight }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
                <Text style={[styles.loadingText, { color: colors.text }]}>Cargando calculadora...</Text>
                <Text style={[styles.loadingSubtext, { color: colors.textMuted }]}>
                    Conectando con el servidor...
                </Text>
            </View>
        </View>
    );
};

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
            <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <View style={[styles.errorIconContainer, { backgroundColor: colors.errorLight }]}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                </View>
                <Text style={[styles.errorTitle, { color: colors.text }]}>Error de conexión</Text>
                <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{message}</Text>
                <View style={[styles.retryButton, { backgroundColor: colors.primary }]}>
                    <Text style={styles.retryButtonText} onPress={onRetry}>Reintentar</Text>
                </View>
            </View>
        </View>
    );
};

export const ConverterScreen: React.FC = () => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [tasas, setTasas] = useState<TasaCambio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargarTasas = async () => {
        try {
            setError(null);
            setLoading(true);
            const response = await apiService.getTasasActivas();
            if (response.success && response.data) {
                setTasas(response.data.tasas);
            } else {
                setError(response.error || 'Error al cargar las tasas');
            }
        } catch {
            setError('Error de conexión. Verifique su internet e intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarTasas();
    }, []);

    if (loading) {
        return <LoadingState />;
    }

    if (error) {
        return <ErrorState message={error} onRetry={cargarTasas} />;
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <CurrencyConverter
                tasas={tasas}
                defaultMoneda="USD"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing['3xl'],
    },
    loadingCard: {
        alignItems: 'center',
        padding: Spacing['3xl'],
        borderRadius: BorderRadius.xl,
        ...Shadows.md,
    },
    loadingIconContainer: {
        width: 80,
        height: 80,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
    },
    loadingText: {
        ...Typography.headlineSmall,
        marginBottom: Spacing.xs,
    },
    loadingSubtext: {
        ...Typography.bodySmall,
    },

    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing['3xl'],
    },
    errorCard: {
        alignItems: 'center',
        padding: Spacing['3xl'],
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        ...Shadows.md,
    },
    errorIconContainer: {
        width: 72,
        height: 72,
        borderRadius: BorderRadius.full,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
    },
    errorIcon: {
        fontSize: 32,
    },
    errorTitle: {
        ...Typography.headlineSmall,
        marginBottom: Spacing.sm,
    },
    errorMessage: {
        ...Typography.bodyMedium,
        textAlign: 'center',
        marginBottom: Spacing.xl,
    },
    retryButton: {
        paddingHorizontal: Spacing['2xl'],
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.md,
    },
    retryButtonText: {
        color: '#FFFFFF',
        ...Typography.labelLarge,
    },
});

export default ConverterScreen;
