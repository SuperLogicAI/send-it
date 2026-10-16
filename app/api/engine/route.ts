import { NextRequest, NextResponse } from "next/server";
import { workspace } from "../../../lib/actions.ts";
import { storeFor } from "../../../lib/backend.ts";
import { allowedOrigin } from "../../../lib/origin.ts";

export async function POST(request: NextRequest) {
  if (!allowedOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return NextResponse.json(
      { error: "Open Send It on this computer to make changes." },
      { status: 403 },
    );
  }
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 1_200_000)
      throw new Error("This request is too large.");
    const input = JSON.parse(raw) as Record<string, unknown>;
    const mode =
      input.action === "workspace"
        ? workspace(String(input.workspace))
        : workspace(request.cookies.get("engine-workspace")?.value);
    const response = NextResponse.json(await storeFor(mode).act(mode, input));
    if (input.action === "workspace")
      response.cookies.set("engine-workspace", mode, {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
      });
    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "That change could not be saved.";
    const safe = /SQLITE|constraint|UNIQUE|CHECK|JSON|syntax/i.test(message)
      ? "Check the required fields and dates. Existing contacts are never replaced by an import."
      : message;
    return NextResponse.json({ error: safe }, { status: 400 });
  }
}
