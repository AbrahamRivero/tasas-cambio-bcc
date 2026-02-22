'use client';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
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
import { formatCurrency, getCurrencyFlag, sortCurrencies } from '../utils/formatters';

// ============================================
// Types & Interfaces
// ============================================

type OperationType = 'compra' | 'venta';
type RateType = 'oficial' | 'publica' | 'especial';

interface RateData {
    codigoMoneda: string;
    nombreMoneda: string;
    tasaOficial: number;
    tasaPublica: number;
    tasaEspecial: number;
}

interface ConverterProps {
    currencies: RateData[];
    defaultMoneda?: string;
}

// ============================================
// Sub Components
// ============================================

interface CurrencySelectorProps {
    currencies: RateData[];
    selectedCurrency: string;
    onSelect: (codigo: string) => void;
    colors: typeof Colors.light;
}

const CurrencySelector: React.FC<CurrencySelectorProps> = ({
    currencies,
    selectedCurrency,
    onSelect,
    colors,
}) => {
const sortedTasas = useMemo(() => {
        const sortedCodes = sortCurrencies(currencies.map(t => t.codigoMoneda));
        return sortedCodes.map(code => currencies.find(t => t.codigoMoneda === code)!).filter(Boolean);
    }, [currencies]);
    
    return (
    <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.monedaSelectorContainer}
    >
        {sortedTasas.map((tasa) => {
            const isSelected = selectedCurrency === tasa.codigoMoneda;
            return (
                <Pressable
                    key={tasa.codigoMoneda}
                    onPress={() => onSelect(tasa.codigoMoneda)}
                    style={[
                        styles.monedaButton,
                        {
                            backgroundColor: isSelected ? colors.primary : colors.surface,
                            borderColor: isSelected ? colors.primary : colors.border,
                            ...Platform.select({
                                ios: isSelected ? Shadows.md : Shadows.sm,
                                android: isSelected ? Shadows.md : Shadows.sm,
                            }),
                        }
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`Seleccionar ${tasa.nombreMoneda}`}
                >
                    <Text style={styles.monedaFlag}>{getCurrencyFlag(tasa.codigoMoneda)}</Text>
                    <Text style={[
                        styles.monedaCode,
                        { color: isSelected ? colors.textInverse : colors.text }
                    ]}>
                        {tasa.codigoMoneda}
                    </Text>
                </Pressable>
            );
        })}
    </ScrollView>
    );
};

interface OperationToggleProps {
    selectedOperation: OperationType;
    onSelect: (operation: OperationType) => void;
    colors: typeof Colors.light;
}

const OperationToggle: React.FC<OperationToggleProps> = ({
    selectedOperation,
    onSelect,
    colors,
}) => {
    const slideAnim = useRef(new Animated.Value(selectedOperation === 'compra' ? 0 : 1)).current;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: selectedOperation === 'compra' ? 0 : 1,
            useNativeDriver: false,
            tension: 50,
            friction: 10,
        }).start();
    }, [selectedOperation, slideAnim]);

    const slidePosition = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '50%'],
    });

    return (
        <View style={[styles.operationToggle, { backgroundColor: colors.borderLight }]}>
            <Animated.View
                style={[
                    styles.operationSlider,
                    {
                        backgroundColor: selectedOperation === 'compra' ? colors.success : colors.warning,
                        left: slidePosition,
                    }
                ]}
            />
            <Pressable
                style={styles.operationButton}
                onPress={() => onSelect('compra')}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedOperation === 'compra' }}
            >
                <Ionicons
                    name="arrow-down-circle"
                    size={20}
                    color={selectedOperation === 'compra' ? colors.textInverse : colors.textMuted}
                />
                <Text style={[
                    styles.operationLabel,
                    { color: selectedOperation === 'compra' ? colors.textInverse : colors.textMuted }
                ]}>
                    Comprar
                </Text>
            </Pressable>
            <Pressable
                style={styles.operationButton}
                onPress={() => onSelect('venta')}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedOperation === 'venta' }}
            >
                <Ionicons
                    name="arrow-up-circle"
                    size={20}
                    color={selectedOperation === 'venta' ? colors.textInverse : colors.textMuted}
                />
                <Text style={[
                    styles.operationLabel,
                    { color: selectedOperation === 'venta' ? colors.textInverse : colors.textMuted }
                ]}>
                    Vender
                </Text>
            </Pressable>
        </View>
    );
};

