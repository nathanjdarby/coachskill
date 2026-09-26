"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { appUrl } from "@/lib/app-url";
import { requireClient } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { emailNewMessageToAdmins } from "@/lib/email";
import { adminEmails, hasEarlierUnread } from "@/lib/portal";
import type { FormState } from "./types";

export async function sendClientMessage(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireClient();
  const body = String(formData.get("body") ?? "").trim().slice(0, 10_000);
  if (!body) return { errors: { body: "Write a message first." } };

  const [message] = await getDb()
    .insert(messages)
    .values({ clientId: user.clientId, senderId: user.id, body, createdAt: new Date() })
    .returning();

  if (!(await hasEarlierUnread(user.clientId, "client", message.id))) {
    const [to, url] = await Promise.all([adminEmails(), appUrl(`/admin/clients/${user.clientId}#messages`)]);
    if (to.length) after(() => emailNewMessageToAdmins({ to, clientName: user.name, url }));
  }
  revalidatePath("/portal/messages");
  revalidatePath("/portal");
  return { ok: true };
}
