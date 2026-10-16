import { DurableObject } from "cloudflare:workers";
import { SCHEMA } from "../../lib/schema.ts";

// One instance per owner. Spike methods only; the real RPC surface is step 1.3.
export class OwnerStore extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec(SCHEMA);
    });
  }
  add(email: string) {
    const now = new Date().toISOString();
    return this.ctx.storage.sql
      .exec(
        "INSERT INTO contacts(name,email,signal_source,signal_evidence,signal_at,last_two_way_at) VALUES('Spike Person',?,'two_way','A two-way call about their website.',?,?) RETURNING id",
        email,
        now,
        now,
      )
      .toArray()[0];
  }
  addWithoutProvenance(email: string) {
    return this.ctx.storage.sql
      .exec(
        "INSERT INTO contacts(name,email,signal_source,signal_evidence,signal_at) VALUES('No Signal',?,'scraped','',?) RETURNING id",
        email,
        new Date().toISOString(),
      )
      .toArray()[0];
  }
  count() {
    return this.ctx.storage.sql
      .exec("SELECT count(*) AS n FROM contacts")
      .toArray()[0];
  }
}

const handler = {
  fetch() {
    return new Response("not found", { status: 404 });
  },
};
export default handler;
