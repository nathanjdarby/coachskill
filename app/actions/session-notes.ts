"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { coachingSessions } from "@/lib/db/schema";
import { sendFollowUp } from "@/lib/follow-up";
import type { FormState } from "./types";

const MAX = 20_000;

function revalidateSession(id: number, clientId: number | null) {
  revalidatePath(`/admin/sessions/${id}`);
  if (clientId) revalidatePath(`/admin/clients/${clientId}`);
}

/** Autosave for the private notes and the recap. */
export async function saveSessionNotes(id: number, values: { notes: string; recap: string }): Promise<FormState> {
  const admin = await requireAdmin();
  const db = getDb();
  const existing = db.select({ recap: coachingSessions.recap }).from(coachingSessions).where(eq(coachingSessions.id, id)).get();
  if (!existing) return { ok: false, message: "Appointment not found." };
  const recap = values.recap.slice(0, MAX) || null;
  const result = db
    .update(coachingSessions)
    .set({
      notes: values.notes.slice(0, MAX) || null,
      recap,
      ...(recap !== existing.recap ? { recapById: admin.id } : {}),
    })
    .where(eq(coachingSessions.id, id))
    .run();
  return result.changes === 1 ? { ok: true } : { ok: false, message: "Appointment not found." };
}

export async function setFollowUpEnabled(id: number, enabled: boolean): Promise<FormState> {
  await requireAdmin();
  const row = getDb().update(coachingSessions).set({ followUpEnabled: enabled }).where(eq(coachingSessions.id, id)).returning().get();
  if (!row) return { ok: false, message: "Appointment not found." };
  revalidateSession(id, row.clientId);
  return { ok: true };
}

export async function sendFollowUpNow(id: number): Promise<FormState> {
  await requireAdmin();
  const result = await sendFollowUp(id);
  const row = getDb().select({ clientId: coachingSessions.clientId }).from(coachingSessions).where(eq(coachingSessions.id, id)).get();
  revalidateSession(id, row?.clientId ?? null);
  if (row?.clientId) revalidatePath("/portal/updates");
  return { ok: result.ok, message: result.message };
}
