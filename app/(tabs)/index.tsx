import { Card, CardHeader, QuickStatCard } from '@/components/Card';
import { TasaCambioList } from '@/components/TasaCambioList';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme.web';
import { apiService } from '@/services/api';
import { TasaCambioHistorico, TasasActivasResponse } from '@/types';
import { formatDate } from '@/utils/formatters';
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


export default function TasasActivasScreen() {
  const [tasas, setTasas] = useState<TasasActivasResponse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [ultimaActualizacion, setUltimaActualizacion] = useState('');
  const [datosHistoricos, setDatosHistoricos] = useState<TasaCambioHistorico[]>([]);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const cargarTasas = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      
      // Cargar tasas activas
      const [tasasResponse, historicoResponse] = await Promise.all([
        apiService.getTasasActivas(),
        apiService.getTasasHistorico()
      ]);

      if (tasasResponse.success) {
        setTasas([tasasResponse.data]);
        setUltimaActualizacion(tasasResponse.data.fechaHoy);
        
        // Cargar datos históricos si están disponibles
        if (historicoResponse.success) {
          setDatosHistoricos(historicoResponse.data);
        }
      } else {
        setError(tasasResponse.error || 'Error al cargar las tasas de cambio');
      }
    } catch {
      setError('Error de conexión. Verifique su internet e intente nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    cargarTasas();
  }, [cargarTasas]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setLoading(true);
    cargarTasas();
  }, [cargarTasas]);

  // Calculate stats from tasas
  const stats = React.useMemo(() => {
    if (!tasas || !tasas[0]?.tasas) {
      return { totalMonedas: 0, usdRate: '0.00', eurRate: '0.00' };
    }
    const tasasList = tasas[0].tasas;
    const usd = tasasList.find((t: any) => t.codigoMoneda === 'USD');
    const eur = tasasList.find((t: any) => t.codigoMoneda === 'EUR');
    return {
      totalMonedas: tasasList.length,
      usdRate: usd?.tasaEspecial?.toFixed(2) || '0.00',
      eurRate: eur?.tasaEspecial?.toFixed(2) || '0.00',
    };
  }, [tasas]);

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
            colors={colors.gradientPrimary as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroHeader}>
                <View>
                  <Text style={styles.heroGreeting}>Bienvenido</Text>
                  <Text style={styles.heroTitle}>Tasas de Cambio</Text>
                </View>
                <TouchableOpacity
                  onPress={handleRefresh}
                  style={styles.refreshButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.heroStats}>
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>USD/CUP</Text>
                  <Text style={styles.heroStatValue}>{stats.usdRate}</Text>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStatItem}>
                  <Text style={styles.heroStatLabel}>EUR/CUP</Text>
                  <Text style={styles.heroStatValue}>{stats.eurRate}</Text>
                </View>
              </View>

              <View style={styles.heroFooter}>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>En vivo</Text>
                </View>
                <Text style={styles.heroDate}>
                  {ultimaActualizacion ? formatDate(ultimaActualizacion) : 'Cargando...'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStatsSection}>
          <View style={styles.quickStatsRow}>
            <QuickStatCard
              label="Monedas"
              value={stats.totalMonedas}
              icon="💱"
              accentColor={colors.primary}
            />
            <QuickStatCard
              label="Fuente"
              value="BCC"
              icon="🏛️"
              accentColor={colors.accent}
            />
            <QuickStatCard
              label="Estado"
              value="Activo"
              icon="✓"
              accentColor={colors.success}
            />
          </View>
        </View>

        {/* Main Content Card */}
        <View style={styles.mainSection}>
          <Card style={styles.mainCard}>
            <CardHeader
              title="Cotizaciones Oficiales"
              subtitle="Banco Central de Cuba"
              icon="📊"
              rightElement={
                <View style={[styles.verifiedBadge, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={[styles.verifiedText, { color: colors.successDark }]}>
                    Verificado
                  </Text>
                </View>
              }
            />
          </Card>
        </View>

        {/* Exchange Rates List */}
        <View style={styles.listSection}>
          <TasaCambioList
            tasas={tasas as any}
            loading={loading}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            error={error}
            onRetry={cargarTasas}
            datosHistoricos={datosHistoricos}
          />
        </View>

        {/* Footer Info */}
        <View style={styles.footerSection}>
          <View style={[styles.footerCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Ionicons name="information-circle-outline" size={20} color={colors.textMuted} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Las tasas son actualizadas diariamente por el Banco Central de Cuba.
              Desliza hacia abajo para actualizar.
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
    paddingBottom: Spacing.xl + 80,
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  heroGradient: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Platform.select({
      ios: Shadows.xl,
      android: Shadows.xl,
    }),
  },
  heroContent: {
    padding: Spacing['2xl'],
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing['2xl'],
  },
  heroGreeting: {
    ...Typography.bodyMedium,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  heroTitle: {
    ...Typography.headlineLarge,
    color: '#FFFFFF',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: Spacing.lg,
  },
  heroStatLabel: {
    ...Typography.labelSmall,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  heroStatValue: {
    ...Typography.displayMedium,
    color: '#FFFFFF',
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 196, 140, 0.3)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00C48C',
  },
  statusText: {
    ...Typography.labelSmall,
    color: '#FFFFFF',
  },
  heroDate: {
    ...Typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Quick Stats Section
  quickStatsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },

  // Main Section
  mainSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  mainCard: {
    marginBottom: 0,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  verifiedText: {
    ...Typography.labelSmall,
  },

  // List Section
  listSection: {
    paddingHorizontal: Spacing.lg,
  },

  // Footer Section
  footerSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing['2xl'],
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
