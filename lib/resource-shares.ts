import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, workshops } from "@/lib/db/schema";

export type ShareInput = { scope: "client" | "all_clients" | "workshop"; clientId: number | null; workshopId: number | null };

/** Reads and validates the share fields posted by the admin forms. */
export async function parseShare(formData: FormData): Promise<ShareInput | { error: string }> {
  const scope = String(formData.get("scope") ?? "");
  if (scope === "all_clients") return { scope, clientId: null, workshopId: null };
  if (scope === "client") {
    const id = Number(formData.get("clientId"));
    const [row] = await getDb().select({ id: clients.id }).from(clients).where(eq(clients.id, id)).limit(1);
    return row ? { scope, clientId: row.id, workshopId: null } : { error: "Choose a client." };
  }
  if (scope === "workshop") {
    const id = Number(formData.get("workshopId"));
    const [row] = await getDb().select({ id: workshops.id }).from(workshops).where(eq(workshops.id, id)).limit(1);
    return row ? { scope, clientId: null, workshopId: row.id } : { error: "Choose a workshop date." };
  }
  return { error: "Choose who can see it." };
}
