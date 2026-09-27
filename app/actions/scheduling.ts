"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { bookingLinks, coachingSessions, eventTypes } from "@/lib/db/schema";
import { BUILT_IN_SLUGS, COACHING_SLUG } from "@/lib/event-types";
import type { FormState } from "./types";

const AUDIENCES = ["clients_with_credits", "invite_only", "admin_only"] as const;
const LOCATIONS = ["jitsi", "custom", "in_person"] as const;
const BUILT_IN = BUILT_IN_SLUGS;

function text(formData: FormData, key: string, max = 200) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
}

function revalidateTypes() {
  revalidatePath("/admin/scheduling/event-types");
  revalidatePath("/admin/scheduling");
  revalidatePath("/admin/calendar");
}

/** Creates (id = null) or updates a booking type. */
export async function saveEventType(id: number | null, _state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = {
    name: text(formData, "name", 80),
    durationMinutes: text(formData, "durationMinutes", 4),
    bufferMinutes: text(formData, "bufferMinutes", 4),
    audience: text(formData, "audience", 30),
    locationMode: text(formData, "locationMode", 20),
    customUrl: text(formData, "customUrl", 500),
    colour: text(formData, "colour", 7),
    active: formData.get("active") === "on" ? "on" : "",
  };
  const errors: Record<string, string> = {};
  const db = getDb();
  const existing = id == null ? null : db.select().from(eventTypes).where(eq(eventTypes.id, id)).get();
  if (id != null && !existing) return { ok: false, message: "Booking type not found." };
  const builtIn = existing ? BUILT_IN.includes(existing.slug) : false;

  const duration = fields.durationMinutes === "" ? null : Number(fields.durationMinutes);
  const buffer = fields.bufferMinutes === "" ? null : Number(fields.bufferMinutes);
  if (!fields.name) errors.name = "Give it a name.";
  if (duration !== null && (!Number.isInteger(duration) || duration < 5 || duration > 600)) errors.durationMinutes = "Between 5 and 600 minutes.";
  if (duration === null && existing?.slug !== COACHING_SLUG) errors.durationMinutes = "Set a length in minutes.";
  if (buffer !== null && (!Number.isInteger(buffer) || buffer < 0 || buffer > 240)) errors.bufferMinutes = "Between 0 and 240, or blank.";
  if (!AUDIENCES.includes(fields.audience as (typeof AUDIENCES)[number])) errors.audience = "Choose who can book it.";
  if (!LOCATIONS.includes(fields.locationMode as (typeof LOCATIONS)[number])) errors.locationMode = "Choose where it happens.";
  if (fields.locationMode === "custom" && !/^https:\/\/\S+$/.test(fields.customUrl)) errors.customUrl = "Use a full https:// link.";
  if (!/^#[0-9a-fA-F]{6}$/.test(fields.colour)) errors.colour = "Pick a colour.";
  // The built-in types keep their audience, since the booking flows depend on it.
  if (builtIn && existing && fields.audience !== existing.audience) errors.audience = "This built-in type's audience can't change.";

  let slug = existing?.slug ?? slugify(fields.name);
  if (!existing && slug) {
    const clash = db.select({ id: eventTypes.id }).from(eventTypes).where(eq(eventTypes.slug, slug)).get();
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }
  if (!slug) errors.name = "Use letters or numbers in the name.";
  if (Object.keys(errors).length) return { errors, fields };

  const now = new Date();
  const values = {
    name: fields.name,
    durationMinutes: duration,
    bufferMinutes: buffer,
    audience: fields.audience as (typeof AUDIENCES)[number],
    locationMode: fields.locationMode as (typeof LOCATIONS)[number],
    customUrl: fields.locationMode === "custom" ? fields.customUrl : null,
    colour: fields.colour.toLowerCase(),
    active: builtIn ? true : fields.active === "on",
    updatedAt: now,
  };
  if (existing) db.update(eventTypes).set(values).where(eq(eventTypes.id, existing.id)).run();
  else db.insert(eventTypes).values({ ...values, slug, createdAt: now }).run();
  revalidateTypes();
  return { ok: true, message: existing ? "Saved." : "Booking type created." };
}

/** Deletes a type nobody has booked; otherwise it's hidden instead. */
export async function deleteEventType(id: number) {
  await requireAdmin();
  const db = getDb();
  const type = db.select().from(eventTypes).where(eq(eventTypes.id, id)).get();
  if (!type || BUILT_IN.includes(type.slug)) return;
  const used = db.select({ n: sql<number>`count(*)` }).from(coachingSessions).where(eq(coachingSessions.eventTypeId, id)).get();
  const linked = db.select({ n: sql<number>`count(*)` }).from(bookingLinks).where(eq(bookingLinks.eventTypeId, id)).get();
  if ((used?.n ?? 0) + (linked?.n ?? 0) > 0) db.update(eventTypes).set({ active: false, updatedAt: new Date() }).where(eq(eventTypes.id, id)).run();
  else db.delete(eventTypes).where(eq(eventTypes.id, id)).run();
  revalidateTypes();
}
