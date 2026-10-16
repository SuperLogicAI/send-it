import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SCHEMA } from "./schema.ts";

// Node-only SQLite, used by the check scripts. Production uses the Durable Object.
export function openStore(path = ":memory:") {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path, {
    enableForeignKeyConstraints: true,
    timeout: 5000,
  });
  db.exec(`
    PRAGMA journal_mode=WAL;
    ${SCHEMA}
  `);
  return db;
}
