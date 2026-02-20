/* eslint-disable react-hooks/exhaustive-deps */

import { ExchangeRateList } from '@/components/ExchangeRateList';
import { Card } from '@/components/ui/card';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme.web';
import { apiService } from '@/services/api';
import { MONEDAS_PRINCIPALES } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HistoricoScreen() {
  const [tasas, setTasas] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const loadHistoricalRates = useCallback(async (currencyCode?: string) => {
    try {
      setError('');
      setLoading(true);
      const response = await apiService.getTasasHistorico(currencyCode);
      
      if (response.success) {
        setTasas(response.data);
      } else {
        setError(response.error || 'Error al cargar el histórico de tasas');
      }
    } catch {
      setError('Error de conexión. Verifique su internet e intente nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistoricalRates(currencyFilter);
  }, [currencyFilter]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistoricalRates(currencyFilter);
  }, [currencyFilter]);

  const handleCurrencyFilter = useCallback((codigo: string) => {
    setCurrencyFilter(codigo === currencyFilter ? '' : codigo);
  }, [currencyFilter]);

  const getCurrencyFlag = (codigo: string): string => {
    const flags: Record<string, string> = {
      USD: '🇺🇸',
      EUR: '🇪🇺',
      MXN: '🇲🇽',
      CAD: '🇨🇦',
    };
    return flags[codigo.toUpperCase()] || '🏳️';
  };

  const FilterChip = ({ 
    code, 
    flag, 
    isActive,
    label,
  }: { 
    code: string; 
    flag?: string; 
    isActive: boolean;
    label?: string;
  }) => (
    <TouchableOpacity
      onPress={() => handleCurrencyFilter(code)}
      activeOpacity={0.7}
      style={[
        styles.filterChip,
        {
          backgroundColor: isActive ? colors.primary : colors.surface,
          borderColor: isActive ? colors.primary : colors.cardBorder,
          ...Platform.select({
            ios: isActive ? Shadows.sm : {},
            android: { elevation: isActive ? 2 : 0 },
          }),
        }
      ]}
    >
      {flag && <Text style={styles.filterFlag}>{flag}</Text>}
      <Text 
        style={[
          styles.filterText,
          { color: isActive ? '#FFFFFF' : colors.text }
        ]}
      >
        {label || code}
      </Text>
      {isActive && (
        <View style={styles.filterCheckmark}>
          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar 
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} 
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.md }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={['#7C3AED', '#5B21B6'] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroHeader}>
                <View style={styles.heroIconContainer}>
                  <Ionicons name="time" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.heroTextContainer}>
                  <Text style={styles.heroTitle}>Histórico de Tasas</Text>
                  <Text style={styles.heroSubtitle}>
                    Consulta las tasas de cambio anteriores
                  </Text>
                </View>
              </View>

              <View style={styles.heroStats}>
                <View style={styles.heroStatItem}>
                  <Ionicons name="calendar-outline" size={18} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.heroStatText}>
                    {tasas?.length || 0} registros
                  </Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Ionicons name="analytics-outline" size={18} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.heroStatText}>
                    {currencyFilter || 'Todas las monedas'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Decorative elements */}
            <View style={styles.heroDecor1} />
            <View style={styles.heroDecor2} />
          </LinearGradient>
        </View>

        {/* Filter Section */}
        <View style={styles.filterSection}>
          <Card style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <View style={styles.filterTitleRow}>
                <Ionicons name="filter" size={18} color={colors.primary} />
                <Text style={[styles.filterTitle, { color: colors.text }]}>
                  Filtrar por Moneda
                </Text>
              </View>
              {currencyFilter && (
                <TouchableOpacity 
                  onPress={() => handleCurrencyFilter('')}
                  style={[styles.clearButton, { backgroundColor: colors.errorLight }]}
                >
                  <Text style={[styles.clearButtonText, { color: colors.error }]}>
                    Limpiar
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.filterChipsContainer}>
              <FilterChip
                code=""
                isActive={currencyFilter === ''}
                label="Todas"
              />
              {MONEDAS_PRINCIPALES.map((moneda) => (
                <FilterChip
                  key={moneda.codigo}
                  code={moneda.codigo}
                  flag={getCurrencyFlag(moneda.codigo)}
                  isActive={currencyFilter === moneda.codigo}
                />
              ))}
            </View>
          </Card>
        </View>

        {/* Active Filter Info */}
        {currencyFilter && (
          <View style={styles.activeFilterSection}>
            <View style={[
              styles.activeFilterCard, 
              { backgroundColor: colors.primaryLight, borderColor: colors.primary }
            ]}>
              <View style={styles.activeFilterContent}>
                <Ionicons name="information-circle" size={18} color={colors.primary} />
                <Text style={[styles.activeFilterText, { color: colors.primary }]}>
                  Mostrando histórico para <Text style={styles.activeFilterBold}>{currencyFilter}</Text>
                </Text>
              </View>
              <Text style={styles.activeFilterFlag}>
                {getCurrencyFlag(currencyFilter)}
              </Text>
            </View>
          </View>
        )}

        {/* Historical Rates List */}
        <View style={styles.listSection}>
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: colors.text }]}>
              Registros Históricos
            </Text>
            <Text style={[styles.listSubtitle, { color: colors.textMuted }]}>
              Ordenados por fecha
            </Text>
          </View>
          
          <ExchangeRateList
            tasas={tasas}
            loading={loading}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            error={error}
            onRetry={() => loadHistoricalRates(currencyFilter)}
            currencyFilter={currencyFilter}
            isHistorical={true}
          />
        </View>

        {/* Footer */}
        <View style={styles.footerSection}>
          <View style={[styles.footerCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Datos oficiales del Banco Central de Cuba. Los registros históricos 
              se actualizan diariamente.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'] + 100,
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  heroGradient: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: Shadows.xl,
      android: Shadows.xl,
    }),
  },
  heroContent: {
    padding: Spacing['2xl'],
    zIndex: 1,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  heroIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    ...Typography.headlineLarge,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    ...Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  heroStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroStatText: {
    ...Typography.labelMedium,
    color: '#FFFFFF',
  },
  heroDecor1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroDecor2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Filter Section
  filterSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  filterCard: {
    padding: Spacing.lg,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  filterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filterTitle: {
    ...Typography.headlineSmall,
  },
  clearButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  clearButtonText: {
    ...Typography.labelSmall,
  },
  filterChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  filterFlag: {
    fontSize: 16,
  },
  filterText: {
    ...Typography.labelMedium,
  },
  filterCheckmark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Active Filter Section
  activeFilterSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  activeFilterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  activeFilterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  activeFilterText: {
    ...Typography.bodyMedium,
  },
  activeFilterBold: {
    fontWeight: '700',
  },
  activeFilterFlag: {
    fontSize: 24,
  },

  // List Section
  listSection: {
    paddingHorizontal: Spacing.lg,
  },
  listHeader: {
    marginBottom: Spacing.lg,
  },
  listTitle: {
    ...Typography.headlineSmall,
    marginBottom: 2,
  },
  listSubtitle: {
    ...Typography.bodySmall,
  },

  // Footer Section
  footerSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing['3xl'],
    marginBottom: Spacing.xl,
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  footerText: {
    ...Typography.bodySmall,
    flex: 1,
    lineHeight: 18,
  },
});
