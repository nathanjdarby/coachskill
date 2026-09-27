"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { normaliseCalendarUrl, syncCalendarSource } from "@/lib/calendar-sync";
import { rotateFeedToken } from "@/lib/calendar-feed";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { calendarSources, externalBusy } from "@/lib/db/schema";
import type { FormState } from "./types";

function revalidateConnections() {
  revalidatePath("/admin/scheduling/connections");
  revalidatePath("/admin/scheduling");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/discovery");
  revalidatePath("/portal/sessions");
}

function source(id: number) {
  return getDb().select().from(calendarSources).where(eq(calendarSources.id, id)).get() ?? null;
}

/** Saves a calendar address and reads it straight away so Monika knows it works. */
export async function addCalendarSource(_state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim().slice(0, 60) || "My calendar";
  const normalised = normaliseCalendarUrl(String(formData.get("url") ?? "").slice(0, 2000));
  if ("error" in normalised) return { ok: false, errors: { url: normalised.error }, fields: { label } };

  const created = getDb()
    .insert(calendarSources)
    .values({ label, url: normalised.url, createdAt: new Date() })
    .returning()
    .get();
  const result = await syncCalendarSource(created);
  if (!result.ok) {
    // Only keep addresses that work; nothing was stored for this one.
    getDb().delete(calendarSources).where(eq(calendarSources.id, created.id)).run();
    return { ok: false, errors: { url: result.error }, fields: { label } };
  }
  revalidateConnections();
  return { ok: true, message: `Connected. Found ${result.count} busy ${result.count === 1 ? "time" : "times"} coming up.` };
}

export async function refreshCalendarSource(id: number): Promise<FormState> {
  await requireAdmin();
  const found = source(id);
  if (!found) return { ok: false, message: "Calendar not found." };
  const result = await syncCalendarSource(found);
  revalidateConnections();
  return result.ok ? { ok: true, message: `Updated: ${result.count} busy ${result.count === 1 ? "time" : "times"}.` } : { ok: false, message: result.error };
}

/** Turns a calendar on or off, or changes whether all-day events block the day. */
export async function updateCalendarSource(id: number, change: { active?: boolean; blockAllDay?: boolean }): Promise<FormState> {
  await requireAdmin();
  const found = source(id);
  if (!found) return { ok: false, message: "Calendar not found." };
  getDb().update(calendarSources).set(change).where(eq(calendarSources.id, id)).run();
  // All-day handling changes what's stored, so read it again.
  if (change.blockAllDay !== undefined && (change.active ?? found.active)) {
    await syncCalendarSource({ ...found, ...change });
  }
  revalidateConnections();
  return { ok: true };
}

export async function removeCalendarSource(id: number): Promise<FormState> {
  await requireAdmin();
  const db = getDb();
  db.transaction(() => {
    db.delete(externalBusy).where(eq(externalBusy.sourceId, id)).run();
    db.delete(calendarSources).where(eq(calendarSources.id, id)).run();
  });
  revalidateConnections();
  return { ok: true, message: "Calendar removed." };
}

export async function rotateCalendarFeed(): Promise<FormState> {
  await requireAdmin();
  rotateFeedToken();
  revalidatePath("/admin/scheduling/connections");
  return { ok: true, message: "New address created. The old one has stopped working, so subscribe again with the new one." };
}
