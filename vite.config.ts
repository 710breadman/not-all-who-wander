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
      includeAssets: ["camping.svg", "pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "Path A Logical",
        short_name: "Path A Logical",
        description: "A local-first camping planning and packing app.",
        theme_color: "#173c2b",
        background_color: "#f5f1e8",
        display: "standalone",
        start_url: "/not-all-who-wander/",
        icons: [
          {
            src: "pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "camping.svg",
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
