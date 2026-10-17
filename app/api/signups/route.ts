import { env } from "cloudflare:workers";
import { NextRequest, NextResponse } from "next/server";
import { signupStore } from "../../../lib/backend.ts";
import { ownerEmail } from "../../../lib/owner.ts";

// Beta sign-ups as CSV, for the emails listed in ADMIN_EMAILS.
export async function GET(request: NextRequest) {
  let email = "";
  try {
    email = await ownerEmail(request.headers);
  } catch {}
  const admins = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase());
  if (!email || !admins.includes(email))
    return new NextResponse("Not found", { status: 404 });
  // Quote every cell; a leading ' stops spreadsheets running formulas.
  const cell = (v: unknown) =>
    `"${String(v ?? "")
      .replace(/^[=+\-@\t\r]/, "'$&")
      .replaceAll('"', '""')}"`;
  const rows = await signupStore().signups();
  const csv = [
    "email,what,who,at",
    ...rows.map((r) => [r.email, r.what, r.who, r.at].map(cell).join(",")),
  ].join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="send-it-signups.csv"',
      "cache-control": "no-store",
    },
  });
}
