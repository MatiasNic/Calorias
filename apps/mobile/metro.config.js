// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build (used only for local previews / screenshots) ships a wasm binary.
config.resolver.assetExts.push('wasm');

module.exports = config;