interface RateTypeSelectorProps {
    selectedRateType: RateType;
    onSelect: (type: RateType) => void;
    colors: typeof Colors.light;
}

const RateTypeSelector: React.FC<RateTypeSelectorProps> = ({
    selectedRateType,
    onSelect,
    colors,
}) => {
    const rateTypes: { key: RateType; label: string }[] = [
        { key: 'oficial', label: 'Oficial' },
        { key: 'publica', label: 'Publica' },
        { key: 'especial', label: 'Especial' },
    ];

    return (
        <View style={[styles.rateTypeContainer, { backgroundColor: colors.borderLight }]}>
            {rateTypes.map((rate) => {
                const isSelected = selectedRateType === rate.key;
                return (
                    <Pressable
                        key={rate.key}
                        onPress={() => onSelect(rate.key)}
                        style={[
                            styles.rateTypeButton,
                            {
                                backgroundColor: isSelected ? colors.surface : 'transparent',
                                ...Platform.select({
                                    ios: isSelected ? Shadows.sm : {},
                                    android: { elevation: isSelected ? 2 : 0 },
                                }),
                            }
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                    >
                        <Text style={[
                            styles.rateTypeLabel,
                            { color: isSelected ? colors.primary : colors.textMuted }
                        ]}>
                            {rate.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
};

interface ResultCardProps {
    operation: OperationType;
    inputAmount: number;
    outputAmount: number;
    inputCurrency: string;
    outputCurrency: string;
    rate: number;
    colors: typeof Colors.light;
}

const ResultCard: React.FC<ResultCardProps> = ({
    operation,
    inputAmount,
    outputAmount,
    inputCurrency,
    outputCurrency,
    rate,
    colors,
}) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.02,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    }, [outputAmount, pulseAnim]);

    const isCompra = operation === 'compra';
    const gradientColors = isCompra
        ? [colors.success, colors.successDark] as [string, string]
        : [colors.warning, colors.warningDark] as [string, string];

    return (
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resultCard}
            >
                <View style={styles.resultHeader}>
                    <View style={styles.resultIconContainer}>
                        <Ionicons
                            name={isCompra ? 'arrow-down-circle' : 'arrow-up-circle'}
                            size={24}
                            color="rgba(255,255,255,0.9)"
                        />
                    </View>
                    <View>
                        <Text style={styles.resultLabel}>
                            {isCompra ? 'Recibes' : 'Obtienes'}
                        </Text>
                        <Text style={styles.resultSubLabel}>
                            Al {isCompra ? 'comprar' : 'vender'} {inputCurrency}
                        </Text>
                    </View>
                </View>

                <View style={styles.resultAmountContainer}>
                    <Text style={styles.resultAmount}>
                        {formatCurrency(outputAmount)}
                    </Text>
                    <Text style={styles.resultCurrency}>{outputCurrency}</Text>
                </View>

                <View style={styles.resultDivider} />

                <View style={styles.resultDetails}>
                    <View style={styles.resultDetailRow}>
                        <Text style={styles.resultDetailLabel}>Monto ingresado</Text>
                        <Text style={styles.resultDetailValue}>
                            {formatCurrency(inputAmount)} {inputCurrency}
                        </Text>
                    </View>
                    <View style={styles.resultDetailRow}>
                        <Text style={styles.resultDetailLabel}>Tasa aplicada</Text>
                        <Text style={styles.resultDetailValue}>
                            1 USD = {formatCurrency(rate, 2)} CUP
                        </Text>
                    </View>
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

// ============================================
// Quick Amount Buttons
// ============================================

interface QuickAmountProps {
    amounts: number[];
    onSelect: (amount: number) => void;
    colors: typeof Colors.light;
    currency: string;
}

const QuickAmountButtons: React.FC<QuickAmountProps> = ({
    amounts,
    onSelect,
    colors,
    currency,
}) => (
    <View style={styles.quickAmountContainer}>
        <Text style={[styles.quickAmountLabel, { color: colors.textMuted }]}>
            Montos rapidos
        </Text>
        <View style={styles.quickAmountRow}>
            {amounts.map((amount) => (
                <Pressable
                    key={amount}
                    onPress={() => onSelect(amount)}
                    style={[
                        styles.quickAmountButton,
                        {
                            backgroundColor: colors.primaryLight,
                            borderColor: colors.primary,
                        }
                    ]}
                >
                    <Text style={[styles.quickAmountText, { color: colors.primary }]}>
                        {amount} {currency}
                    </Text>
                </Pressable>
            ))}
        </View>
    </View>
);

// ============================================
// Main Component
// ============================================

export const CurrencyConverter: React.FC<ConverterProps> = ({
    currencies,
    defaultMoneda,
}) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const [selectedCurrency, setSelectedMoneda] = useState(defaultMoneda || currencies[0]?.codigoMoneda || 'USD');
    const [selectedOperation, setSelectedOperation] = useState<OperationType>('compra');
    const [selectedRateType, setSelectedRateType] = useState<RateType>('especial');
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<TextInput>(null);

    const parseInputAmount = (value: string): number => {
        const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
    };

    const selectedTasa = useMemo(() =>
        currencies.find(t => t.codigoMoneda === selectedCurrency) || currencies[0],
        [currencies, selectedCurrency]
    );

    const currentRate = useMemo(() => {
        if (!selectedTasa) return 0;
        const baseRate = {
            oficial: selectedTasa.tasaOficial,
            publica: selectedTasa.tasaPublica,
            especial: selectedTasa.tasaEspecial,
        }[selectedRateType];

        // Apply spread: +2% for buying, -2% for selling
        return selectedOperation === 'compra'
            ? baseRate * 1.02
            : baseRate * 0.98;
    }, [selectedTasa, selectedRateType, selectedOperation]);

    const inputAmount = parseInputAmount(inputValue);

    const outputAmount = useMemo(() => {
        if (selectedOperation === 'compra') {
            // Buying foreign currency: input CUP, output foreign
            return inputAmount / currentRate;
        } else {
            // Selling foreign currency: input foreign, output CUP
            return inputAmount * currentRate;
        }
    }, [inputAmount, currentRate, selectedOperation]);

    const handleQuickAmount = useCallback((amount: number) => {
        setInputValue(amount.toString());
    }, []);

    const handleClearInput = useCallback(() => {
        setInputValue('');
        inputRef.current?.focus();
    }, []);

    const quickAmounts = selectedOperation === 'compra'
        ? [100, 500, 1000, 5000]
        : [10, 50, 100, 500];

    const inputCurrency = selectedOperation === 'compra' ? 'CUP' : selectedCurrency;
    const outputCurrency = selectedOperation === 'compra' ? selectedCurrency : 'CUP';

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {/* Header */}
            <LinearGradient
                colors={colors.gradientPrimary as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View style={styles.headerIconContainer}>
                        <Ionicons name="calculator" size={28} color="rgba(255,255,255,0.9)" />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Calculadora</Text>
                        <Text style={styles.headerSubtitle}>Calcula tu cambio al instante</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* Main Card */}
            <View style={[
                styles.mainCard,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    ...Platform.select({
                        ios: Shadows.lg,
                        android: Shadows.lg,
                    }),
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

                {/* Rate Type Selector */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                        Tipo de tasa
                    </Text>
                    <RateTypeSelector
                        selectedRateType={selectedRateType}
                        onSelect={setSelectedRateType}
                        colors={colors}
                    />
                    <View style={styles.rateInfoRow}>
                        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
                        <Text style={[styles.rateInfoText, { color: colors.textMuted }]}>
                            Tasa actual: 1 {selectedCurrency} = {formatCurrency(currentRate, 2)} CUP
                            {selectedOperation === 'compra' ? ' (+2%)' : ' (-2%)'}
                        </Text>
                    </View>
                </View>

                {/* Amount Input */}
                <View style={styles.section}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                        {selectedOperation === 'compra'
                            ? 'Monto en CUP a cambiar'
                            : `Monto en ${selectedCurrency} a vender`
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
                                {selectedOperation === 'compra' ? '+2%' : '-2%'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                            Tasa base ({selectedRateType})
                        </Text>
                        <Text style={[styles.infoValue, { color: colors.text }]}>
                            {formatCurrency(
                                selectedRateType === 'oficial'
                                    ? selectedTasa?.tasaOficial || 0
                                    : selectedRateType === 'publica'
                                        ? selectedTasa?.tasaPublica || 0
                                        : selectedTasa?.tasaEspecial || 0,
                                2
                            )} CUP
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

            <View style={{ height: 100 }} />
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
        paddingTop: Spacing['4xl'],
        paddingBottom: Spacing['3xl'],
        paddingHorizontal: Spacing.xl,
        borderBottomLeftRadius: BorderRadius['2xl'],
        borderBottomRightRadius: BorderRadius['2xl'],
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    headerIconContainer: {
        width: 52,
        height: 52,
        borderRadius: BorderRadius.lg,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        ...Typography.headlineLarge,
        color: '#FFFFFF',
    },
    headerSubtitle: {
        ...Typography.bodyMedium,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    mainCard: {
        marginHorizontal: Spacing.lg,
        marginTop: -Spacing.xl,
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        padding: Spacing.xl,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionLabel: {
        ...Typography.labelMedium,
        textTransform: 'uppercase',
        marginBottom: Spacing.md,
    },
    monedaSelectorContainer: {
        paddingVertical: Spacing.xs,
        gap: Spacing.sm,
    },
    monedaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        gap: Spacing.sm,
    },
    monedaFlag: {
        fontSize: 20,
    },
    monedaCode: {
        ...Typography.labelLarge,
    },
    operationToggle: {
        flexDirection: 'row',
        borderRadius: BorderRadius.lg,
        padding: 4,
        position: 'relative',
    },
    operationSlider: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        width: '50%',
        borderRadius: BorderRadius.md,
    },
    operationButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        zIndex: 1,
    },
    operationLabel: {
        ...Typography.labelLarge,
    },
    rateTypeContainer: {
        flexDirection: 'row',
        borderRadius: BorderRadius.md,
        padding: 4,
        gap: 4,
    },
    rateTypeButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.sm,
    },
    rateTypeLabel: {
        ...Typography.labelMedium,
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
    quickAmountContainer: {
        marginTop: Spacing.lg,
    },
    quickAmountLabel: {
        ...Typography.labelSmall,
        marginBottom: Spacing.sm,
    },
    quickAmountRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    quickAmountButton: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
    },
    quickAmountText: {
        ...Typography.labelMedium,
    },
    resultSection: {
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.xl,
    },
    resultCard: {
        borderRadius: BorderRadius.xl,
        padding: Spacing.xl,
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        marginBottom: Spacing.lg,
    },
    resultIconContainer: {
        width: 44,
        height: 44,
        borderRadius: BorderRadius.md,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultLabel: {
        ...Typography.labelLarge,
        color: 'rgba(255,255,255,0.9)',
    },
    resultSubLabel: {
        ...Typography.bodySmall,
        color: 'rgba(255,255,255,0.7)',
    },
    resultAmountContainer: {
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    resultAmount: {
        ...Typography.displayLarge,
        color: '#FFFFFF',
        fontSize: 48,
    },
    resultCurrency: {
        ...Typography.headlineSmall,
        color: 'rgba(255,255,255,0.9)',
        marginTop: Spacing.xs,
    },
    resultDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginVertical: Spacing.lg,
    },
    resultDetails: {
        gap: Spacing.sm,
    },
    resultDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resultDetailLabel: {
        ...Typography.bodySmall,
        color: 'rgba(255,255,255,0.7)',
    },
    resultDetailValue: {
        ...Typography.labelMedium,
        color: '#FFFFFF',
    },
    infoCard: {
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.xl,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        padding: Spacing.lg,
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
    },
    infoLabel: {
        ...Typography.bodyMedium,
    },
    infoValue: {
        ...Typography.labelMedium,
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
        gap: Spacing.sm,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.xl,
        padding: Spacing.lg,
    },
    disclaimerText: {
        ...Typography.bodySmall,
        flex: 1,
    },
});

export default CurrencyConverter;
