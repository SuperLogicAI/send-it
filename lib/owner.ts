import type { Workspace } from "./actions.ts";

// ponytail: fixed development owner. Step 1.4 replaces this with the verified,
// lowercased Cloudflare Access email. It fails closed in production builds so
// a deploy before 1.4 cannot put everyone in one workspace.
export function storageKey(mode: Workspace) {
  if (process.env.NODE_ENV === "production")
    throw new Error("Sign-in is not configured yet (plan step 1.4).");
  return `${mode === "demo" ? "demo" : "owner"}:dev@example.test`;
}
