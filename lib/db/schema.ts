import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const workshops = sqliteTable("workshops", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  stripePriceId: text("stripe_price_id"),
  stripeProductId: text("stripe_product_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const signups = sqliteTable(
  "signups",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workshopId: integer("workshop_id")
      .notNull()
      .references(() => workshops.id),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    company: text("company"),
    metadataJson: text("metadata_json"),
    source: text("source", {
      enum: ["n8n", "stripe", "manual"],
    }).notNull(),
    externalId: text("external_id"),
    status: text("status", {
      enum: ["pending", "accepted", "on_hold", "declined"],
    })
      .notNull()
      .default("pending"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => ({
    sourceExternalUnique: uniqueIndex("signups_source_external_idx").on(
      t.source,
      t.externalId,
    ),
  }),
);

export const discoveryCalls = sqliteTable("discovery_calls", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  persona: text("persona", {
    enum: ["professional", "business_owner", "corporate"],
  }).notNull(),
  goal: text("goal").notNull(),
  challenges: text("challenges").notNull(),
  anythingElse: text("anything_else"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type Workshop = typeof workshops.$inferSelect;
export type Signup = typeof signups.$inferSelect;
export type NewSignup = typeof signups.$inferInsert;
export type DiscoveryCall = typeof discoveryCalls.$inferSelect;

// — Client portal —

export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  company: text("company"),
  status: text("status", { enum: ["active", "paused", "completed"] })
    .notNull()
    .default("active"),
  discoveryCallId: integer("discovery_call_id")
    .unique()
    .references(() => discoveryCalls.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "client"] }).notNull(),
  /** Null until the person sets a password from their invite link. */
  passwordHash: text("password_hash"),
  /** Bumped on password change to sign out existing sessions. */
  sessionVersion: integer("session_version").notNull().default(0),
  clientId: integer("client_id")
    .unique()
    .references(() => clients.id),
  lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/** Single-use links for setting a password (account invites and resets). Only the hash is stored. */
export const passwordTokens = sqliteTable("password_tokens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  purpose: text("purpose", { enum: ["invite", "reset"] }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** Coach notes on a client. Shared notes appear as updates in the client's portal. */
export const clientNotes = sqliteTable("client_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  shared: integer("shared", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const coachingSessions = sqliteTable("coaching_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  title: text("title").notNull(),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  meetingUrl: text("meeting_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  senderId: integer("sender_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  /** When the other side (coach or client) first saw it. */
  readAt: integer("read_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type Client = typeof clients.$inferSelect;
export type User = typeof users.$inferSelect;
export type ClientNote = typeof clientNotes.$inferSelect;
export type CoachingSession = typeof coachingSessions.$inferSelect;
export type Message = typeof messages.$inferSelect;
