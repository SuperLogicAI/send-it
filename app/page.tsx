import { cookies, headers } from "next/headers";
import { workspace } from "../lib/actions.ts";
import { storeFor } from "../lib/backend.ts";
import { isSiteHost } from "../lib/origin.ts";
import { ownerEmail } from "../lib/owner.ts";
import instructions from "../prompts/draft.md?raw";
import Landing from "./landing.tsx";
import Dashboard from "./ui.tsx";

export const dynamic = "force-dynamic";
export default async function Home() {
  const requestHeaders = await headers();
  if (isSiteHost(requestHeaders.get("host"))) return <Landing />;
  let email: string;
  try {
    email = await ownerEmail(requestHeaders);
  } catch {
    return <p>Please sign in to use Send It.</p>;
  }
  const mode = workspace((await cookies()).get("engine-workspace")?.value);
  return (
    <Dashboard
      instructions={instructions}
      // RPC results carry Symbol.dispose, which React can't serialize.
      initial={JSON.parse(JSON.stringify(await storeFor(mode, email).view(mode)))}
    />
  );
}
