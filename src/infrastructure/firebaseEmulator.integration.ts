import "fake-indexeddb/auto";
import { afterEach, expect, it } from "vitest";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { openCampingDatabase, deleteCampingDatabase } from "../data/database";
import { MasterItemRepository } from "../data/repositories";
import { configureSync, createSyncSettings } from "../data/syncRepository";
import { syncNow } from "../application/syncService";
import { getFirebaseApp } from "./firebase";
import { createFirestoreSyncClient } from "./firestoreSyncClient";
import { getConfiguredFirebaseAuth } from "../application/authService";

const databases: string[] = [];
afterEach(async () => {
  await signOut(getConfiguredFirebaseAuth());
  await Promise.all(databases.splice(0).map((name) => deleteCampingDatabase(name)));
});

const integration = import.meta.env.VITE_FIREBASE_USE_EMULATOR === "true" ? it : it.skip;

integration("uploads an explicitly queued inventory change through Firebase Auth and Firestore rules", async () => {
  const email = `camper-${crypto.randomUUID()}@example.com`;
  const account = await createUserWithEmailAndPassword(getConfiguredFirebaseAuth(), email, "secure-password");
  const name = `firebase-integration-${crypto.randomUUID()}`;
  databases.push(name);
  const database = await openCampingDatabase({ databaseName: name });
  await configureSync(database, createSyncSettings(account.user.uid, ["masterItems"]));
  const item = (await new MasterItemRepository(database).list())[0]!;
  await new MasterItemRepository(database).save({ ...item, name: "Firebase-verified inventory" });
  await expect(syncNow(database, createFirestoreSyncClient(), account.user.uid)).resolves.toMatchObject({ pushed: 1 });
  const remote = await getDoc(doc(getFirestore(getFirebaseApp()), "users", account.user.uid, "masterItems", item.id));
  expect(remote.data()).toMatchObject({ id: item.id, data: { name: "Firebase-verified inventory" } });
  database.close();
});
