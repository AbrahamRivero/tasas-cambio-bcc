import { HapticTab } from '@/components/ui/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { bottom } = useSafeAreaInsets();
  // Altura base iOS 49 + inset (gestos/botones); sin huecos ni solapes.
  const barHeight = (Platform.OS === 'ios' ? 49 : 56) + bottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          height: barHeight,
          backgroundColor: isDark ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.92)',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.cardBorder,
          paddingTop: 6,
          paddingBottom: Math.max(bottom, Platform.OS === 'ios' ? 8 : 6),
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={90}
            style={StyleSheet.absoluteFill}
            tint={isDark ? 'dark' : 'light'}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          letterSpacing: 0.1,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'BCC',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={26}
              name={focused ? 'business' : 'business-outline'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="eltoque"
        options={{
          title: 'elToque',
          tabBarBadge: undefined,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={26}
              name={focused ? 'storefront' : 'storefront-outline'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={26}
              name={focused ? 'time' : 'time-outline'}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="converter"
        options={{
          title: 'Convertir',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              size={26}
              name={focused ? 'calculator' : 'calculator-outline'}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
