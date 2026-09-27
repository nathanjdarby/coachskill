import "server-only";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { clients, resources, resourceShares, signups, users, workshops, type Resource } from "@/lib/db/schema";
import { SEAT_STATUSES } from "@/lib/signup-status";

/**
 * SQL condition: the given client can see the resource in `resources.id`.
 * Workshop shares match clients whose email has a paid, seat-holding signup for that run.
 * (Column names are spelled out: drizzle renders them unqualified inside subqueries.)
 */
function visibleTo(clientId: number) {
  return sql`exists (
    select 1 from resource_shares rs
    where rs.resource_id = "resources"."id"
      and (
        rs.scope = 'all_clients'
        or (rs.scope = 'client' and rs.client_id = ${clientId})
        or (rs.scope = 'workshop' and exists (
          select 1 from signups s join clients c on lower(c.email) = lower(s.email)
          where s.workshop_id = rs.workshop_id and c.id = ${clientId}
            and s.deposit_paid_at is not null and s.status in ('pending', 'accepted')
        ))
      )
  )`;
}

export async function listResourcesForClient(clientId: number) {
  return getDb().select().from(resources).where(visibleTo(clientId)).orderBy(desc(resources.createdAt));
}

export async function clientCanAccess(clientId: number, resourceId: number) {
  const [row] = await getDb()
    .select({ id: resources.id })
    .from(resources)
    .where(and(eq(resources.id, resourceId), visibleTo(clientId)))
    .limit(1);
  return Boolean(row);
}

export async function getResource(id: number) {
  const [row] = await getDb().select().from(resources).where(eq(resources.id, id)).limit(1);
  return row ?? null;
}

export type ShareView = { id: number; label: string; matched?: number };
export type ResourceAdminRow = Resource & { shares: ShareView[] };

/** Clients matched to a workshop run by their signup email. */
async function workshopClientIds(workshopId: number) {
  const rows = await getDb()
    .selectDistinct({ id: clients.id })
    .from(signups)
    .innerJoin(clients, sql`lower(${clients.email}) = lower(${signups.email})`)
    .where(
      and(eq(signups.workshopId, workshopId), isNotNull(signups.depositPaidAt), inArray(signups.status, [...SEAT_STATUSES])),
    );
  return rows.map((r) => r.id);
}

export async function listResourcesForAdmin(): Promise<ResourceAdminRow[]> {
  const db = getDb();
  const [items, shares] = await Promise.all([
    db.select().from(resources).orderBy(desc(resources.createdAt)),
    db
      .select({ share: resourceShares, clientName: clients.fullName, workshopName: workshops.name, workshopStartsAt: workshops.startsAt })
      .from(resourceShares)
      .leftJoin(clients, eq(resourceShares.clientId, clients.id))
      .leftJoin(workshops, eq(resourceShares.workshopId, workshops.id)),
  ]);
  const matchedCache = new Map<number, number>();
  const views = await Promise.all(
    shares.map(async ({ share, clientName, workshopName, workshopStartsAt }) => {
      if (share.scope === "all_clients") return { resourceId: share.resourceId, view: { id: share.id, label: "All clients" } };
      if (share.scope === "client") return { resourceId: share.resourceId, view: { id: share.id, label: clientName ?? "A client" } };
      if (!matchedCache.has(share.workshopId!)) matchedCache.set(share.workshopId!, (await workshopClientIds(share.workshopId!)).length);
      const date = workshopStartsAt ? ` (${workshopStartsAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" })})` : "";
      return {
        resourceId: share.resourceId,
        view: { id: share.id, label: `${workshopName ?? "Workshop"}${date} attendees`, matched: matchedCache.get(share.workshopId!) },
      };
    }),
  );
  return items.map((r) => ({ ...r, shares: views.filter((v) => v.resourceId === r.id).map((v) => v.view) }));
}

/** Client accounts that should hear about a new share (only people who can sign in). */
export async function recipientsFor(share: { scope: "client" | "all_clients" | "workshop"; clientId?: number | null; workshopId?: number | null }) {
  const db = getDb();
  let clientIds: number[] | null = null;
  if (share.scope === "client" && share.clientId) clientIds = [share.clientId];
  if (share.scope === "workshop" && share.workshopId) clientIds = await workshopClientIds(share.workshopId);
  if (clientIds && clientIds.length === 0) return [];
  return db
    .select({ email: users.email, name: users.name })
    .from(users)
    .innerJoin(clients, eq(users.clientId, clients.id))
    .where(
      and(
        eq(users.role, "client"),
        isNotNull(users.passwordHash),
        eq(clients.status, "active"),
        clientIds ? inArray(clients.id, clientIds) : undefined,
      ),
    );
}
