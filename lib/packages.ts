import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clientPackages, packages, type ClientPackage } from "@/lib/db/schema";

export async function listPackages({ activeOnly = false } = {}) {
  const db = getDb();
  const q = db.select().from(packages);
  return (activeOnly ? q.where(eq(packages.active, true)) : q).orderBy(asc(packages.sortOrder), asc(packages.pricePence));
}

export async function getPackage(id: number) {
  const [row] = await getDb().select().from(packages).where(eq(packages.id, id)).limit(1);
  return row ?? null;
}

/** How many times each package has been bought (paid), to protect them from deletion. */
export async function purchaseCounts() {
  const rows = await getDb()
    .select({ packageId: clientPackages.packageId, n: sql<number>`count(*)` })
    .from(clientPackages)
    .where(eq(clientPackages.status, "paid"))
    .groupBy(clientPackages.packageId);
  return new Map(rows.map((r) => [r.packageId, r.n]));
}

export type PackageBalance = ClientPackage & { used: number; remaining: number };

/** A client's paid packages, newest first, with sessions used and remaining. */
export async function packageBalances(clientId: number): Promise<PackageBalance[]> {
  const db = getDb();
  const rows = await db
    .select({
      pkg: clientPackages,
      // Spelled out: drizzle renders columns unqualified inside a subquery, which would match the wrong "id".
      used: sql<number>`(select count(*) from coaching_sessions cs where cs.client_package_id = "client_packages"."id" and cs.cancelled_at is null)`,
    })
    .from(clientPackages)
    .where(and(eq(clientPackages.clientId, clientId), eq(clientPackages.status, "paid")))
    .orderBy(desc(clientPackages.paidAt));
  return rows.map(({ pkg, used }) => ({ ...pkg, used, remaining: Math.max(0, pkg.sessionCount - used) }));
}

/** The package the next session should come from: the oldest paid one with sessions left. */
export function activeCredit(balances: PackageBalance[]) {
  return [...balances].reverse().find((b) => b.remaining > 0) ?? null;
}
