import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/theme';
import { useColorScheme } from '../hooks/use-color-scheme';
import { MONEDAS_PRINCIPALES, TasaCambio, TasaCambioHistorico } from '../types';
import { formatDateShort } from '../utils/formatters';
import { ExchangeRateCard } from './ExchangeRateCard';

interface ExchangeRateListProps {
  tasas: (TasaCambio | TasaCambioHistorico)[] | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  error?: string;
  onRetry?: () => void;
  currencyFilter?: string;
  isHistorical?: boolean;
  historicalData?: TasaCambioHistorico[];
}

// Loading Component with Fintech Style
const Loading: React.FC<{ message?: string }> = ({ message = 'Cargando...' }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.loadingCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.loadingIconContainer, { backgroundColor: colors.primaryLight }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
        <Text style={[styles.loadingText, { color: colors.text }]}>{message}</Text>
        <Text style={[styles.loadingSubtext, { color: colors.textMuted }]}>
          Conectando con el servidor...
        </Text>
      </View>
    </View>
  );
};

// Error Component with Fintech Style
interface ErrorComponentProps {
  message: string;
  onRetry?: () => void;
}

const ErrorComponent: React.FC<ErrorComponentProps> = ({ message, onRetry }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.errorCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <View style={[styles.errorIconContainer, { backgroundColor: colors.errorLight }]}>
          <Ionicons name="alert-circle" size={32} color={colors.error} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.text }]}>Error de conexión</Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>{message}</Text>
        {onRetry && (
          <View style={[styles.retryButton, { backgroundColor: colors.primary }]}>
            <Text 
              style={styles.retryButtonText}
              onPress={onRetry}
            >
              Reintentar
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Empty State Component
const EmptyState: React.FC<{ message: string }> = ({ message }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.borderLight }]}>
          <Ionicons name="search-outline" size={32} color={colors.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Sin resultados</Text>
        <Text style={[styles.emptyMessage, { color: colors.textMuted }]}>{message}</Text>
      </View>
    </View>
  );
};

// Historico Card Component
interface HistoricalCardProps {
  data: TasaCambioHistorico;
  colors: typeof Colors.light;
}

