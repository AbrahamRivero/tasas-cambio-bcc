import { CurrencyConverter } from '@/components/CurrencyConverter';
import { SourceSegmentedControl } from '@/components/rates/SourceSegmentedControl';
import { VpnHint } from '@/components/rates/VpnHint';
import { ErrorState, Loading } from '@/components/ui/loading-error';
import { RateListSkeleton } from '@/components/ui/skeleton';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { apiService } from '@/services/api';
import { ratesRepository } from '@/services/rates/repository';
import type { ElToqueDaily } from '@/services/rates/types';
import { TasaCambio } from '@/types';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ConverterScreen: React.FC = () => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];
    const [currencies, setCurrencies] = useState<TasaCambio[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Conversor con fuente explícita: BCC (con spread) o elToque (valor único).
    const [sourceTab, setSourceTab] = useState<'BCC' | 'ELTOQUE'>('BCC');
    const [informal, setInformal] = useState<ElToqueDaily | null>(null);
    const [informalLoading, setInformalLoading] = useState(false);
    const [informalBlocked, setInformalBlocked] = useState(false);
    const insets = useSafeAreaInsets();

    const loadRates = async (forceRefresh = false) => {
        try {
            setError(null);
            setLoading(true);
            const response = await apiService.getActiveCurrencies({ forceRefresh });
            if (response.success && response.data) {
                setCurrencies(response.data.tasas);
            } else {
                setError(response.error || 'Error al cargar las tasas');
            }
        } catch {
            setError('Error de conexión. Verifique su internet e intente nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const loadInformalForConverter = useCallback(async (force = false) => {
        setInformalLoading(true);
        setInformalBlocked(false);
        const res = await ratesRepository.getElToqueDaily(undefined, force ? { forceRefresh: true } : undefined);
        if (res.ok && res.data) setInformal(res.data);
        else setInformalBlocked(res.blocked === true);
        setInformalLoading(false);
    }, []);

    useEffect(() => {
        loadRates();
    }, []);

    useEffect(() => {
        if (sourceTab === 'ELTOQUE' && !informal && !informalLoading) void loadInformalForConverter();
    }, [sourceTab, informal, informalLoading, loadInformalForConverter]);

    if (loading) {
        return <Loading message="Cargando calculadora..." />;
    }

    if (error) {
        return <ErrorState message={error} onRetry={() => loadRates(true)} />;
    }

    // Adaptador elToque -> forma del conversor con valor único replicado
    // (el spread se desactiva vía spreadEnabled=false, no se aplica ±2%).
    const informalAsConverter = (informal?.rates ?? []).map((r) => ({
        codigoMoneda: r.code,
        nombreMoneda: r.name,
        tasaOficial: r.value,
        tasaPublica: r.value,
        tasaEspecial: r.value,
    }));

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + Spacing.sm }]}>
            <View style={styles.sourceWrap}>
                <SourceSegmentedControl
                    value={sourceTab}
                    onChange={(t) => { if (t !== 'COMPARAR') setSourceTab(t); }}
                    options={['BCC', 'ELTOQUE']}
                />
            </View>
            {sourceTab === 'ELTOQUE' && informalAsConverter.length === 0 ? (
                <View style={styles.skeletonWrap}>
                    {informalLoading ? (
                        <RateListSkeleton rows={3} />
                    ) : (
                        <View style={{ gap: Spacing.md }}>
                            {informalBlocked ? <VpnHint onRetry={() => loadInformalForConverter(true)} /> : null}
                            <Text style={[styles.sourceNote, { color: colors.textMuted }]}>
                                Sin tasa elToque disponible.
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <CurrencyConverter
                    key={sourceTab}
                    currencies={sourceTab === 'ELTOQUE' ? informalAsConverter : currencies}
                    defaultMoneda="USD"
                    spreadEnabled={sourceTab === 'BCC'}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sourceWrap: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
    },
    sourceNote: {
        ...Typography.bodySmall,
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
    skeletonWrap: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
    },
});

export default ConverterScreen;
