import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./index";
import { workshops, signups, type Signup } from "./schema";

export async function getWorkshopBySlug(slug: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(workshops)
    .where(eq(workshops.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function getDefaultWorkshop() {
  const db = getDb();
  const rows = await db
    .select()
    .from(workshops)
    .where(eq(workshops.slug, "value-selling"))
    .limit(1);
  return rows[0] ?? null;
}

export async function listWorkshops() {
  const db = getDb();
  return db.select().from(workshops).orderBy(workshops.name);
}

export type SignupListRow = Signup & { workshopSlug: string; workshopName: string };

export async function listSignupsWithWorkshop(filters: {
  workshopId?: number;
  status?: string;
}): Promise<SignupListRow[]> {
  const db = getDb();
  const conditions = [];
  if (filters.workshopId !== undefined) {
    conditions.push(eq(signups.workshopId, filters.workshopId));
  }
  if (filters.status) {
    conditions.push(eq(signups.status, filters.status as Signup["status"]));
  }
  const whereClause =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const rows = await db
    .select({
      id: signups.id,
      workshopId: signups.workshopId,
      name: signups.name,
      email: signups.email,
      phone: signups.phone,
      company: signups.company,
      metadataJson: signups.metadataJson,
      source: signups.source,
      externalId: signups.externalId,
      status: signups.status,
      notes: signups.notes,
      createdAt: signups.createdAt,
      updatedAt: signups.updatedAt,
      workshopSlug: workshops.slug,
      workshopName: workshops.name,
    })
    .from(signups)
    .innerJoin(workshops, eq(signups.workshopId, workshops.id))
    .where(whereClause)
    .orderBy(desc(signups.createdAt));

  return rows.map((r) => ({
    id: r.id,
    workshopId: r.workshopId,
    name: r.name,
    email: r.email,
    phone: r.phone,
    company: r.company,
    metadataJson: r.metadataJson,
    source: r.source,
    externalId: r.externalId,
    status: r.status,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    workshopSlug: r.workshopSlug,
    workshopName: r.workshopName,
  }));
}

export async function getSignupById(id: number) {
  const db = getDb();
  const rows = await db.select().from(signups).where(eq(signups.id, id)).limit(1);
  return rows[0] ?? null;
}
