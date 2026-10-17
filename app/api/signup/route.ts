import { NextRequest, NextResponse } from "next/server";
import { signupStore } from "../../../lib/backend.ts";
import { allowedOrigin, isSiteHost } from "../../../lib/origin.ts";
import { isDev } from "../../../lib/owner.ts";
import { emailValid } from "../../../lib/rules.ts";

// Public beta sign-up form on the landing page. A plain HTML form post, so
// it works without JavaScript; the answer comes back as a #fragment.
// Ponytail: honeypot only, no rate limit. Add Turnstile if bots show up.
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  let host: string | null = null;
  try {
    host = new URL(origin ?? "").host;
  } catch {}
  if (
    !isSiteHost(host) &&
    !allowedOrigin(origin, request.headers.get("host"), isDev())
  )
    return new NextResponse("Forbidden", { status: 403 });
  const back = (hash: string) => {
    const self = new URL(request.url);
    let url = new URL("/", self);
    try {
      const referer = new URL(request.headers.get("referer") ?? "");
      if (referer.origin === self.origin) url = new URL(referer.pathname, self);
    } catch {}
    url.hash = hash;
    return NextResponse.redirect(url, 303);
  };
  if (Number(request.headers.get("content-length") ?? 0) > 10_000)
    return back("signup-error");
  const form = await request.formData();
  const text = (key: string) => String(form.get(key) ?? "").trim();
  if (text("website")) return back("thanks"); // honeypot: bots fill every field
  const email = text("email").toLowerCase();
  if (!emailValid(email)) return back("signup-error");
  await signupStore().signup(
    email,
    text("what").slice(0, 500),
    text("who").slice(0, 500),
  );
  return back("thanks");
}
