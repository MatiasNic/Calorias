import { Platform } from 'react-native';

/** Feature flags. Flip here (or wire to PostHog flags) without touching feature code. */
export const features = {
  healthSync: process.env.EXPO_PUBLIC_FEATURE_HEALTH === 'true',
  voiceLogging: true,
  weeklyPaywallProduct: false,
  scanPack: false,
  ads: false,
  homeWidget: false,
  appleSignIn: Platform.OS === 'ios',
  googleSignIn: true,
  guestMode: true,
} as const;
