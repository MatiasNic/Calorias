import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config. Identity values come from env so the same code can ship under a
 * different bundle id / name (see docs/RELEASE.md). Never put secrets here.
 */
const APP_NAME = process.env.APP_NAME ?? 'Bocado';
const BUNDLE_ID = process.env.APP_BUNDLE_ID ?? 'com.bocadoapp.bocado';
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID;
const IS_DEV = process.env.APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? `${APP_NAME} (dev)` : APP_NAME,
  slug: 'bocado',
  version: '0.2.7',
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
    versionCode: 9,
    adaptiveIcon: {
      backgroundColor: '#F2F2EE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
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
    ],
  },
  web: { output: 'single', favicon: './assets/images/favicon.png' },
  plugins: [
    'expo-router',
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
        android: { compileSdkVersion: 36, targetSdkVersion: 36, minSdkVersion: 26 },
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
