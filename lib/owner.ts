import { env } from "cloudflare:workers";
import { AuthError, verifyAccess, type Jwk } from "./access.ts";

// Only an explicit development build skips sign-in. Anything else, including
// an unset NODE_ENV, must present a valid Cloudflare Access token.
export const isDev = () => process.env.NODE_ENV === "development";

let cache: { keys: Jwk[]; at: number } | undefined;
async function getKeys(refresh: boolean) {
  const age = cache ? Date.now() - cache.at : Infinity;
  if (!cache || age > 3_600_000 || (refresh && age > 60_000)) {
    const response = await fetch(
      `https://${env.ACCESS_TEAM}.cloudflareaccess.com/cdn-cgi/access/certs`,
    );
    if (!response.ok) throw new AuthError("Sign-in is unavailable.");
    cache = { keys: ((await response.json()) as { keys: Jwk[] }).keys, at: Date.now() };
  }
  return cache.keys;
}

// The owner key is the verified, lowercased email.
export async function ownerEmail(headers: Headers): Promise<string> {
  if (isDev()) return "dev@example.test";
  const token = headers.get("cf-access-jwt-assertion");
  if (!token) throw new AuthError("Sign in to continue.");
  return verifyAccess(
    token,
    { team: env.ACCESS_TEAM, aud: env.ACCESS_AUD },
    getKeys,
  );
}
