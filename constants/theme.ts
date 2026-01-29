// Fintech Professional Theme - Modern & Sophisticated
export const Colors = {
  light: {
    // Primary palette
    primary: '#0066FF',
    primaryLight: '#E6F0FF',
    primaryDark: '#0052CC',
    
    // Background hierarchy
    background: '#F7F9FC',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    
    // Text hierarchy
    text: '#1A1D26',
    textSecondary: '#5E6278',
    textMuted: '#99A1B7',
    textInverse: '#FFFFFF',
    
    // Borders
    border: '#E8ECF4',
    borderLight: '#F1F4F9',
    
    // Semantic colors
    success: '#00C48C',
    successLight: '#E8FBF5',
    successDark: '#00A876',
    
    warning: '#FFB800',
    warningLight: '#FFF8E6',
    warningDark: '#E6A600',
    
    error: '#FF4757',
    errorLight: '#FFEBEE',
    errorDark: '#E63E4D',
    
    // Accent colors
    accent: '#7C3AED',
    accentLight: '#F3EEFF',
    
    // Tab bar
    tint: '#0066FF',
    tabIconDefault: '#99A1B7',
    tabIconSelected: '#0066FF',
    
    // Cards
    cardBackground: '#FFFFFF',
    cardBorder: '#E8ECF4',
    
    // Gradients (as arrays for LinearGradient)
    gradientPrimary: ['#0066FF', '#0052CC'],
    gradientSuccess: ['#00C48C', '#00A876'],
    gradientCard: ['#FFFFFF', '#F7F9FC'],
  },
  dark: {
    // Primary palette
    primary: '#3D8BFF',
    primaryLight: '#1A3A5C',
    primaryDark: '#2E7AEE',
    
    // Background hierarchy
    background: '#0D1117',
    surface: '#161B22',
    surfaceElevated: '#1C2128',
    
    // Text hierarchy
    text: '#F0F6FC',
    textSecondary: '#8B949E',
    textMuted: '#6E7681',
    textInverse: '#0D1117',
    
    // Borders
    border: '#30363D',
    borderLight: '#21262D',
    
    // Semantic colors
    success: '#3FB950',
    successLight: '#1A3D2E',
    successDark: '#2EA043',
    
    warning: '#D29922',
    warningLight: '#3D2E1A',
    warningDark: '#BB8009',
    
    error: '#F85149',
    errorLight: '#3D1A1A',
    errorDark: '#DA3633',
    
    // Accent colors
    accent: '#A371F7',
    accentLight: '#2D1F4A',
    
    // Tab bar
    tint: '#3D8BFF',
    tabIconDefault: '#6E7681',
    tabIconSelected: '#3D8BFF',
    
    // Cards
    cardBackground: '#161B22',
    cardBorder: '#30363D',
    
    // Gradients
    gradientPrimary: ['#3D8BFF', '#2E7AEE'],
    gradientSuccess: ['#3FB950', '#2EA043'],
    gradientCard: ['#1C2128', '#161B22'],
  },
};

// Typography scale
export const Typography = {
  // Display
  displayLarge: {
    fontSize: 42,
    fontWeight: '800' as const,
    letterSpacing: -1.5,
    lineHeight: 48,
  },
  displayMedium: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  
  // Headlines
  headlineLarge: {
    fontSize: 24,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  headlineMedium: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 28,
  },
  headlineSmall: {
    fontSize: 18,
    fontWeight: '600' as const,
    letterSpacing: 0,
    lineHeight: 24,
  },
  
  // Body
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
    lineHeight: 16,
  },
  
  // Labels
  labelLarge: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelMedium: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
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

// Border radius
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
};
