# Historial de cambios

Todos los cambios relevantes de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/)
y este proyecto sigue [Versionado Semántico](https://semver.org/lang/es/).

## [No publicado]

### Agregado

- La tasa informal (mercado de calle, TRMI de elToque) se obtiene ahora del
  **widget público de elToque** (cubanomic), por lo que la app ya no necesita
  API key ni VPN para mostrarla. Cadena de fuentes en `services/rates/eltoque-client.ts`:
  `proxy (opcional) → cubanomic (widget) → trmi directo`. El valor publicado es
  la mediana diaria de la ventana 07:00→07:00 (se exige actividad en la ventana
  salvo para la tasa vigente del día).

### Cambiado

- `EXPO_PUBLIC_ELTOQUE_API_KEY` pasa a ser **opcional**: sin ella la app toma la
  tasa informal del widget público y la key solo habilita el respaldo directo
  contra `tasas.eltoque.com`.
- Tamaño del APK reducido de ~110 MB a ~47 MB: se compilan solo dos arquitecturas
  (`armeabi-v7a` y `arm64-v8a`), se activa R8/minify y el encogido de recursos en
  release mediante `expo-build-properties` (`app.json`).
- Los perfiles `preview` y `production` de `eas.json` generan ahora APK
  (`android.buildType: "apk"`) para distribución interna en Apklis.
- Los scripts `android` e `ios` pasan a usar `expo run:*` (build nativo).

### Corregido

- Las variables `EXPO_PUBLIC_ELTOQUE_API_KEY` y `EXPO_PUBLIC_ELTOQUE_PROXY_URL`
  no se sustituían al compilar: un cast de TypeScript rompía el reemplazo de
  `process.env`, por lo que llegaban como `undefined` en el APK. Se eliminaron
  los casts en `services/rates/eltoque-client.ts`.

### Eliminado

- Soporte Web y sus dependencias (`react-dom`, `react-native-web`, `expo-image`)
  y el script `web`, junto con el bloque `web` de `app.json`.

## [1.1.0] - 2026-10-11

### Agregado

- Pestaña **elToque** con las tasas del mercado informal: USD, MLC, EUR, BTC,
  TRX y USDT (TRC-20).
- Modo **Comparar**: contraste lado a lado entre la tasa oficial (BCC) y la
  informal (elToque) para USD, MLC y EUR.
- **Histórico** de elToque (serie local acumulada) además del histórico oficial
  de los últimos 30 días del BCC.
- **Convertidor** con selección de fuente (BCC o elToque); elToque usa valor
  único sin spread, mientras el BCC mantiene spread de compra/venta (±2%).
- Capa de datos de elToque (cliente directo y vía proxy, caché con TTL, backoff
  exponencial y manejo de 401/429) estrictamente separada del dominio oficial
  del BCC.
- Persistencia offline de las últimas tasas en AsyncStorage.
- Aviso de VPN cuando la red bloquea el acceso a elToque.
- Rediseño visual basado en las guías Apple (listas agrupadas, controles
  segmentados, skeletons, ajustes de safe-area y corrección de desbordamiento
  en Android).
- Proxy (Cloudflare Worker) para no exponer la API key de elToque en el cliente
  (`proxy/eltoque-proxy/worker.ts`).
- Pruebas unitarias: 43 pasando (mapeo, backfill de histórico, guards y
  conversión).

### Cambiado

- `ECU` se normaliza como `EUR` en las tasas de elToque.
- Versión de la app 1.0.0 → 1.1.0.

### Eliminado

- Componentes/hooks heredados reemplazados por el rediseño
  (`components/Loading.tsx`, `hooks/useTheme.ts`).

## [1.0.0] - 2026-01-27

### Agregado

- Versión inicial: consulta de las tasas oficiales del Banco Central de Cuba
  (activas e histórico), filtro por monedas (USD, EUR, MXN, CAD y otras) y
  convertidor, con soporte de modo claro/oscuro.

[No publicado]: https://github.com/AbrahamRivero/tasas-cambio-bcc/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/AbrahamRivero/tasas-cambio-bcc/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/AbrahamRivero/tasas-cambio-bcc/releases/tag/v1.0.0
