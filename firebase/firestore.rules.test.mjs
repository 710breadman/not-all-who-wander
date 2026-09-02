import { readFileSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
let environment;
const inventory = (id = "tent") => ({
  id,
  revision: 1,
  updatedAt: "2026-08-31T00:00:00.000Z",
  serverUpdatedAt: serverTimestamp(),
  data: {
    id,
    name: "Tent",
    category: "gear",
    section: "Shelter",
    defaultQuantity: 1,
    unit: "item",
    tripStyles: ["car"],
    tags: ["shelter"],
    archived: false,
    source: "user",
  },
});

before(async () => {
  environment = await initializeTestEnvironment({ projectId: "demo-pal-sync", firestore: { rules } });
});

beforeEach(async () => { await environment.clearFirestore(); });
after(async () => { await environment.cleanup(); });

test("unauthenticated callers cannot read or write private inventory", async () => {
  const firestore = environment.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(firestore, "users", "user-a", "masterItems", "tent")));
  await assertFails(setDoc(doc(firestore, "users", "user-a", "masterItems", "tent"), inventory()));
});

test("an owner can create and read their own valid inventory record", async () => {
  const firestore = environment.authenticatedContext("user-a").firestore();
  await assertSucceeds(setDoc(doc(firestore, "users", "user-a", "masterItems", "tent"), inventory()));
  const snapshot = await assertSucceeds(getDoc(doc(firestore, "users", "user-a", "masterItems", "tent")));
  assert.equal(snapshot.data()?.id, "tent");
});

test("a user cannot read or write another user's inventory", async () => {
  const owner = environment.authenticatedContext("user-a").firestore();
  await assertSucceeds(setDoc(doc(owner, "users", "user-a", "masterItems", "tent"), inventory()));
  const intruder = environment.authenticatedContext("user-b").firestore();
  await assertFails(getDoc(doc(intruder, "users", "user-a", "masterItems", "tent")));
  await assertFails(setDoc(doc(intruder, "users", "user-a", "masterItems", "tent"), inventory()));
});

test("rules reject a malformed or mismatched inventory document", async () => {
  const firestore = environment.authenticatedContext("user-a").firestore();
  await assertFails(setDoc(doc(firestore, "users", "user-a", "masterItems", "tent"), inventory("sleeping-bag")));
  await assertFails(setDoc(doc(firestore, "users", "user-a", "masterItems", "tent"), { id: "tent", revision: "one", updatedAt: 10 }));
  await assertFails(setDoc(doc(firestore, "users", "user-a", "masterItems", "tent"), {
    ...inventory(),
    privateNotes: "This field is outside the approved cloud payload.",
  }));
});
