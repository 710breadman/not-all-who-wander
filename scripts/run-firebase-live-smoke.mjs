import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

if (process.env.FIREBASE_LIVE_SMOKE !== "confirm") {
  throw new Error("Live Firebase tests can create temporary cloud data. Set FIREBASE_LIVE_SMOKE=confirm to run them.");
}

const envPath = resolve(".env.local");
if (!existsSync(envPath)) throw new Error("Missing .env.local Firebase web configuration.");

const requiredKeys = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_APP_ID",
];
const fileValues = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);
for (const key of requiredKeys) {
  if (!fileValues[key]) throw new Error(`Missing ${key} in .env.local.`);
}

const result = spawnSync(process.execPath, [
  resolve("node_modules/vitest/vitest.mjs"),
  "run",
  "src/infrastructure/firebaseLive.integration.ts",
], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ...fileValues,
    VITE_FIREBASE_LIVE_SMOKE: "true",
    VITE_FIREBASE_USE_EMULATOR: "false",
    VITE_FIREBASE_AUTH_USE_EMULATOR: "false",
  },
  stdio: "inherit",
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
