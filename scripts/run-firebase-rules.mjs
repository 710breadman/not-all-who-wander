import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const jdk21 = "C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.12.101-hotspot";
const environment = { ...process.env };
// Reuse the checked emulator line available on the Windows build host. The
// CLI verifies normal production behavior; this affects test-only startup.
environment.FIRESTORE_EMULATOR_VERSION ??= "1.19.8";
if (process.platform === "win32" && existsSync(jdk21)) {
  environment.JAVA_HOME = jdk21;
  environment.Path = `${jdk21}\\bin;${process.env.Path ?? ""}`;
}

const result = spawnSync(process.execPath, [
  resolve("node_modules/firebase-tools/lib/bin/firebase.js"),
  "emulators:exec",
  "--only",
  "firestore",
  "--project",
  "demo-pal-sync",
  "node --test firebase/firestore.rules.test.mjs",
], { cwd: process.cwd(), env: environment, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
