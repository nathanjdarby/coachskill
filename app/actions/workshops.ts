"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { onboardAttendee } from "@/lib/attendees";
import { requireAdmin } from "@/lib/dal";
import { getDb } from "@/lib/db";
import { signups, workshopProgrammes, workshops } from "@/lib/db/schema";
import { emailAttendeeInvite } from "@/lib/email";
import { sendBalanceLinkNow } from "@/lib/jobs/workshop-balance";
import { isJitsiUrl, newJitsiUrl } from "@/lib/meeting";
import { notifyWorkshopChange, seatHolders, workshopJoinUrl } from "@/lib/workshop-invite";
import { parseLondonDateTime } from "@/lib/time";
import { deleteUpload, saveUpload } from "@/lib/uploads";
import { isCategory, parsePoints } from "@/lib/workshop-categories";
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
  revalidatePath("/admin/workshops", "layout");
  revalidatePath("/admin/signups");
  revalidatePath("/workshop", "layout");
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Creates (id = null) or updates a workshop: its type, page content and defaults for new dates. */
export async function saveProgramme(id: number | null, _state: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = {
    category: text(formData, "category", 40),
    title: text(formData, "title", 120),
    slug: text(formData, "slug", 60),
    summary: text(formData, "summary", 240),
    intro: text(formData, "intro", 1500),
    outcomes: text(formData, "outcomes", 20000),
    highlights: text(formData, "highlights", 20000),
    durationMinutes: text(formData, "durationMinutes", 5),
    capacity: text(formData, "capacity", 5),
    deposit: text(formData, "deposit", 10),
    balance: text(formData, "balance", 10),
    showTeamSection: formData.get("showTeamSection") === "on" ? "on" : "",
    published: formData.get("published") === "on" ? "on" : "",
    removeImage: formData.get("removeImage") === "on" ? "on" : "",
  };
  const errors: Record<string, string> = {};
  const clean = (json: string) =>
    parsePoints(json)
      .map((p) => ({ title: p.title.trim().slice(0, 120), description: p.description.trim().slice(0, 600) }))
      .filter((p) => p.title || p.description)
      .slice(0, 12);
  const outcomes = clean(fields.outcomes);
  const highlights = clean(fields.highlights);
  const duration = Number(fields.durationMinutes);
  const capacity = fields.capacity === "" ? null : Number(fields.capacity);
  const depositPence = poundsToPence(fields.deposit);
  const balancePence = poundsToPence(fields.balance);
  if (!isCategory(fields.category)) errors.category = "Choose the type of workshop.";
  if (!fields.title) errors.title = "Give the workshop a title.";
  if (!fields.intro) errors.intro = "Add a short introduction for the top of the page.";
  if (outcomes.some((p) => !p.title) || highlights.some((p) => !p.title)) errors.points = "Every point needs a heading.";
  if (!Number.isInteger(duration) || duration < 15 || duration > 1440) errors.durationMinutes = "Between 15 and 1440 minutes.";
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 500)) errors.capacity = "A whole number, or leave blank for no limit.";
  if (depositPence === null || depositPence < 100) errors.deposit = "At least £1.";
  if (balancePence === null) errors.balance = "Enter an amount (0 for none).";

  const slug = slugify(fields.slug || fields.title);
  if (!slug) errors.slug = "Use letters, numbers and dashes.";
  const db = getDb();
  if (slug) {
    const [clash] = await db.select({ id: workshopProgrammes.id }).from(workshopProgrammes).where(eq(workshopProgrammes.slug, slug)).limit(1);
    if (clash && clash.id !== id) errors.slug = "Another workshop already uses this web address.";
  }

  const image = formData.get("image");
  const hasImage = image instanceof File && image.size > 0;
  if (hasImage) {
    if (!/\.(png|jpe?g|webp)$/i.test(image.name)) errors.image = "Use a PNG, JPG or WebP image.";
    else if (image.size > MAX_IMAGE_BYTES) errors.image = "Images can be up to 5 MB.";
  }
  if (Object.keys(errors).length || depositPence === null || balancePence === null) return { errors, fields };

  const existing = id == null ? undefined : (await db.select().from(workshopProgrammes).where(eq(workshopProgrammes.id, id)).limit(1))[0];
  if (id != null && !existing) return { ok: false, message: "Workshop not found." };

  let imageKey = fields.removeImage === "on" ? null : (existing?.imageKey ?? null);
  if (hasImage) {
    const saved = await saveUpload(image);
    if ("error" in saved) return { errors: { image: saved.error }, fields };
    imageKey = saved.storageKey;
  }
  const now = new Date();
  const values = {
    category: fields.category,
    title: fields.title,
    slug,
    summary: fields.summary,
    intro: fields.intro,
    outcomesJson: JSON.stringify(outcomes),
    highlightsJson: JSON.stringify(highlights),
    imageKey,
    showTeamSection: fields.showTeamSection === "on",
    durationMinutes: duration,
    capacity,
    depositPence,
    balancePence,
    published: fields.published === "on",
    updatedAt: now,
  };
  if (!existing) {
    const [created] = await db.insert(workshopProgrammes).values({ ...values, createdAt: now }).returning({ id: workshopProgrammes.id });
    revalidateWorkshops();
    redirect(`/admin/workshops/${created.id}?created=1`);
  }
  await db.update(workshopProgrammes).set(values).where(eq(workshopProgrammes.id, existing.id));
  // Uploaded images (not /public ones) are removed once nothing uses them.
  const oldKey = existing.imageKey;
  if (oldKey && oldKey !== imageKey && !oldKey.startsWith("/")) await deleteUpload(oldKey);
  revalidateWorkshops();
  return { ok: true, message: values.published ? "Saved — the public page is updated." : "Saved. It's hidden until you publish it." };
}

