import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const jdk21 = "C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.12.101-hotspot";
const environment = {
  ...process.env,
  FIRESTORE_EMULATOR_VERSION: process.env.FIRESTORE_EMULATOR_VERSION ?? "1.19.8",
  VITE_FIREBASE_API_KEY: "demo-api-key",
  VITE_FIREBASE_AUTH_DOMAIN: "demo-pal-sync.firebaseapp.com",
  VITE_FIREBASE_PROJECT_ID: "demo-pal-sync",
  VITE_FIREBASE_APP_ID: "1:123:web:pal-sync",
  VITE_FIREBASE_USE_EMULATOR: "true",
  VITE_FIREBASE_EMULATOR_HOST: "127.0.0.1",
  VITE_FIREBASE_EMULATOR_PORT: "8082",
  VITE_FIREBASE_AUTH_USE_EMULATOR: "true",
  VITE_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1",
  VITE_FIREBASE_AUTH_EMULATOR_PORT: "9099",
};
if (process.platform === "win32" && existsSync(jdk21)) {
  environment.JAVA_HOME = jdk21;
  environment.Path = `${jdk21}\\bin;${process.env.Path ?? ""}`;
}
const result = spawnSync(process.execPath, [
  resolve("node_modules/firebase-tools/lib/bin/firebase.js"),
  "emulators:exec",
  "--only",
  "firestore,auth",
  "--project",
  "demo-pal-sync",
  "npx vitest run src/infrastructure/firebaseEmulator.integration.ts",
], { cwd: process.cwd(), env: environment, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
