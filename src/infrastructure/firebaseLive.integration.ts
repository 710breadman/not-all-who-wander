import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { createUserWithEmailAndPassword, deleteUser, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { deleteDoc, doc, getDoc, getFirestore } from "firebase/firestore";
import { openCampingDatabase, deleteCampingDatabase } from "../data/database";
import { MasterItemRepository } from "../data/repositories";
import { configureSync, createSyncSettings } from "../data/syncRepository";
import { syncNow } from "../application/syncService";
import { getConfiguredFirebaseAuth } from "../application/authService";
import { getFirebaseApp } from "./firebase";
import { createFirestoreSyncClient } from "./firestoreSyncClient";

const live = import.meta.env.VITE_FIREBASE_LIVE_SMOKE === "true" ? it : it.skip;

live("syncs inventory through the deployed Firebase project and denies unauthenticated reads", async () => {
  const email = `pal-live-${crypto.randomUUID()}@example.invalid`;
  const password = `PAL-${crypto.randomUUID()}-sync`;
  const databaseName = `firebase-live-${crypto.randomUUID()}`;
  const auth = getConfiguredFirebaseAuth();
  const firestore = getFirestore(getFirebaseApp());
  const database = await openCampingDatabase({ databaseName });
  let userId: string | undefined;
  let itemId: string | undefined;

  try {
    const account = await createUserWithEmailAndPassword(auth, email, password);
    userId = account.user.uid;
    await configureSync(database, createSyncSettings(userId, ["masterItems"]));

    const item = (await new MasterItemRepository(database).list())[0]!;
    itemId = item.id;
    await new MasterItemRepository(database).save({ ...item, name: "PAL live Firebase verification" });

    const sync = await syncNow(database, createFirestoreSyncClient(), userId);
    expect(sync).toMatchObject({ pushed: 1 });
    expect(sync.error).toBeUndefined();

    const remote = await getDoc(doc(firestore, "users", userId, "masterItems", item.id));
    expect(remote.data()).toMatchObject({ id: item.id, data: { name: "PAL live Firebase verification" } });

    await signOut(auth);
    await expect(getDoc(doc(firestore, "users", userId, "masterItems", item.id))).rejects.toMatchObject({ code: "permission-denied" });
  } finally {
    if (userId) {
      const account = await signInWithEmailAndPassword(auth, email, password).catch(() => undefined);
      if (account && itemId) await deleteDoc(doc(firestore, "users", userId, "masterItems", itemId)).catch(() => undefined);
      if (account) await deleteUser(account.user).catch(() => undefined);
    }
    await signOut(auth).catch(() => undefined);
    database.close();
    await deleteCampingDatabase(databaseName);
  }
});
