# AGENTS.md — Tasas Cambio BC

## Dev Commands

- `npm start` — start Expo dev server
- `npm run web` — run web build
- `npm run android` — run on Android
- `npm run ios` — run on iOS
- `npm run lint` — run ESLint via expo lint

## Architecture

- **Entry**: `expo-router/entry` (set in package.json)
- **Routes**: `app/` uses Expo Router file-based routing
- **Tabs**: `app/(tabs)/index.tsx` (actives), `history.tsx`, `converter.tsx`
- **API service**: `services/api.ts`
- **Path aliases**: `@/*` maps to project root (configured in tsconfig.json)

## Theme & Styling

- Use `useColorScheme()` from `hooks/use-color-scheme` (has `.web.ts` variant)
- Tailwind via NativeWind: import in `app/tailwind.css` which loads `global.css`
- Theme colors in `constants/theme.ts`

## Important Conventions

- Use `StyleSheet.create()` for component styles, not CSS modules
- Platform-specific code: use `Platform.select({ ios: ..., android: ... })`
- Haptic feedback: use `HapticTab` component for tab interactions
- Strict TypeScript enabled in tsconfig.json

## API

- Base URL: `https://api.bc.gob.cu/v1/tasas-de-cambio`
- No authentication required
- Endpoints: `/activas`, `/historico`
- API includes fallback mock data generation in `getTasasHistorico()` if endpoint fails

## Build & Deploy

- EAS configured in `eas.json`
- Android package: `com.tasascambio.cuba`
- Run `eas build -p android --profile preview` to build Android APK