// Small typed surface for the two Workers APIs we use. Replace with
// `wrangler types` output only if it stops conflicting with the DOM lib.
declare module "cloudflare:workers" {
  type Mode = import("./lib/actions.ts").Workspace;
  type Payload = import("./lib/actions.ts").Payload;
  export type DurableObjectState = {
    storage: {
      sql: {
        exec(
          query: string,
          ...bindings: unknown[]
        ): { toArray(): Record<string, unknown>[] };
      };
      transactionSync<T>(fn: () => T): T;
    };
    blockConcurrencyWhile(fn: () => Promise<void>): Promise<void>;
  };
  export class DurableObject<Env = unknown> {
    constructor(ctx: DurableObjectState, env: Env);
    protected ctx: DurableObjectState;
    protected env: Env;
  }
  export const env: {
    ACCESS_TEAM: string;
    ACCESS_AUD: string;
    OWNER_STORE: {
      idFromName(name: string): unknown;
      get(id: unknown): {
        view(mode: Mode): Promise<Payload>;
        act(mode: Mode, input: Record<string, unknown>): Promise<Payload>;
      };
    };
  };
}
