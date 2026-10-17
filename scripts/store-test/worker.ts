import { OwnerStore } from "../../store/src/index.ts";
import { migrate, transaction } from "../../lib/store.ts";

// Test-only: the real OwnerStore plus raw SQL access, reachable over HTTP from
// check-workers.ts. Never deployed.
export class TestStore extends OwnerStore {
  sql(query: string, ...bindings: unknown[]) {
    return this.ctx.storage.sql.exec(query, ...bindings).toArray();
  }
  migrateNow() {
    migrate(this.db);
    return this.sql("SELECT sql FROM sqlite_master WHERE name='touches'")[0];
  }
  rollbackProbe() {
    try {
      transaction(this.db, () => {
        this.db.prepare("INSERT INTO daily_runs(day) VALUES('2026-10-15')").run();
        throw new Error("boom");
      });
    } catch {
      // expected: the insert must be rolled back
    }
    return this.sql("SELECT count(*) AS n FROM daily_runs")[0];
  }
}

type Stub = Record<string, (...args: unknown[]) => Promise<unknown>>;
type Env = { STORE: { idFromName(n: string): unknown; get(id: unknown): Stub } };
const handler = {
  async fetch(request: Request, env: Env) {
    const key = new URL(request.url).searchParams.get("key") ?? "";
    const { method, args } = (await request.json()) as {
      method: string;
      args: unknown[];
    };
    const stub = env.STORE.get(env.STORE.idFromName(key));
    try {
      return Response.json({ ok: await stub[method](...args) });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : String(error) },
        { status: 400 },
      );
    }
  },
};
export default handler;
