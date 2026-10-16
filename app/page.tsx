import { cookies } from "next/headers";
import { workspace } from "../lib/actions.ts";
import { storeFor } from "../lib/backend.ts";
import instructions from "../prompts/draft.md?raw";
import Dashboard from "./ui.tsx";

export const dynamic = "force-dynamic";
export default async function Home() {
  const mode = workspace((await cookies()).get("engine-workspace")?.value);
  return (
    <Dashboard
      instructions={instructions}
      // RPC results carry Symbol.dispose, which React can't serialize.
      initial={JSON.parse(JSON.stringify(await storeFor(mode).view(mode)))}
    />
  );
}
