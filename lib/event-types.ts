import "server-only";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { eventTypes, type EventType } from "@/lib/db/schema";

/** Built-in types, seeded by migrations 0009 and 0014. */
export const COACHING_SLUG = "coaching-1-1";
export const DISCOVERY_SLUG = "discovery-call";
/** "Start a call now" (seeded by migration 0014). */
export const QUICK_CALL_SLUG = "quick-call";
/** Types the site relies on: they can be edited but not deleted or switched off. */
export const BUILT_IN_SLUGS: string[] = [COACHING_SLUG, DISCOVERY_SLUG, QUICK_CALL_SLUG];

export function listEventTypes({ activeOnly = false } = {}): EventType[] {
  const q = getDb().select().from(eventTypes);
  return (activeOnly ? q.where(eq(eventTypes.active, true)) : q).orderBy(asc(eventTypes.sortOrder), asc(eventTypes.name)).all();
}

export function getEventTypeBySlug(slug: string): EventType | null {
  return getDb().select().from(eventTypes).where(eq(eventTypes.slug, slug)).get() ?? null;
}

export function getEventType(id: number): EventType | null {
  return getDb().select().from(eventTypes).where(eq(eventTypes.id, id)).get() ?? null;
}

/** Session length for a type: its own duration, else the package's, else an hour. */
export function durationFor(type: EventType | null, packageMinutes?: number | null) {
  return type?.durationMinutes ?? packageMinutes ?? 60;
}
