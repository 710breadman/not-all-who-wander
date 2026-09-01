import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const nativeAndroid = mode === "android";
  return {
    base: nativeAndroid ? "./" : "/not-all-who-wander/",
    plugins: [
      react(),
      VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["pal.svg", "pal-favicon.svg"],
      manifest: {
        name: "Path A Logical",
        short_name: "PAL",
        description: "A local-first camping planning and packing app.",
        theme_color: "#24452F",
        background_color: "#F7F0DE",
        display: "standalone",
        start_url: "/not-all-who-wander/",
        icons: [
          {
            src: "pal.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: "index.html",
      },
      }),
    ],
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      include: ["src/**/*.test.{ts,tsx}"],
    },
  };
});
