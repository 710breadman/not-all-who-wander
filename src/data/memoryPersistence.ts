import type { PersistenceStore } from "./persistence";

export class MemoryPersistence implements PersistenceStore {
  readonly #values = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    const value = this.#values.get(key);
    return value === undefined ? undefined : (structuredClone(value) as T);
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.#values.set(key, structuredClone(value));
  }

  async delete(key: string): Promise<void> {
    this.#values.delete(key);
  }

  async clear(): Promise<void> {
    this.#values.clear();
  }
}
