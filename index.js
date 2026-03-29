/**
 * Custom Web Entry Point
 * Loads CanvasKit WASM before the app renders.
 * This is REQUIRED for @shopify/react-native-skia on web.
 * Native platforms skip straight to Expo Router.
 */
import '@expo/metro-runtime';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';
import { Platform } from 'react-native';

async function main() {
  if (Platform.OS === 'web') {
    const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
    await LoadSkiaWeb({ locateFile: () => '/canvaskit.wasm' });
  }
  renderRootComponent(App);
}

main();
