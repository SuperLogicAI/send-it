import { env } from "cloudflare:workers";
import type { Workspace } from "./actions.ts";

export function storeFor(mode: Workspace, email: string) {
  const ns = env.OWNER_STORE;
  return ns.get(
    ns.idFromName(`${mode === "demo" ? "demo" : "owner"}:${email}`),
  );
}
