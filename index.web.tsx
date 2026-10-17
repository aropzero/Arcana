// Web entry — CanvasKit (Skia WASM) must be fully loaded before any module
// that imports @shopify/react-native-skia evaluates, so the app is registered
// only after LoadSkiaWeb resolves. The WASM binary is self-hosted from public/.
import "@expo/metro-runtime";
import { App } from "expo-router/build/qualified-entry";
import { renderRootComponent } from "expo-router/build/renderRootComponent";
import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";

LoadSkiaWeb()
  .then(() => {
    renderRootComponent(App);
  })
  .catch((error: unknown) => {
    console.warn("CanvasKit failed to load:", error);
    // Register anyway so the error is visible in the preview.
    renderRootComponent(App);
  });
