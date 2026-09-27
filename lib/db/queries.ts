import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./index";
import { workshops, signups, users, type Signup } from "./schema";

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

export type SignupListRow = Signup & {
  workshopSlug: string;
  workshopName: string;
  /** Client-area account for this booking: none yet, invited (no password), or active. */
  account: "none" | "invited" | "active";
};

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
      signup: signups,
      workshopSlug: workshops.slug,
      workshopName: workshops.name,
      userId: users.id,
      hasPassword: users.passwordHash,
    })
    .from(signups)
    .innerJoin(workshops, eq(signups.workshopId, workshops.id))
    .leftJoin(users, eq(users.clientId, signups.clientId))
    .where(whereClause)
    .orderBy(desc(signups.createdAt));

  return rows.map((r) => ({
    ...r.signup,
    workshopSlug: r.workshopSlug,
    workshopName: r.workshopName,
    account: r.userId == null ? "none" : r.hasPassword ? "active" : "invited",
  }));
}

export async function getSignupById(id: number) {
  const db = getDb();
  const rows = await db.select().from(signups).where(eq(signups.id, id)).limit(1);
  return rows[0] ?? null;
}
