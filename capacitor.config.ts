import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.notallwhowander.camping",
  appName: "Camping",
  webDir: "dist",
  server: { androidScheme: "https" },
};

export default config;
