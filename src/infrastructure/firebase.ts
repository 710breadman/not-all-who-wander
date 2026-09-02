import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { ReCaptchaEnterpriseProvider, initializeAppCheck } from "firebase/app-check";
import { firebaseConfig, isFirebaseConfigured } from "./firebaseConfig";

export { firebaseConfig, isFirebaseConfigured } from "./firebaseConfig";

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) throw new Error("Firebase has not been configured for this app yet.");
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  initializeAppCheckWhenConfigured(app);
  return app;
}

let appCheckInitialized = false;

function initializeAppCheckWhenConfigured(app: FirebaseApp): void {
  const siteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY;
  if (appCheckInitialized || typeof siteKey !== "string" || !siteKey.trim()) return;
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(siteKey), isTokenAutoRefreshEnabled: true });
  appCheckInitialized = true;
}
