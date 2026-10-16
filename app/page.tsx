import { cookies } from "next/headers";
import { getStore, workspace } from "../lib/runtime.ts";
import { contacts, today } from "../lib/store.ts";
import Dashboard from "./ui.tsx";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export default async function Home() {
  const mode = workspace((await cookies()).get("engine-workspace")?.value);
  const db = getStore(mode);
  return (
    <Dashboard
      initial={{ state: today(db), contacts: contacts(db), workspace: mode }}
    />
  );
}
