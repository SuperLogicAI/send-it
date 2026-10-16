import { env } from "cloudflare:workers";
import type { Workspace } from "./actions.ts";
import { storageKey } from "./owner.ts";

export function storeFor(mode: Workspace) {
  const ns = env.OWNER_STORE;
  return ns.get(ns.idFromName(storageKey(mode)));
}
