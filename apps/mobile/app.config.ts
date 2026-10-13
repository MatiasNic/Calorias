import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config. Identity values come from env so the same code can ship under a
 * different bundle id / name (see docs/RELEASE.md). Never put secrets here.
 */
const APP_NAME = process.env.APP_NAME ?? 'Bocado';
const BUNDLE_ID = process.env.APP_BUNDLE_ID ?? 'com.bocadoapp.bocado';
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID;
const ANDROID_MINIFY = process.env.ANDROID_MINIFY === 'true';
const IS_DEV = process.env.APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? `${APP_NAME} (dev)` : APP_NAME,
  slug: 'bocado',
  version: '0.5.5',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'bocado',
  userInterfaceStyle: 'automatic',
  runtimeVersion: { policy: 'appVersion' },
  updates: EAS_PROJECT_ID ? { url: `https://u.expo.dev/${EAS_PROJECT_ID}` } : undefined,
  ios: {
    bundleIdentifier: IS_DEV ? `${BUNDLE_ID}.dev` : BUNDLE_ID,
    supportsTablet: false,
    usesAppleSignIn: true,
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      NSCameraUsageDescription:
        'Bocado usa la cámara para fotografiar tus comidas y escanear códigos de barras.',
      NSPhotoLibraryUsageDescription:
        'Bocado accede a tus fotos solo cuando elegís una imagen de tu comida.',
      NSMicrophoneUsageDescription: 'Bocado usa el micrófono para registrar comidas por voz.',
      NSSpeechRecognitionUsageDescription:
        'Bocado transcribe tu voz para registrar lo que comiste.',
      NSHealthShareUsageDescription:
        'Bocado lee tu peso, pasos y calorías activas para ajustar tus objetivos.',
      NSHealthUpdateUsageDescription:
        'Bocado registra tu peso en Salud cuando lo cargás en la app.',
    },
    entitlements: { 'com.apple.developer.healthkit': true },
  },
  android: {
    package: IS_DEV ? `${BUNDLE_ID}.dev` : BUNDLE_ID,
    // Local/demo builds; EAS manages it remotely (appVersionSource: remote).
    versionCode: 21,
    adaptiveIcon: {
      backgroundColor: '#F2F2EE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // Health data and the session must not travel in Google backups or device transfers: the
    // account syncs through our backend instead.
    allowBackup: false,
    permissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.health.READ_WEIGHT',
      'android.permission.health.WRITE_WEIGHT',
      'android.permission.health.READ_STEPS',
      'android.permission.health.READ_ACTIVE_CALORIES_BURNED',
    ],
    blockedPermissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
  web: { output: 'single', favicon: './assets/images/favicon.png' },
  plugins: [
    'expo-router',
    [
      'react-native-android-widget',
      {
        fonts: [
          './assets/fonts/MaterialSymbolsRounded.ttf',
          '../../node_modules/@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf',
          '../../node_modules/@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf',
        ],
        // Home-screen widgets (src/features/widgets). Sizes follow the launcher grid: 1×1, 2×1, 4×2.
        // previewImage = what the launcher's widget picker shows (assets/widgets, see README there).
        widgets: [
          {
            name: 'BocadoVoice',
            label: 'Bocado · Hablar',
            description: 'Contá lo que comiste con un toque',
            minWidth: '40dp',
            minHeight: '40dp',
            targetCellWidth: 1,
            targetCellHeight: 1,
            resizeMode: 'none',
            previewImage: './assets/widgets/voice.png',
          },
          {
            name: 'BocadoWater',
            label: 'Bocado · Agua',
            description: 'Sumá agua sin abrir la app y mirá cuánto llevás',
            minWidth: '40dp',
            minHeight: '40dp',
            targetCellWidth: 2,
            targetCellHeight: 1,
            resizeMode: 'horizontal',
            // Redraw at least every 30 min (Android's minimum) so a new day shows up without opening the app.
            updatePeriodMillis: 1800000,
            previewImage: './assets/widgets/water.png',
          },
          {
            name: 'BocadoQuickLog',
            label: 'Bocado · Registrar',
            description: 'Hablar, sacar una foto o escribir',
            minWidth: '110dp',
            minHeight: '40dp',
            targetCellWidth: 2,
            targetCellHeight: 1,
            resizeMode: 'horizontal',
            previewImage: './assets/widgets/quick.png',
          },
          {
            name: 'BocadoToday',
            label: 'Bocado · Hoy',
            description: 'Calorías que te quedan y registro rápido',
            minWidth: '250dp',
            minHeight: '110dp',
            targetCellWidth: 4,
            targetCellHeight: 2,
            resizeMode: 'horizontal|vertical',
            updatePeriodMillis: 1800000,
            previewImage: './assets/widgets/today.png',
          },
          {
            name: 'BocadoUsual',
            label: 'Bocado · Lo de siempre',
            description: 'Registrá tus comidas de siempre con un toque, sin abrir la app',
            minWidth: '250dp',
            minHeight: '110dp',
            targetCellWidth: 4,
            targetCellHeight: 2,
            resizeMode: 'horizontal|vertical',
            // Redraw at least every 30 min (Android's minimum) so a new day shows up without opening the app.
            updatePeriodMillis: 1800000,
            previewImage: './assets/widgets/usual.png',
          },
        ],
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F2F2EE',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
        dark: { backgroundColor: '#121413', image: './assets/images/splash-icon-dark.png' },
      },
    ],
    'expo-sqlite',
    'expo-secure-store',
    'expo-localization',
    'expo-apple-authentication',
    [
      'expo-camera',
      {
        cameraPermission:
          'Bocado usa la cámara para fotografiar tus comidas y escanear códigos de barras.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-image-picker',
      { photosPermission: 'Bocado accede a tus fotos solo cuando elegís una imagen de tu comida.' },
    ],
    ['expo-notifications', { color: '#0E8F67' }],
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          minSdkVersion: 26,
          // R8 + resource shrinking (smaller, harder to reverse APK). Opt-in per build while it is
          // verified on devices: ANDROID_MINIFY=true (workflow input "minify").
          ...(ANDROID_MINIFY && {
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
            // Libraries that reach classes by reflection and don't ship complete keep rules.
            extraProguardRules: [
              '-keep class com.reactnativeandroidwidget.** { *; }',
              '-keep class com.revenuecat.purchases.** { *; }',
              '-keep class dev.matinzd.healthconnect.** { *; }',
              '-keep class androidx.health.connect.client.** { *; }',
            ].join('\n'),
          }),
        },
        ios: { deploymentTarget: '16.4' },
      },
    ],
    'expo-sharing',
    [
      '@sentry/react-native',
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ],
    [
      'expo-speech-recognition',
      {
        microphonePermission: 'Bocado usa el micrófono para registrar comidas por voz.',
        speechRecognitionPermission: 'Bocado transcribe tu voz para registrar lo que comiste.',
      },
    ],
    'react-native-health-connect',
    [
      '@kingstinct/react-native-healthkit',
      {
        NSHealthShareUsageDescription:
          'Bocado lee tu peso, pasos y calorías activas para ajustar tus objetivos.',
        NSHealthUpdateUsageDescription:
          'Bocado registra tu peso en Salud cuando lo cargás en la app.',
        background: false,
      },
    ],
  ],
  experiments: { typedRoutes: true, reactCompiler: true },
  extra: {
    eas: EAS_PROJECT_ID ? { projectId: EAS_PROJECT_ID } : undefined,
    router: {},
  },
});
