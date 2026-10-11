---
name: verify
description: Static checks and run recipe for verifying tasas-cambio-bc (Expo) changes end-to-end on a local dev instance
---

# Verifying tasas-cambio-bc changes

## Static checks

- `npm run lint` — ESLint via expo lint.
- `npx tsc --noEmit` — strict TypeScript per tsconfig.json.
- `npm test` — jest-expo suites for pure logic (`utils/__tests__/`).
- API base is `https://api.bc.gob.cu/v1/tasas-de-cambio` (`/activas`, `/historico`), no auth. `getTasasHistorico()` in `services/api.ts` falls back to generated mock data if the endpoint fails — a green run against mocks does not prove backend connectivity, so confirm which data source was hit.

## Run

- `npm start` — Expo dev server; `npm run web`, `npm run android`, `npm run ios` per platform.
- Entry is `expo-router/entry`; routes live in `app/` with tabs `app/(tabs)/index.tsx` (actives), `history.tsx`, `converter.tsx`.

## Driving flows

- Tabs: actives list, history, converter — all depend on the rates service, so exercise both the online path and the fallback-mock path.
- Theme: `useColorScheme()` from `hooks/use-color-scheme` plus Tailwind via NativeWind; verify light and dark mode on each touched screen.
- Build: EAS preview via `eas build -p android --profile preview` (package `com.tasascambio.cuba`).
