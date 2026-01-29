import React from 'react';
import { View, ActivityIndicator, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';

interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ 
  size = 'large', 
  color,
  message 
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator 
        size={size} 
        color={color || colors.primary}
      />
      {message && (
        <Text 
          style={[
            styles.loadingMessage,
            { color: colors.textSecondary }
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
};

interface ErrorProps {
  message: string;
  onRetry?: () => void;
  retryText?: string;
}

export const ErrorComponent: React.FC<ErrorProps> = ({ 
  message, 
  onRetry, 
  retryText = 'Reintentar' 
}) => {
  const { colors } = useTheme();
  
  return (
    <View style={styles.errorContainer}>
      <View style={[
        styles.errorCard,
        { backgroundColor: colors.error + '10' }
      ]}>
        <Text 
          style={[
            styles.errorMessage,
            { color: colors.error }
          ]}
        >
          {message}
        </Text>
        {onRetry && (
          <View style={styles.retryButtonContainer}>
            <Pressable
              onPress={onRetry}
              style={[
                styles.retryButton,
                { backgroundColor: colors.error }
              ]}
            >
              <Text style={styles.retryButtonText}>
                {retryText}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingMessage: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorCard: {
    padding: 16,
    borderRadius: 12,
    maxWidth: 300,
    width: '100%',
  },
  errorMessage: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  retryButtonContainer: {
    marginTop: 16,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500',
    fontSize: 14,
  },
});