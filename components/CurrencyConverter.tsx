import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { formatCurrency, getCurrencyFlag } from '../utils/formatters';
import type { OperationType, RateType } from '../utils/rates';
import { getRateByType, spreadLabel } from '../utils/rates';
import { convertAmount, getRateWithSpread, parseInputAmount, QUICK_AMOUNTS_COMPRA, QUICK_AMOUNTS_VENTA } from '../utils/conversion';
import type { ConverterTasa } from '../utils/conversion';
import { CurrencySelector } from './converter/CurrencySelector';
import { OperationToggle } from './converter/OperationToggle';
import { QuickAmountButtons } from './converter/QuickAmountButtons';
import { ResultCard } from './converter/ResultCard';
import { RateTypeSelector } from './RateTypeSelector';

// ============================================
// Types & Interfaces
// ============================================

interface ConverterProps {
    currencies: ConverterTasa[];
    defaultMoneda?: string;
    /** BCC aplica spread ±2% compra/venta; elToque es valor único sin spread. */
    spreadEnabled?: boolean;
}

// ============================================
// Main Component
// ============================================

export const CurrencyConverter: React.FC<ConverterProps> = ({
    currencies,
    defaultMoneda,
    spreadEnabled = true,
}) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [selectedCurrency, setSelectedMoneda] = useState(defaultMoneda || currencies[0]?.codigoMoneda || 'USD');
    const [selectedOperation, setSelectedOperation] = useState<OperationType>('compra');
    const [selectedRateType, setSelectedRateType] = useState<RateType>('especial');
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<TextInput>(null);

    const selectedTasa = useMemo(() =>
        currencies.find(t => t.codigoMoneda === selectedCurrency) || currencies[0],
        [currencies, selectedCurrency]
    );

    const currentRate = spreadEnabled
        ? getRateWithSpread(selectedTasa, selectedRateType, selectedOperation)
        : getRateByType(selectedTasa, 'especial');

    const inputAmount = parseInputAmount(inputValue);

    const outputAmount = convertAmount(inputAmount, currentRate, selectedOperation);

    const handleQuickAmount = useCallback((amount: number) => {
        setInputValue(amount.toString());
    }, []);

    const handleClearInput = useCallback(() => {
        setInputValue('');
        inputRef.current?.focus();
    }, []);

    const quickAmounts = selectedOperation === 'compra'
        ? QUICK_AMOUNTS_COMPRA
        : QUICK_AMOUNTS_VENTA;

    const inputCurrency = selectedOperation === 'compra' ? 'CUP' : selectedCurrency;
    const outputCurrency = selectedOperation === 'compra' ? selectedCurrency : 'CUP';

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {/* Header Apple */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Convertir</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                    Calcula tu cambio al instante
                </Text>
            </View>

            {/* Main Card */}
            <View style={[
                styles.mainCard,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.cardBorder,
                    ...(Platform.OS === 'android' ? { elevation: 1 } : Shadows.md),
                }
            ]}>
                {/* Currency Selector */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                        Selecciona la moneda
                    </Text>
                    <CurrencySelector
                        currencies={currencies}
                        selectedCurrency={selectedCurrency}
                        onSelect={setSelectedMoneda}
                        colors={colors}
                    />
                </View>

                {/* Operation Toggle */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                        Tipo de operacion
                    </Text>
                    <OperationToggle
                        selectedOperation={selectedOperation}
                        onSelect={setSelectedOperation}
                        colors={colors}
                    />
                </View>

                {/* Rate Type Selector (solo BCC: oficial/pública/especial) */}
                {spreadEnabled ? (
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                        Tipo de tasa
                    </Text>
                    <RateTypeSelector
                        selectedRateType={selectedRateType}
                        onSelect={setSelectedRateType}
                    />
                    <View style={styles.rateInfoRow}>
                        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                        <Text style={[styles.rateInfoText, { color: colors.textMuted }]}>
                            Tasa actual: 1 {selectedCurrency} = {formatCurrency(currentRate, 2)}
                            {' '}({spreadLabel(selectedOperation)})
                        </Text>
                    </View>
                </View>
                ) : (
                <View style={styles.section}>
                    <View style={styles.rateInfoRow}>
                        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                        <Text style={[styles.rateInfoText, { color: colors.textMuted }]}>
                            Tasa actual: 1 {selectedCurrency} = {formatCurrency(currentRate, 2)}
                        </Text>
                    </View>
                </View>
                )}

                {/* Amount Input */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                        {selectedOperation === 'compra'
                            ? 'Monto a cambiar'
                            : 'Monto a vender'
                        }
                    </Text>
                    <View style={[
                        styles.inputContainer,
                        {
                            backgroundColor: colors.borderLight,
                            borderColor: inputValue ? colors.primary : colors.border,
                        }
                    ]}>
                        <View style={[styles.inputCurrencyBadge, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.inputCurrencyText, { color: colors.primary }]}>
                                {inputCurrency}
                            </Text>
                        </View>
                        <TextInput
                            ref={inputRef}
                            style={[styles.input, { color: colors.text }]}
                            placeholder="0.00"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="decimal-pad"
                            value={inputValue}
                            onChangeText={setInputValue}
                            accessibilityLabel={`Ingresa el monto en ${inputCurrency}`}
                        />
                        {inputValue.length > 0 && (
                            <Pressable
                                onPress={handleClearInput}
                                style={styles.clearButton}
                                accessibilityRole="button"
                                accessibilityLabel="Limpiar monto"
                            >
                                <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                            </Pressable>
                        )}
                    </View>

                    {/* Quick Amount Buttons */}
                    <QuickAmountButtons
                        amounts={quickAmounts}
                        onSelect={handleQuickAmount}
                        colors={colors}
                        currency={inputCurrency}
                    />
                </View>
            </View>

            {/* Result Card */}
            {inputAmount > 0 && (
                <View style={styles.resultSection}>
                    <ResultCard
                        operation={selectedOperation}
                        inputAmount={inputAmount}
                        outputAmount={outputAmount}
                        inputCurrency={inputCurrency}
                        outputCurrency={outputCurrency}
                        rate={currentRate}
                        colors={colors}
                    />
                </View>
            )}

            {/* Exchange Info */}
            <View style={[
                styles.infoCard,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    ...Platform.select({
                        ios: Shadows.sm,
                        android: Shadows.sm,
                    }),
                }
            ]}>
                <View style={styles.infoHeader}>
                    <Ionicons name="information-circle" size={20} color={colors.primary} />
                    <Text style={[styles.infoTitle, { color: colors.text }]}>
                        Informacion del cambio
                    </Text>
                </View>
                <View style={styles.infoContent}>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                            Moneda seleccionada
                        </Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                            {getCurrencyFlag(selectedCurrency)} {selectedTasa?.nombreMoneda}
                        </Text>
                    </View>
                    {spreadEnabled ? (
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                            Spread aplicado
                        </Text>
                        <View style={[
                            styles.spreadBadge,
                            { backgroundColor: selectedOperation === 'compra' ? colors.successLight : colors.warningLight }
                        ]}>
                            <Text style={[
                                styles.spreadText,
                                { color: selectedOperation === 'compra' ? colors.successDark : colors.warningDark }
                            ]}>
                                {spreadLabel(selectedOperation)}
                            </Text>
                        </View>
                    </View>
                    ) : null}
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                            Tasa {spreadEnabled ? `base (${selectedRateType})` : 'elToque'}
                        </Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                            {formatCurrency(spreadEnabled ? getRateByType(selectedTasa, selectedRateType) : currentRate, 2)}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimer}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.textMuted} />
                <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
                    Las tasas mostradas son referenciales. Las operaciones finales pueden variar según disponibilidad.
                </Text>
            </View>

            <View style={{ height: Spacing.lg }} />
        </ScrollView>
    );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },
    headerTitle: {
        ...Typography.displayLarge,
    },
    headerSubtitle: {
        ...Typography.bodySmall,
        marginTop: 2,
    },
    mainCard: {
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        padding: Spacing.lg,
    },
    section: {
        marginBottom: Spacing.lg,
    },
    sectionLabel: {
        ...Typography.labelMedium,
        textTransform: 'uppercase',
        marginBottom: Spacing.md,
    },
    rateInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        marginTop: Spacing.sm,
    },
    rateInfoText: {
        ...Typography.bodySmall,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        paddingHorizontal: Spacing.md,
        height: 60,
    },
    inputCurrencyBadge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.sm,
        marginRight: Spacing.md,
    },
    inputCurrencyText: {
        ...Typography.labelLarge,
    },
    input: {
        flex: 1,
        ...Typography.headlineMedium,
        paddingVertical: 0,
    },
    clearButton: {
        padding: Spacing.xs,
    },
    resultSection: {
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
    },
    infoCard: {
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        padding: Spacing.md,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    infoTitle: {
        ...Typography.labelLarge,
    },
    infoContent: {
        gap: Spacing.md,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.md,
    },
    infoLabel: {
        ...Typography.bodyMedium,
        flexShrink: 1,
        minWidth: 0,
    },
    infoValue: {
        ...Typography.labelMedium,
        flexShrink: 1,
        minWidth: 0,
        textAlign: 'right' as const,
    },
    spreadBadge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    spreadText: {
        ...Typography.labelSmall,
        fontWeight: '700',
    },
    disclaimer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        padding: Spacing.md,
    },
    disclaimerText: {
        ...Typography.bodySmall,
        flex: 1,
        flexShrink: 1,
        minWidth: 0,
        marginLeft: Spacing.sm,
        lineHeight: 20,
    },
});

export default CurrencyConverter;