const HistoricalCard: React.FC<HistoricalCardProps> = ({ data, colors }) => {
  const rates = [
    { label: 'Oficial', value: data.tasaOficial, icon: 'business' as const },
    { label: 'Pública', value: data.tasaPublica, icon: 'people' as const },
    { label: 'Especial', value: data.tasaEspecial, icon: 'star' as const },
  ];

  return (
    <View style={[styles.historicoCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      {/* Date Header */}
      <LinearGradient
        colors={colors.gradientPrimary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.historicoHeader}
      >
        <View style={styles.historicoDateRow}>
          <Ionicons name="calendar" size={16} color="#FFFFFF" />
          <Text style={styles.historicoDate}>{formatDateShort(data.fecha, true)}</Text>
        </View>
      </LinearGradient>

      {/* Rates Grid */}
      <View style={styles.historicoRates}>
        {rates.map((rate, index) => (
          <View 
            key={rate.label}
            style={[
              styles.historicoRateItem,
              index < rates.length - 1 && { 
                borderRightWidth: 1, 
                borderRightColor: colors.borderLight 
              }
            ]}
          >
            <View style={[styles.historicoRateIcon, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name={rate.icon} size={14} color={colors.primary} />
            </View>
            <Text style={[styles.historicoRateLabel, { color: colors.textMuted }]}>
              {rate.label}
            </Text>
            <Text style={[styles.historicoRateValue, { color: colors.text }]}>
              {rate.value.toFixed(2)}
            </Text>
            <Text style={[styles.historicoRateCurrency, { color: colors.textMuted }]}>CUP</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const ExchangeRateList: React.FC<ExchangeRateListProps> = ({
  tasas,
  loading,
  refreshing = false,
  onRefresh,
  error,
  onRetry,
  currencyFilter,
  isHistorical = false,
  historicalData = [],
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (!tasas) {
    return <Loading message="Cargando tasas de cambio..." />;
  }

  const ratesData: (TasaCambio | TasaCambioHistorico)[] = Array.isArray(tasas) && !isHistorical && tasas.length > 0 && 'tasas' in tasas[0] 
    ? (tasas[0] as any)?.tasas || [] 
    : (tasas || []);

  const filteredRates = currencyFilter && !isHistorical 
    ? ratesData.filter((tasa: TasaCambio | TasaCambioHistorico) => {
        const codigo = (tasa as TasaCambio).codigoMoneda || '';
        return codigo.toLowerCase() === currencyFilter.toLowerCase();
      })
    : ratesData;

  const ratesToShow = !isHistorical && !currencyFilter
    ? [...filteredRates].sort((a, b) => {
        const codigoA = (a as TasaCambio).codigoMoneda || '';
        const codigoB = (b as TasaCambio).codigoMoneda || '';
        
        const esPrincipalA = MONEDAS_PRINCIPALES.some(moneda => moneda.codigo === codigoA);
        const esPrincipalB = MONEDAS_PRINCIPALES.some(moneda => moneda.codigo === codigoB);
        
        if (esPrincipalA && !esPrincipalB) return -1;
        if (!esPrincipalA && esPrincipalB) return 1;
        return 0;
      })
    : filteredRates;

  if (loading) {
    return <Loading message="Cargando tasas de cambio..." />;
  }

  if (error) {
    return <ErrorComponent message={error} onRetry={onRetry} />;
  }

  if (ratesToShow.length === 0) {
    return (
      <EmptyState 
        message={
          currencyFilter 
            ? `No se encontraron tasas para ${currencyFilter.toUpperCase()}` 
            : 'No hay tasas de cambio disponibles'
        }
      />
    );
  }

  // Historico rendering
  if (isHistorical) {
    return (
      <View style={styles.listContainer}>
        {ratesToShow.map((tasa: TasaCambio | TasaCambioHistorico, index: number) => {
          const historicoTasa = tasa as TasaCambioHistorico;
          return (
            <HistoricalCard 
              key={historicoTasa.fecha || index}
              data={historicoTasa}
              colors={colors}
            />
          );
        })}
      </View>
    );
  }

   return (
     <View style={styles.listContainer}>
       {ratesToShow.map((tasa: TasaCambio | TasaCambioHistorico, index: number) => {
         const tasaCambio = tasa as TasaCambio;
         
          // Filter historical data for this specific currency
          const currencyHistorical = historicalData.filter(item => 
            item.fecha && new Date(item.fecha) < new Date(tasaCambio.fechaActivacion)
          );
          
           return (
             <ExchangeRateCard 
               key={`${tasaCambio.codigoMoneda}-${tasaCambio.fechaActivacion}-${index}`} 
               tasa={tasaCambio}
               historicalData={currencyHistorical}
             />
          );
       })}
     </View>
   );
};

const styles = StyleSheet.create({
  listContainer: {
    gap: Spacing.lg,
  },
  
  // Loading styles
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

  // Error styles
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

  // Empty styles
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing['3xl'],
    borderRadius: BorderRadius.xl,
    ...Shadows.sm,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    ...Typography.headlineSmall,
    marginBottom: Spacing.xs,
  },
  emptyMessage: {
    ...Typography.bodyMedium,
    textAlign: 'center',
  },

  // Historico styles
  historicoCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.md,
  },
  historicoHeader: {
    padding: Spacing.lg,
  },
  historicoDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  historicoDate: {
    color: '#FFFFFF',
    ...Typography.labelLarge,
    textTransform: 'capitalize',
  },
  historicoRates: {
    flexDirection: 'row',
    padding: Spacing.lg,
  },
  historicoRateItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  historicoRateIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  historicoRateLabel: {
    ...Typography.labelSmall,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  historicoRateValue: {
    ...Typography.headlineMedium,
  },
  historicoRateCurrency: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
});

export default ExchangeRateList;
