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

### Tasas informales (elToque)

- Cliente: `services/rates/eltoque-client.ts` (dominio separado, nunca se mezcla
  con el BCC para cálculo/conversión). Cadena de fuentes: proxy (opcional) →
  `api.cubanomic.com` (widget público de elToque; sin key ni VPN; ventana
  07:00→07:00 con el valor que publica el widget: **mediana** si la serie tiene
  `count_values ≥ 50` ofertas, **EMA** si es flaca) → `tasas.eltoque.com/v1/trmi`
  directo.
- Series mapeadas (lista blanca en `services/rates/types.ts`): USD, MLC, EUR,
  CAD (dólar canadiense), CLA (Clásica), BTC, TRX, USDT_TRC20 y el dólar vía
  **Zelle**, que cubanomic sirve en un endpoint aparte
  (`/api/v2/x-rates-filter-by-pm?payment_method=Zelle&x_cur=CUP`, clave
  `USD_Zelle.CUP`) y solo se pide para la ventana vigente. El resto de claves
  del `statistics` (AUD, LTC, …) se descartan: muchas traen valores centinela.
- `getRealtime()` sirve la **vista "tiempo real"** del widget (petición sin
  fechas, `?real_time=true`): un valor vivo que no se corta a las 07:00. Solo la
  sirve cubanomic, no se persiste y su Zelle va también sin fechas; la vista
  publicada (por defecto) mantiene la ventana 07:00→07:00.
- `EXPO_PUBLIC_ELTOQUE_API_KEY` es **opcional** (solo respaldo directo);
  `EXPO_PUBLIC_ELTOQUE_PROXY_URL` es opcional y tiene prioridad. Ver `.env.sample`.
  El hop de proxy y el `trmi` directo sirven el juego del TRMI (sin CAD/CLA/Zelle);
  esas series extra solo llegan por cubanomic.

## Build & Deploy

- EAS configured in `eas.json`
- Android package: `com.tasascambio.cuba`
- Run `eas build -p android --profile preview` to build Android APK

## Code Review Agents

- Three specialized reviewers run in parallel over the same diff: `security-reviewer`, `performance-reviewer`, `maintainability-reviewer`; then `review-orchestrator` merges the three reports into one verdict (`block` / `approve_with_comments` / `approve`).
- **OpenCode**: agents in `.opencode/agents/` (invoke via `@mention` or the Task tool). These are the active ones in this environment.
- **Claude Code**: wrappers in `.claude/agents/` (same behavior, Claude frontmatter).
- **Canonical specs** (do not diverge): `.agents/review-kit/{security,performance,maintainability,orchestrator}-agent/AGENTS.md`, shared report schema in `.agents/review-kit/_shared/report-schema.md`.
- A missing or failed reviewer is never an approval: absence of review is not evidence of quality. No real security coverage means `block`.

## Skills

- Canonical location: `.agents/skills/<name>/SKILL.md` (auto-discovered via the `skill` tool).
- `verify` (`.claude/skills/verify/SKILL.md`): static checks + run recipe for verifying changes on a local dev instance.

## App Signing

- Android signing uses a local keystore at `credentials/android/keystore.jks` (git-ignored, never commit it or its passwords).
- `credentials.json` (git-ignored) holds the keystore passwords for local/EAS-local builds; `credentials.json.sample` is the committed template.
- Default EAS builds use `remote` (EAS-managed) credentials, so `credentials.json` is not needed for deploys. Only `local` credential mode (`"credentialsSource": "local"` in `eas.json`) reads it.
- To rotate passwords without changing the key (Play Store safe): `keytool -storepasswd` + `keytool -keypasswd`, verify identical SHA1/SHA256 fingerprints before and after, then update `credentials.json`.
- A pre-commit hook (`.git/hooks/pre-commit`, local-only) blocks committing secrets; enable GitHub push protection as the server-side net.