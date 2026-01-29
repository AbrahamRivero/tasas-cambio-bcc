import { Calculator } from '@/components/Calculator';
import { Colors } from '@/constants/theme';
import { apiService } from '@/services/api';
import { TasaCambio } from '@/types';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';

export const CalculadoraScreen: React.FC = () => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [tasas, setTasas] = useState<TasaCambio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const cargarTasas = async () => {
            try {
                setLoading(true);
                const response = await apiService.getTasasActivas();
                if (response.success && response.data) {
                    setTasas(response.data.tasas);
                } else {
                    setError(response.error || 'Error al cargar las tasas');
                }
            } catch {
                setError('Error de conexión al servidor');
            } finally {
                setLoading(false);
            }
        };

        cargarTasas();
    }, []);

    if (loading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }, styles.centered]}>
                <Text style={[styles.errorText, { color: colors.error }]}>
                    {error}
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Calculator
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
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
});

export default CalculadoraScreen;
