// Verifies the Cloudflare Access JWT (Cf-Access-Jwt-Assertion). Web Crypto only,
// so it runs in Workers and Node. The header merely being present proves nothing.
export type Jwk = JsonWebKey & { kid?: string };
export type AccessConfig = { team: string; aud: string };
export class AuthError extends Error {}

const bytes = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
const json = (s: string) => JSON.parse(new TextDecoder().decode(bytes(s)));
const deny = (why: string): never => {
  throw new AuthError(why);
};

// getKeys(true) means "refetch": the token named a key we don't have.
export async function verifyAccess(
  token: string,
  config: AccessConfig,
  getKeys: (refresh: boolean) => Promise<Jwk[]>,
  now = Date.now(),
): Promise<string> {
  try {
    if (!config.team || !config.aud) return deny("Sign-in is not configured.");
    const parts = token.split(".");
    if (parts.length !== 3) return deny("Invalid sign-in token.");
    const [h, p, sig] = parts;
    const header = json(h);
    if (header.alg !== "RS256" || typeof header.kid !== "string")
      return deny("Invalid sign-in token.");
    const jwk =
      (await getKeys(false)).find((k) => k.kid === header.kid) ??
      (await getKeys(true)).find((k) => k.kid === header.kid);
    if (!jwk) return deny("Invalid sign-in token.");
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      bytes(sig),
      new TextEncoder().encode(`${h}.${p}`),
    );
    if (!valid) return deny("Invalid sign-in token.");
    const c = json(p);
    const seconds = now / 1000;
    const audiences: unknown[] = Array.isArray(c.aud) ? c.aud : [c.aud];
    if (
      c.iss !== `https://${config.team}.cloudflareaccess.com` ||
      !audiences.includes(config.aud) ||
      typeof c.exp !== "number" ||
      c.exp <= seconds ||
      (typeof c.nbf === "number" && c.nbf > seconds + 60) ||
      typeof c.email !== "string" ||
      !c.email.includes("@")
    )
      return deny("Invalid sign-in token.");
    return c.email.trim().toLowerCase();
  } catch (error) {
    throw error instanceof AuthError
      ? error
      : new AuthError("Invalid sign-in token.");
  }
}
