import { env } from "cloudflare:workers";

// Spike only: proves the app Worker reaches the store Worker's Durable Object.
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const owner = url.searchParams.get("owner") ?? "a@example.test";
  const op = url.searchParams.get("op") ?? "count";
  if (owner !== "a@example.test" && owner !== "b@example.test")
    return Response.json({ error: "spike allows two fixed owners" }, { status: 400 });
  const stub = env.OWNER_STORE.get(env.OWNER_STORE.idFromName(`owner:${owner}`));
  try {
    const result =
      op === "add"
        ? await stub.add(`p-${Date.now()}@example.test`)
        : op === "bad"
          ? await stub.addWithoutProvenance(`bad-${Date.now()}@example.test`)
          : await stub.count();
    return Response.json({ owner, op, result });
  } catch (e) {
    return Response.json({ owner, op, error: String(e).slice(0, 160) }, { status: 400 });
  }
}
