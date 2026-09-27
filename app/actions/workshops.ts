"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { signups, workshops } from "@/lib/db/schema";
import { sendBalanceLinkNow } from "@/lib/jobs/workshop-balance";
import { parseLondonDateTime } from "@/lib/time";
import type { FormState } from "./types";

function text(formData: FormData, key: string, max = 500) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function poundsToPence(value: string) {
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(value)) return null;
  return Math.round(Number(value) * 100);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function revalidateWorkshops() {
  revalidatePath("/admin/workshops");
  revalidatePath("/admin/signups");
  revalidatePath("/workshop");
}

/** Creates (id = null) or updates a workshop run. */
export async function saveWorkshop(id: number | null, _state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = {
    name: text(formData, "name", 120),
    slug: text(formData, "slug", 60),
    startsAt: text(formData, "startsAt", 40),
    durationMinutes: text(formData, "durationMinutes", 5),
    location: text(formData, "location", 200),
    capacity: text(formData, "capacity", 5),
    deposit: text(formData, "deposit", 10),
    balance: text(formData, "balance", 10),
    published: formData.get("published") === "on" ? "on" : "",
  };
  const errors: Record<string, string> = {};
  const startsAt = parseLondonDateTime(fields.startsAt);
  const duration = Number(fields.durationMinutes);
  const capacity = fields.capacity === "" ? null : Number(fields.capacity);
  const depositPence = poundsToPence(fields.deposit);
  const balancePence = poundsToPence(fields.balance);
  if (!fields.name) errors.name = "Give the workshop a name.";
  if (!startsAt) errors.startsAt = "Choose a date and time.";
  if (!Number.isInteger(duration) || duration < 15 || duration > 1440) errors.durationMinutes = "Between 15 and 1440 minutes.";
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 500)) errors.capacity = "A whole number, or leave blank for no limit.";
  if (depositPence === null || depositPence < 100) errors.deposit = "At least £1.";
  if (balancePence === null) errors.balance = "Enter an amount (0 for none).";

  const date = startsAt ? startsAt.toISOString().slice(0, 7) : "";
  const slug = slugify(fields.slug || `${fields.name}-${date}`);
  if (!slug) errors.slug = "Use letters, numbers and dashes.";

  const db = getDb();
  if (slug) {
    const [clash] = await db.select({ id: workshops.id }).from(workshops).where(eq(workshops.slug, slug)).limit(1);
    if (clash && clash.id !== id) errors.slug = "Another workshop already uses this link name.";
  }
  if (Object.keys(errors).length || !startsAt || depositPence === null || balancePence === null) return { errors, fields };

  const now = new Date();
  const values = {
    name: fields.name,
    slug,
    startsAt,
    durationMinutes: duration,
    location: fields.location || null,
    capacity,
    depositPence,
    balancePence,
    published: fields.published === "on",
    updatedAt: now,
  };
  if (id == null) {
    await db.insert(workshops).values({ ...values, createdAt: now });
  } else {
    const result = db.update(workshops).set(values).where(eq(workshops.id, id)).run();
    if (result.changes !== 1) return { ok: false, message: "Workshop not found." };
  }
  revalidateWorkshops();
  return { ok: true, message: id == null ? "Workshop created." : "Workshop saved." };
}

/** Emails one attendee their balance link now, ahead of the automatic email. */
export async function sendBalanceLink(signupId: number): Promise<FormState> {
  await requireAdmin();
  const result = await sendBalanceLinkNow(signupId);
  revalidateWorkshops();
  if (!result.ok) return { ok: false, message: result.message };
  return result.emailed
    ? { ok: true, message: "Balance link emailed." }
    : { ok: false, message: "Email isn't configured or failed. Send them this link yourself:", link: result.url };
}

/** Records a balance paid outside Stripe (e.g. bank transfer). */
export async function markBalancePaid(signupId: number): Promise<FormState> {
  await requireAdmin();
  const db = getDb();
  const [row] = await db
    .select({ balancePence: workshops.balancePence })
    .from(signups)
    .innerJoin(workshops, eq(signups.workshopId, workshops.id))
    .where(eq(signups.id, signupId))
    .limit(1);
  if (!row) return { ok: false, message: "Signup not found." };
  const now = new Date();
  const result = db
    .update(signups)
    .set({
      balancePaidAt: now,
      amountPaidPence: sql`${signups.amountPaidPence} + ${row.balancePence}`,
      status: "accepted",
      updatedAt: now,
    })
    .where(and(eq(signups.id, signupId), isNull(signups.balancePaidAt), ne(signups.status, "declined")))
    .run();
  revalidateWorkshops();
  return result.changes === 1 ? { ok: true, message: "Balance marked as paid." } : { ok: false, message: "Already paid or declined." };
}
