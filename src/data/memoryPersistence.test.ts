import { describe, expect, it } from "vitest";
import { MemoryPersistence } from "./memoryPersistence";

describe("MemoryPersistence", () => {
  it("implements the replaceable persistence contract", async () => {
    const persistence = new MemoryPersistence();
    await persistence.set("trip", { name: "Redwoods" });

    expect(await persistence.get("trip")).toEqual({ name: "Redwoods" });

    const read = await persistence.get<{ name: string }>("trip");
    if (read) read.name = "Mutated outside storage";
    expect(await persistence.get("trip")).toEqual({ name: "Redwoods" });

    await persistence.delete("trip");
    expect(await persistence.get("trip")).toBeUndefined();
  });
});
