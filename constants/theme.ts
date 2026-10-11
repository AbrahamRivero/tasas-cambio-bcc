// Apple Human Interface Guidelines — system colors, grouped backgrounds,
// SF-like hierarchy. Misma forma que antes para no romper imports.
export const Colors = {
  light: {
    // Primary palette (systemBlue)
    primary: '#007AFF',
    primaryLight: '#E5F1FF',
    primaryDark: '#0051D5',
    
    // Background hierarchy (grouped)
    background: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    
    // Text hierarchy (label / secondary / tertiary)
    text: '#000000',
    textSecondary: '#3A3A3C',
    textMuted: '#8E8E93',
    textInverse: '#FFFFFF',
    
    // Borders (separator)
    border: '#C6C6C8',
    borderLight: '#E5E5EA',
    
    // Semantic colors (systemGreen / Orange / Red)
    success: '#34C759',
    successLight: '#E7F9EC',
    successDark: '#248A3D',
    
    warning: '#FF9500',
    warningLight: '#FFF4E5',
    warningDark: '#C67700',
    
    error: '#FF3B30',
    errorLight: '#FFECEB',
    errorDark: '#D70015',
    
    // Accent colors
    accent: '#5856D6',
    accentLight: '#ECECFA',
    
    // Tab bar
    tint: '#007AFF',
    tabIconDefault: '#8E8E93',
    tabIconSelected: '#007AFF',
    
    // Cards
    cardBackground: '#FFFFFF',
    cardBorder: '#E5E5EA',
    
    // Gradients (Apple evita gradientes fuertes; se conservan sutiles)
    gradientPrimary: ['#0A84FF', '#007AFF'],
    gradientSuccess: ['#30D158', '#34C759'],
    gradientCard: ['#FFFFFF', '#F2F2F7'],

    // Icons
    icon: '#99A1B7',
  },
  dark: {
    // Primary palette
    primary: '#0A84FF',
    primaryLight: '#1C2E4A',
    primaryDark: '#409CFF',
    
    // Background hierarchy (grouped dark)
    background: '#000000',
    surface: '#1C1C1E',
    surfaceElevated: '#2C2C2E',
    
    // Text hierarchy
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textMuted: '#98989F',
    textInverse: '#000000',
    
    // Borders
    border: '#38383A',
    borderLight: '#2C2C2E',
    
    // Semantic colors
    success: '#30D158',
    successLight: '#1A2E22',
    successDark: '#30D158',
    
    warning: '#FF9F0A',
    warningLight: '#2E2417',
    warningDark: '#FF9F0A',
    
    error: '#FF453A',
    errorLight: '#2E1A1A',
    errorDark: '#FF6961',
    
    // Accent colors
    accent: '#5E5CE6',
    accentLight: '#23233F',
    
    // Tab bar
    tint: '#0A84FF',
    tabIconDefault: '#98989F',
    tabIconSelected: '#0A84FF',
    
    // Cards
    cardBackground: '#1C1C1E',
    cardBorder: '#38383A',
    
    // Gradients
    gradientPrimary: ['#0A84FF', '#0051D5'],
    gradientSuccess: ['#30D158', '#248A3D'],
    gradientCard: ['#2C2C2E', '#1C1C1E'],

    // Icons
    icon: '#6E7681',
  },
};

// Typography scale — estilo Apple (large title / title / headline / body)
export const Typography = {
  // Display (largeTitle)
  displayLarge: {
    fontSize: 34,
    fontWeight: '700' as const,
    letterSpacing: 0.4,
    lineHeight: 41,
  },
  displayMedium: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
    lineHeight: 29,
  },
  
  // Headlines (title 1-3)
  headlineLarge: {
    fontSize: 22,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  headlineMedium: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 25,
  },
  headlineSmall: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  
  // Body
  bodyLarge: {
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  
  // Labels (footnote / caption)
  labelLarge: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  labelMedium: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
    lineHeight: 18,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
    lineHeight: 14,
  },
};

// Spacing scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// Border radius (Apple continuous: 10 / 12 / 14)
export const BorderRadius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 22,
  full: 9999,
};

// Shadows — sutiles estilo iOS; en Android solo elevation baja
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
};
