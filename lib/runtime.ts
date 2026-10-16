import { join } from "node:path";
import { openStore, seedDemo, type Store } from "./store.ts";

export type Workspace = "demo" | "local";
const globals = globalThis as typeof globalThis & {
  engineStores?: Map<string, Store>;
};
const stores = (globals.engineStores ??= new Map());

export function workspace(value: string | undefined): Workspace {
  return value === "local" ? "local" : "demo";
}
export function getStore(mode: Workspace) {
  const path = join(
    process.cwd(),
    "data",
    mode === "demo" ? "demo.db" : "engine.db",
  );
  let db = stores.get(path);
  if (!db) {
    db = openStore(path);
    if (mode === "demo") seedDemo(db);
    stores.set(path, db);
  }
  return db;
}
