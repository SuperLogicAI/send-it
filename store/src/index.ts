import { DurableObject, type DurableObjectState } from "cloudflare:workers";
import { SCHEMA } from "../../lib/schema.ts";
import { act, view, type Workspace } from "../../lib/actions.ts";
import type { Store } from "../../lib/store.ts";

// Adapts the Durable Object's SQLite to the Store the data functions expect.
// Each statement runs when exec() is called; toArray() just collects rows.
function sqlStore(ctx: DurableObjectState): Store {
  const rows = (q: string, a: unknown[]) =>
    ctx.storage.sql.exec(q, ...a).toArray();
  return {
    prepare: (q) => ({
      run: (...a) => void rows(q, a),
      get: (...a) => rows(q, a)[0],
      all: (...a) => rows(q, a),
    }),
    exec: (q) => void ctx.storage.sql.exec(q),
    transaction: (fn) => ctx.storage.transactionSync(fn),
  };
}

// One instance per owner and workspace: no owner_id column to forget.
export class OwnerStore extends DurableObject {
  protected db: Store;
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    this.db = sqlStore(ctx);
    void ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(SCHEMA);
    });
  }
  view(mode: Workspace) {
    return view(this.db, mode);
  }
  act(mode: Workspace, input: Record<string, unknown>) {
    return act(this.db, mode, input);
  }
}

// The store has no public HTTP surface; the app reaches it by binding only.
const handler = {
  fetch() {
    return new Response("not found", { status: 404 });
  },
};
export default handler;
