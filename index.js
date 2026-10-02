/**
 * Custom Entry Point
 * Ensures root component registration is performed synchronously on native platforms.
 * Loads CanvasKit WASM on Web before rendering if needed for @shopify/react-native-skia.
 */
import 'react-native-gesture-handler';
import { Platform } from 'react-native';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

if (Platform.OS === 'web') {
  // Web entry: async load CanvasKit before rendering
  try {
    const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
    LoadSkiaWeb({ locateFile: () => '/canvaskit.wasm' })
      .then(() => {
        renderRootComponent(App);
      })
      .catch((err) => {
        console.error('Failed to load Skia Web WASM:', err);
        renderRootComponent(App);
      });
  } catch (e) {
    console.error('Skia web require error:', e);
    renderRootComponent(App);
  }
} else {
  // Native entry (Android / iOS): MUST register root component synchronously during bundle initialization
  renderRootComponent(App);
}

