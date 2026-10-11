// Helpers centralizados para no dispersar Platform.select.
// Android usa elevation baja + borde; iOS mantiene sombras.

import { Platform } from 'react-native';
import { Shadows, Spacing } from '../../constants/theme';

export const cardPadding: number =
  Platform.select({ ios: Spacing.xl, android: Spacing.lg }) ?? Spacing.lg;

// Nota: iOS usa shadow*, Android solo elevation 1 + borde (definido en cada card).
export function platformCardShadow(): object {
  if (Platform.OS === 'android') return { elevation: 1 };
  return Shadows.md;
}

export function platformPressedScale(): number {
  return 0.98;
}
