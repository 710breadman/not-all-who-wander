import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { deleteCampingDatabase, openCampingDatabase } from "../data/database";
import { MasterItemRepository, TripRepository } from "../data/repositories";
import { configureSync, createSyncSettings, listSyncQueue, stageApprovedRecords } from "../data/syncRepository";
import { chooseNewerVersion, syncNow, toCloudPayload } from "./syncService";

describe("local sync foundation", () => {
  const names: string[] = [];
  afterEach(async () => { await Promise.all(names.splice(0).map((name) => deleteCampingDatabase(name))); });

  it("coalesces enabled local writes into one durable queue entry", async () => {
    const name = `sync-${crypto.randomUUID()}`;
    names.push(name);
    const database = await openCampingDatabase({ databaseName: name });
    await configureSync(database, createSyncSettings("user-a", ["masterItems"]));
    const item = (await new MasterItemRepository(database).list())[0]!;
    await new MasterItemRepository(database).save({ ...item, name: "Cloud coffee" });
    await new MasterItemRepository(database).save({ ...item, name: "Cloud coffee beans" });
    const queue = await listSyncQueue(database, "user-a");
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ entityType: "masterItems", entityId: item.id, operation: "UPSERT" });
    expect((await database.get("syncMetadata", `masterItems:${item.id}`))?.revision).toBe(2);
    database.close();
  });

  it("pushes approved payloads and retains failed work for retry", async () => {
    const name = `sync-${crypto.randomUUID()}`;
    names.push(name);
    const database = await openCampingDatabase({ databaseName: name });
    await configureSync(database, createSyncSettings("user-a", ["masterItems"]));
    const item = (await new MasterItemRepository(database).list())[0]!;
    await new MasterItemRepository(database).save({ ...item, name: "Queued item" });
    const pushed: string[] = [];
    await expect(syncNow(database, { pull: async () => ({ entries: [] }), push: async (_userId, _type, payloads) => { pushed.push(...payloads.map((entry) => entry.id)); } }, "user-a")).resolves.toMatchObject({ pushed: 1 });
    expect(pushed).toEqual([item.id]);
    expect(await listSyncQueue(database, "user-a")).toEqual([]);
    await new MasterItemRepository(database).save({ ...item, name: "Retry item" });
    const result = await syncNow(database, { pull: async () => ({ entries: [] }), push: async () => { throw new Error("offline"); } }, "user-a");
    expect(result.error).toBe("offline");
    expect((await listSyncQueue(database, "user-a"))[0]?.attemptCount).toBe(1);
    database.close();
  });

  it("keeps a newer local edit queued when it lands during an upload", async () => {
    const name = `sync-${crypto.randomUUID()}`;
    names.push(name);
    const database = await openCampingDatabase({ databaseName: name });
    await configureSync(database, createSyncSettings("user-a", ["masterItems"]));
    const repository = new MasterItemRepository(database);
    const item = (await repository.list())[0]!;
    await repository.save({ ...item, name: "First queued edit" });

    let signalUploadStarted!: () => void;
    const uploadStarted = new Promise<void>((resolve) => {
      signalUploadStarted = resolve;
    });
    let releaseUpload: () => void = () => undefined;
    const uploadReleased = new Promise<void>((resolve) => {
      releaseUpload = resolve;
    });
    const syncing = syncNow(
      database,
      {
        pull: async () => ({ entries: [] }),
        push: async () => {
          signalUploadStarted();
          await uploadReleased;
        },
      },
      "user-a",
    );
    await uploadStarted;
    await repository.save({ ...item, name: "Newer local edit" });
    releaseUpload();
    await syncing;

    expect(await listSyncQueue(database, "user-a")).toHaveLength(1);
    expect((await database.get("syncMetadata", `masterItems:${item.id}`))?.syncState).toBe("dirty");
    expect((await database.get("syncMetadata", `masterItems:${item.id}`))?.revision).toBe(2);
    database.close();
  });

  it("retains a queue entry when its local record is missing", async () => {
    const name = `sync-${crypto.randomUUID()}`;
    names.push(name);
    const database = await openCampingDatabase({ databaseName: name });
    await configureSync(database, createSyncSettings("user-a", ["masterItems"]));
    const item = (await new MasterItemRepository(database).list())[0]!;
    await new MasterItemRepository(database).save({ ...item, name: "Queued item" });
    await database.delete("masterItems", item.id);

    const result = await syncNow(
      database,
      { pull: async () => ({ entries: [] }), push: async () => undefined },
      "user-a",
    );

    expect(result.error).toMatch(/missing locally/i);
    expect((await listSyncQueue(database, "user-a"))[0]?.attemptCount).toBe(1);
    database.close();
  });

  it("keeps sensitive trip fields local-only and resolves revisions deterministically", async () => {
    expect(() => toCloudPayload("trips", { id: "trip", medicalAllergyNote: "private" }, 1, "2026-01-01T00:00:00.000Z")).toThrow(/local-only/i);
    expect(chooseNewerVersion({ revision: 2, updatedAt: "2026-01-01T00:00:00.000Z" }, { revision: 1, updatedAt: "2030-01-01T00:00:00.000Z" })).toBe("local");
    expect(chooseNewerVersion({ revision: 2, updatedAt: "2026-01-01T00:00:00.000Z" }, { revision: 2, updatedAt: "2027-01-01T00:00:00.000Z" })).toBe("remote");
  });

  it("does not queue regular local records until the user enables a scope", async () => {
    const name = `sync-${crypto.randomUUID()}`;
    names.push(name);
    const database = await openCampingDatabase({ databaseName: name });
    await new TripRepository(database).save({ id: "local-trip", name: "Offline", camperCount: 1, style: "car", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", archived: false });
    expect(await database.getAll("syncQueue")).toEqual([]);
    database.close();
  });

  it("stages existing approved records only after explicit upload confirmation", async () => {
    const name = `sync-${crypto.randomUUID()}`;
    names.push(name);
    const database = await openCampingDatabase({ databaseName: name });
    await configureSync(database, createSyncSettings("user-a", ["masterItems"]));
    const count = await stageApprovedRecords(database, "user-a");
    expect(count).toBeGreaterThan(0);
    expect((await listSyncQueue(database, "user-a")).length).toBe(count);
    database.close();
  });

  it("pulls a newer remote inventory record and retains a conflicting local copy", async () => {
    const name = `sync-${crypto.randomUUID()}`;
    names.push(name);
    const database = await openCampingDatabase({ databaseName: name });
    await configureSync(database, createSyncSettings("user-a", ["masterItems"]));
    const item = (await new MasterItemRepository(database).list())[0]!;
    await new MasterItemRepository(database).save({ ...item, name: "Local version" });
    const result = await syncNow(database, { pull: async () => ({ entries: [{ id: item.id, revision: 2, updatedAt: "2030-01-01T00:00:00.000Z", data: { ...item, name: "Remote version" } }] }), push: async () => undefined }, "user-a");
    expect(result).toMatchObject({ pulled: 1, conflicts: 1, pushed: 0 });
    expect((await new MasterItemRepository(database).get(item.id))?.name).toBe("Remote version");
    expect(await database.getAll("syncConflicts")).toHaveLength(1);
    database.close();
  });
});
