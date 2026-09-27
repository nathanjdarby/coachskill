import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clientNotes,
  clients,
  coachingSessions,
  discoveryCalls,
  messages,
  users,
  type Client,
  type User,
} from "@/lib/db/schema";

export type PortalAccess = "none" | "invited" | "active";

export function portalAccess(user: Pick<User, "passwordHash"> | null | undefined): PortalAccess {
  if (!user) return "none";
  return user.passwordHash ? "active" : "invited";
}

/** Messages sent by the other side that the reader hasn't seen. */
function unreadFor(reader: "admin" | "client") {
  const otherRole = reader === "admin" ? "client" : "admin";
  return and(
    isNull(messages.readAt),
    inArray(
      messages.senderId,
      getDb().select({ id: users.id }).from(users).where(eq(users.role, otherRole)),
    ),
  );
}

// — Admin —

export async function listClientsOverview() {
  const db = getDb();
  const [clientRows, userRows, unreadRows, upcoming] = await Promise.all([
    db.select().from(clients).orderBy(desc(clients.updatedAt)),
    db.select().from(users).where(eq(users.role, "client")),
    db
      .select({ clientId: messages.clientId, count: sql<number>`count(*)` })
      .from(messages)
      .where(unreadFor("admin"))
      .groupBy(messages.clientId),
    db
      .select()
      .from(coachingSessions)
      .where(and(gte(coachingSessions.startsAt, new Date()), isNull(coachingSessions.cancelledAt)))
      .orderBy(asc(coachingSessions.startsAt)),
  ]);

  return clientRows.map((c) => {
    const user = userRows.find((u) => u.clientId === c.id);
    return {
      client: c,
      access: portalAccess(user),
      lastLoginAt: user?.lastLoginAt ?? null,
      unread: unreadRows.find((r) => r.clientId === c.id)?.count ?? 0,
      nextSession: upcoming.find((s) => s.clientId === c.id) ?? null,
    };
  });
}

export async function adminDashboardCounts() {
  const db = getDb();
  const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [[active], [unread], [sessions], [newRequests]] = await Promise.all([
    db.select({ n: sql<number>`count(*)` }).from(clients).where(eq(clients.status, "active")),
    db.select({ n: sql<number>`count(*)` }).from(messages).where(unreadFor("admin")),
    db
      .select({ n: sql<number>`count(*)` })
      .from(coachingSessions)
      .where(
        and(
          gte(coachingSessions.startsAt, new Date()),
          sql`${coachingSessions.startsAt} <= ${weekAhead.getTime()}`,
          isNull(coachingSessions.cancelledAt),
        ),
      ),
    db
      .select({ n: sql<number>`count(*)` })
      .from(discoveryCalls)
      .leftJoin(clients, eq(clients.discoveryCallId, discoveryCalls.id))
      .where(isNull(clients.id)),
  ]);
  return {
    activeClients: active.n,
    unreadMessages: unread.n,
    sessionsThisWeek: sessions.n,
    newDiscoveryRequests: newRequests.n,
  };
}

export async function listDiscoveryCallsWithClients() {
  return getDb()
    .select({ call: discoveryCalls, clientId: clients.id })
    .from(discoveryCalls)
    .leftJoin(clients, eq(clients.discoveryCallId, discoveryCalls.id))
    .orderBy(desc(discoveryCalls.createdAt));
}

export async function getClientDetail(clientId: number) {
  const db = getDb();
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) return null;

  const [[user], discovery, notes, sessions, thread] = await Promise.all([
    db.select().from(users).where(eq(users.clientId, clientId)).limit(1),
    client.discoveryCallId
      ? db.select().from(discoveryCalls).where(eq(discoveryCalls.id, client.discoveryCallId)).limit(1)
      : Promise.resolve([]),
    db
      .select({ note: clientNotes, authorName: users.name })
      .from(clientNotes)
      .innerJoin(users, eq(clientNotes.authorId, users.id))
      .where(eq(clientNotes.clientId, clientId))
      .orderBy(desc(clientNotes.createdAt)),
    listSessions(clientId, { includeCancelled: true }),
    listMessages(clientId),
  ]);

  return {
    client,
    user: user ?? null,
    access: portalAccess(user),
    discovery: discovery[0] ?? null,
    notes,
    sessions,
    messages: thread,
  };
}

export async function adminEmails() {
  const rows = await getDb()
    .select({ email: users.email })
    .from(users)
    .where(and(eq(users.role, "admin"), sql`${users.passwordHash} IS NOT NULL`));
  return rows.map((r) => r.email);
}

// — Shared —

/** A client's sessions, newest first. Cancelled ones are left out unless asked for. */
export async function listSessions(clientId: number, { includeCancelled = false } = {}) {
  return getDb()
    .select()
    .from(coachingSessions)
    .where(
      includeCancelled
        ? eq(coachingSessions.clientId, clientId)
        : and(eq(coachingSessions.clientId, clientId), isNull(coachingSessions.cancelledAt)),
    )
    .orderBy(desc(coachingSessions.startsAt));
}

export function splitSessions<T extends { startsAt: Date; durationMinutes: number }>(sessions: T[]) {
  const now = Date.now();
  const isOver = (s: T) => s.startsAt.getTime() + s.durationMinutes * 60_000 < now;
  return {
    upcoming: sessions.filter((s) => !isOver(s)).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    past: sessions.filter(isOver),
  };
}

export async function listMessages(clientId: number) {
  return getDb()
    .select({ message: messages, senderName: users.name, senderRole: users.role })
    .from(messages)
    .innerJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.clientId, clientId))
    .orderBy(asc(messages.createdAt));
}

export async function markMessagesRead(clientId: number, reader: "admin" | "client") {
  await getDb()
    .update(messages)
    .set({ readAt: new Date() })
    .where(and(eq(messages.clientId, clientId), unreadFor(reader)));
}

/** True when the sender already has an unread message waiting — used to avoid an email per message. */
export async function hasEarlierUnread(clientId: number, sender: "admin" | "client", excludeId: number) {
  const reader = sender === "admin" ? "client" : "admin";
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)` })
    .from(messages)
    .where(and(eq(messages.clientId, clientId), unreadFor(reader), sql`${messages.id} <> ${excludeId}`));
  return row.n > 0;
}

// — Client portal —

export async function getPortalData(clientId: number) {
  const db = getDb();
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) return null;
  const [discovery, updates, sessions, [unread]] = await Promise.all([
    client.discoveryCallId
      ? db.select().from(discoveryCalls).where(eq(discoveryCalls.id, client.discoveryCallId)).limit(1)
      : Promise.resolve([]),
    db
      .select({ note: clientNotes, authorName: users.name })
      .from(clientNotes)
      .innerJoin(users, eq(clientNotes.authorId, users.id))
      .where(and(eq(clientNotes.clientId, clientId), eq(clientNotes.shared, true)))
      .orderBy(desc(clientNotes.createdAt)),
    listSessions(clientId),
    db
      .select({ n: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.clientId, clientId), unreadFor("client"))),
  ]);
  return {
    client: client as Client,
    discovery: discovery[0] ?? null,
    updates,
    sessions,
    unreadMessages: unread.n,
  };
}

export async function unreadCountForClient(clientId: number) {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)` })
    .from(messages)
    .where(and(eq(messages.clientId, clientId), unreadFor("client")));
  return row.n;
}
