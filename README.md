# Tasas Cambio Cuba

Aplicación móvil desarrollada con Expo y React Native para consultar las tasas de cambio oficiales del Banco Central de Cuba.

## 🚀 Características

- **Tasas Activas**: Consulte las tasas de cambio actuales
- **Histórico**: Acceda al histórico de tasas de cambio
- **Filtro por Monedas**: Filtrado rápido para USD, EUR, MXN y CAD
- **Diseño Responsivo**: Interfaz moderna con soporte para modo oscuro
- **Actualización en Tiempo Real**: Tire hacia abajo para actualizar los datos
- **Soporte Offline**: Manejo inteligente de errores y conexión

## 📱 Monedas Soportadas

- **USD** - Dólar Estadounidense 🇺🇸
- **EUR** - Euro 🇪🇺
- **MXN** - Peso Mexicano 🇲🇽
- **CAD** - Dólar Canadiense 🇨🇦

## 🛠️ Tecnologías

- **Expo** - Plataforma de desarrollo React Native
- **TypeScript** - Tipado estático para mayor robustez
- **Tailwind CSS** - Sistema de utilidades CSS para estilos
- **NativeWind** - Integración de Tailwind CSS con React Native
- **Expo Router** - Navegación basada en archivos
- **React Hooks** - Estado y efectos modernos

## 📦 Estructura del Proyecto

```
tasas-cambio-cuba/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # Pantalla de tasas activas
│   │   ├── historico.tsx      # Pantalla de histórico
│   │   └── _layout.tsx        # Layout de tabs
│   └── _layout.tsx            # Layout principal
├── components/
│   ├── Card.tsx               # Componente de tarjeta
│   ├── Loading.tsx            # Componentes de loading y error
│   └── TasaCambioList.tsx     # Lista de tasas de cambio
├── services/
│   └── api.ts                 # Servicio de API
├── types/
│   └── index.ts               # Definiciones TypeScript
├── utils/
│   └── formatters.ts          # Utilidades de formato
├── hooks/
│   └── useTheme.ts            # Hook de tema personalizado
└── global.css                 # Estilos globales Tailwind
```

## 🚀 Empezando

### Prerrequisitos

- Node.js 18+
- Expo CLI
- Android Studio o Xcode (para desarrollo móvil)

### Instalación

1. Clone el repositorio
2. Instale las dependencias:

   ```bash
   npm install
   ```

3. Inicie el servidor de desarrollo:
   ```bash
   npm start
   ```

### Ejecución

- **Web**: `npm run web`
- **Android**: `npm run android`
- **iOS**: `npm run ios`

## 📡 API

La aplicación consume los endpoints del Banco Central de Cuba:

- `GET https://api.bc.gob.cu/v1/tasas-de-cambio/activas` - Tasas activas
- `GET https://api.bc.gob.cu/v1/tasas-de-cambio/historico` - Histórico completo
- `GET https://api.bc.gob.cu/v1/tasas-de-cambio/historico?moneda=CODIGO` - Histórico por moneda

## 🎨 Personalización

### Temas

La aplicación soporta temas claro y oscuro automáticamente según las preferencias del sistema.

### Colores

Los colores principales están definidos en `hooks/useTheme.ts`:

- Primary: Azul #3b82f6
- Success: Verde #22c55e
- Warning: Ámbar #f59e0b
- Error: Rojo #ef4444

## 🤝 Contribución

1. Fork el proyecto
2. Cree una rama para su feature: `git checkout -b feature/amazing-feature`
3. Commit sus cambios: `git commit -m 'Add amazing feature'`
4. Push a la rama: `git push origin feature/amazing-feature`
5. Abra un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 🙏 Agradecimientos

- Datos proporcionados por el [Banco Central de Cuba](https://bc.gob.cu/)
- Documentación de [Expo](https://docs.expo.dev/)
- Iconos de [Expo Vector Icons](https://icons.expo.fyi/)
