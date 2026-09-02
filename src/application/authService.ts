import {
  GoogleAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseApp, isFirebaseConfigured } from "../infrastructure/firebase";

export interface CloudAccount {
  id: string;
  email: string;
  name: string;
}

export function isCloudAuthenticationConfigured(): boolean {
  return isFirebaseConfigured();
}

export function getConfiguredFirebaseAuth() {
  if (!isCloudAuthenticationConfigured()) {
    throw new Error("Cloud sign-in has not been configured for this app yet.");
  }
  const instance = getAuth(getFirebaseApp());
  if (import.meta.env.VITE_FIREBASE_AUTH_USE_EMULATOR === "true" && !authEmulatorConnected) {
    connectAuthEmulator(instance, `http://${import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1"}:${import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT || "9099"}`, { disableWarnings: true });
    authEmulatorConnected = true;
  }
  return instance;
}

let authEmulatorConnected = false;

function accountFrom(user: User): CloudAccount {
  if (!user.email) {
    throw new Error("Your account did not provide an email address.");
  }
  return {
    id: user.uid,
    email: user.email.toLowerCase(),
    name: user.displayName?.trim() || user.email.split("@")[0] || "Camper",
  };
}

export function subscribeToCloudAccount(
  callback: (account: CloudAccount | undefined) => void,
): () => void {
  if (!isCloudAuthenticationConfigured()) return () => undefined;
  return onAuthStateChanged(getConfiguredFirebaseAuth(), (user) =>
    callback(user?.email ? accountFrom(user) : undefined),
  );
}

export async function signInWithGoogle(): Promise<CloudAccount> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return accountFrom((await signInWithPopup(getConfiguredFirebaseAuth(), provider)).user);
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<CloudAccount> {
  return accountFrom(
    (await signInWithEmailAndPassword(getConfiguredFirebaseAuth(), email.trim(), password)).user,
  );
}

export async function createCloudAccount(
  email: string,
  password: string,
): Promise<CloudAccount> {
  return accountFrom(
    (await createUserWithEmailAndPassword(getConfiguredFirebaseAuth(), email.trim(), password)).user,
  );
}

export async function signOutOfCloudAccount(): Promise<void> {
  if (isCloudAuthenticationConfigured()) await signOut(getConfiguredFirebaseAuth());
}

export function readableAuthError(reason: unknown): string {
  const code =
    typeof reason === "object" && reason && "code" in reason
      ? String(reason.code)
      : "";
  if (code === "auth/popup-closed-by-user") return "Google sign-in was cancelled.";
  if (code === "auth/popup-blocked") return "Allow pop-ups, then try Google sign-in again.";
  if (code === "auth/unauthorized-domain") {
    return "Google sign-in is not allowed from this web address. Open PAL at localhost, or add this domain in Firebase Authentication settings.";
  }
  if (code === "auth/operation-not-allowed") {
    return "Google sign-in is not enabled for this Firebase project yet.";
  }
  if (code === "auth/network-request-failed") {
    return "Google sign-in could not reach Firebase. Check your connection and try again.";
  }
  if (code === "auth/invalid-credential") return "That email or password is not correct.";
  if (code === "auth/email-already-in-use") return "That email already has an account. Try signing in instead.";
  if (code === "auth/weak-password") return "Choose a password with at least 8 characters.";
  if (reason instanceof Error) return reason.message;
  return "Sign-in could not be completed. Please try again.";
}