/** Deletes a workshop that has no dates. */
export async function deleteProgramme(id: number): Promise<FormState> {
  await requireAdmin();
  const db = getDb();
  const [dated] = await db.select({ id: workshops.id }).from(workshops).where(eq(workshops.programmeId, id)).limit(1);
  if (dated) return { ok: false, message: "This workshop has dates. Delete or move them first, or just unpublish it." };
  const [row] = await db.delete(workshopProgrammes).where(eq(workshopProgrammes.id, id)).returning();
  if (row?.imageKey && !row.imageKey.startsWith("/")) await deleteUpload(row.imageKey);
  revalidateWorkshops();
  redirect("/admin/workshops");
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
    locationMode: text(formData, "locationMode", 20),
    meetingUrl: text(formData, "meetingUrl", 500),
    capacity: text(formData, "capacity", 5),
    deposit: text(formData, "deposit", 10),
    balance: text(formData, "balance", 10),
    published: formData.get("published") === "on" ? "on" : "",
    notify: formData.get("notify") === "on" ? "on" : "",
    programmeId: text(formData, "programmeId", 10),
  };
  const locationMode = (["jitsi", "custom", "in_person"] as const).find((m) => m === fields.locationMode) ?? "in_person";
  const errors: Record<string, string> = {};
  const startsAt = parseLondonDateTime(fields.startsAt);
  const duration = Number(fields.durationMinutes);
  const capacity = fields.capacity === "" ? null : Number(fields.capacity);
  const depositPence = poundsToPence(fields.deposit);
  const balancePence = poundsToPence(fields.balance);
  const programme = fields.programmeId
    ? (await getDb().select().from(workshopProgrammes).where(eq(workshopProgrammes.id, Number(fields.programmeId))).limit(1))[0]
    : undefined;
  if (!programme) errors.programmeId = "Choose which workshop this date is for.";
  const name = fields.name || programme?.title || "";
  if (!startsAt) errors.startsAt = "Choose a date and time.";
  if (!Number.isInteger(duration) || duration < 15 || duration > 1440) errors.durationMinutes = "Between 15 and 1440 minutes.";
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 500)) errors.capacity = "A whole number, or leave blank for no limit.";
  if (depositPence === null || depositPence < 100) errors.deposit = "At least £1.";
  if (balancePence === null) errors.balance = "Enter an amount (0 for none).";
  if (locationMode === "custom" && !/^https:\/\/\S+$/.test(fields.meetingUrl)) errors.meetingUrl = "Paste the full https:// meeting link.";

  const date = startsAt ? startsAt.toISOString().slice(0, 7) : "";
  const slug = slugify(fields.slug || `${programme?.slug ?? name}-${date}`);
  if (!slug) errors.slug = "Use letters, numbers and dashes.";

  const db = getDb();
  if (slug) {
    const [clash] = await db.select({ id: workshops.id }).from(workshops).where(eq(workshops.slug, slug)).limit(1);
    if (clash && clash.id !== id) errors.slug = "Another workshop already uses this link name.";
  }
  if (Object.keys(errors).length || !programme || !startsAt || depositPence === null || balancePence === null) return { errors, fields };

  const existing = id == null ? undefined : (await db.select().from(workshops).where(eq(workshops.id, id)).limit(1))[0];
  if (id != null && !existing) return { ok: false, message: "Workshop not found." };
  // Keep a run's video room once it has one, so links already sent keep working.
  const meetingUrl =
    locationMode === "jitsi"
      ? existing?.meetingUrl && isJitsiUrl(existing.meetingUrl)
        ? existing.meetingUrl
        : newJitsiUrl()
      : locationMode === "custom"
        ? fields.meetingUrl
        : null;

  const now = new Date();
  const values = {
    programmeId: programme.id,
    name,
    slug,
    startsAt,
    durationMinutes: duration,
    location: fields.location || null,
    locationMode,
    meetingUrl,
    capacity,
    depositPence,
    balancePence,
    published: fields.published === "on",
    updatedAt: now,
  };
  if (id == null || !existing) {
    await db.insert(workshops).values({ ...values, createdAt: now });
    revalidateWorkshops();
    return { ok: true, message: "Date added." };
  }

  // Did anything attendees rely on change? Then calendar invites need updating.
  const moved = existing.startsAt?.getTime() !== startsAt.getTime();
  const detailsChanged =
    moved ||
    existing.durationMinutes !== duration ||
    (existing.location ?? null) !== values.location ||
    workshopJoinUrl(existing) !== workshopJoinUrl(values);
  db.transaction(() => {
    db.update(workshops)
      .set({ ...values, ...(detailsChanged ? { icsSequence: sql`${workshops.icsSequence} + 1` } : {}) })
      .where(eq(workshops.id, id))
      .run();
    // A new time means the reminders are due again.
    if (moved) db.update(signups).set({ reminder24hSentAt: null, reminder1hSentAt: null }).where(eq(signups.workshopId, id)).run();
  });
  revalidateWorkshops();

  const booked = seatHolders(id).length;
  if (detailsChanged && booked > 0 && fields.notify === "on" && startsAt.getTime() > Date.now()) {
    after(() => notifyWorkshopChange(id));
    return { ok: true, message: `Saved. The ${booked} booked ${booked === 1 ? "attendee is" : "attendees are"} being emailed the new details and a calendar update.` };
  }
  return { ok: true, message: "Workshop saved." };
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

/** Gives an existing booking a client-area account and emails them the set-up link. */
export async function onboardSignup(signupId: number): Promise<FormState> {
  await requireAdmin();
  const result = await onboardAttendee(signupId);
  revalidateWorkshops();
  revalidatePath("/admin/clients");
  if (!result.ok) return { ok: false, message: result.reason };
  if (!result.setupUrl) return { ok: true, message: `${result.client.fullName} already has an account — their booking now shows in their client area.` };

  const [row] = await getDb()
    .select({ signup: signups, workshop: workshops })
    .from(signups)
    .innerJoin(workshops, eq(signups.workshopId, workshops.id))
    .where(eq(signups.id, signupId))
    .limit(1);
  const sent = await emailAttendeeInvite({
    to: result.client.email,
    name: result.client.fullName,
    url: result.setupUrl,
    workshopName: row?.workshop.name ?? "Value Selling Workshop",
    startsAt: row?.workshop.startsAt ?? null,
    location: row?.workshop.location ?? null,
  });
  return sent.ok
    ? { ok: true, message: `Invite emailed to ${result.client.email}.` }
    : { ok: false, message: "Email couldn't be sent. Send them this link yourself — it won't be shown again:", link: result.setupUrl };
}
