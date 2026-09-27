import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** One row per dated workshop run (the slug is per run). */
export const workshops = sqliteTable("workshops", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  stripePriceId: text("stripe_price_id"),
  stripeProductId: text("stripe_product_id"),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }),
  durationMinutes: integer("duration_minutes").notNull().default(150),
  location: text("location"),
  /** Null means no seat limit. */
  capacity: integer("capacity"),
  depositPence: integer("deposit_pence").notNull().default(2500),
  balancePence: integer("balance_pence").notNull().default(37400),
  /** Only published runs are offered on the public workshop page. */
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
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
    depositPaidAt: integer("deposit_paid_at", { mode: "timestamp_ms" }),
    /** Running total paid via Stripe or recorded by the admin, in pence. */
    amountPaidPence: integer("amount_paid_pence").notNull().default(0),
    /** Set when the deposit confirmation email has been sent. */
    confirmationSentAt: integer("confirmation_sent_at", { mode: "timestamp_ms" }),
    balanceRequestSentAt: integer("balance_request_sent_at", { mode: "timestamp_ms" }),
    balanceReminderSentAt: integer("balance_reminder_sent_at", { mode: "timestamp_ms" }),
    balanceCheckoutSessionId: text("balance_checkout_session_id"),
    balancePaidAt: integer("balance_paid_at", { mode: "timestamp_ms" }),
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

/** Stripe event ids already processed, so webhook retries are ignored. */
export const stripeEvents = sqliteTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: integer("received_at", { mode: "timestamp_ms" }).notNull(),
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

/** Coaching packages Monika sells (e.g. a 3-session intensive). */
export const packages = sqliteTable("packages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  pricePence: integer("price_pence").notNull(),
  sessionCount: integer("session_count").notNull(),
  sessionMinutes: integer("session_minutes").notNull().default(60),
  /** Inactive packages can't be bought but stay on past purchases. */
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/** A package bought by (or recorded for) a client. Name/price/sessions are copied at purchase. */
export const clientPackages = sqliteTable("client_packages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  packageId: integer("package_id")
    .notNull()
    .references(() => packages.id),
  name: text("name").notNull(),
  pricePence: integer("price_pence").notNull(),
  sessionCount: integer("session_count").notNull(),
  sessionMinutes: integer("session_minutes").notNull(),
  status: text("status", { enum: ["pending", "paid", "cancelled"] }).notNull().default("pending"),
  source: text("source", { enum: ["stripe", "manual"] }).notNull(),
  stripeSessionId: text("stripe_session_id").unique(),
  paidAt: integer("paid_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const coachingSessions = sqliteTable("coaching_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id")
    .notNull()
    .references(() => clients.id),
  /** The package this session uses a credit from, if any. */
  clientPackageId: integer("client_package_id").references(() => clientPackages.id),
  title: text("title").notNull(),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  meetingUrl: text("meeting_url"),
  bookedBy: text("booked_by", { enum: ["admin", "client"] }).notNull().default("admin"),
  /** Cancelled sessions stay for the record but free the slot and the package credit. */
  cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
  cancelledBy: text("cancelled_by", { enum: ["admin", "client"] }),
  reminder24hSentAt: integer("reminder_24h_sent_at", { mode: "timestamp_ms" }),
  reminder1hSentAt: integer("reminder_1h_sent_at", { mode: "timestamp_ms" }),
  /** Bumped on every change so calendar apps update the existing event. */
  icsSequence: integer("ics_sequence").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

/** Weekly bookable hours (London time), e.g. Monday 09:00–17:00. */
export const availabilityRules = sqliteTable("availability_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** 0 = Sunday … 6 = Saturday. */
  weekday: integer("weekday").notNull(),
  startMinute: integer("start_minute").notNull(),
  endMinute: integer("end_minute").notNull(),
});

/** Time off or one-off busy periods that can't be booked. */
export const availabilityBlocks = sqliteTable("availability_blocks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
  endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
  reason: text("reason"),
});

/** Single row (id = 1) of booking rules. */
export const bookingSettings = sqliteTable("booking_settings", {
  id: integer("id").primaryKey(),
  bufferMinutes: integer("buffer_minutes").notNull().default(15),
  minNoticeHours: integer("min_notice_hours").notNull().default(24),
  maxAdvanceDays: integer("max_advance_days").notNull().default(42),
  slotStepMinutes: integer("slot_step_minutes").notNull().default(30),
  cancelCutoffHours: integer("cancel_cutoff_hours").notNull().default(24),
  defaultMeetingUrl: text("default_meeting_url"),
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

/** A file (stored on disk) or link Monika shares with clients. */
export const resources = sqliteTable("resources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  kind: text("kind", { enum: ["file", "link"] }).notNull(),
  /** Random file name under UPLOADS_DIR; never the uploaded name. */
  storageKey: text("storage_key").unique(),
  originalName: text("original_name"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  url: text("url"),
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/** Who can see a resource: one client, every client, or a workshop run's attendees. */
export const resourceShares = sqliteTable("resource_shares", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  resourceId: integer("resource_id")
    .notNull()
    .references(() => resources.id, { onDelete: "cascade" }),
  scope: text("scope", { enum: ["client", "all_clients", "workshop"] }).notNull(),
  clientId: integer("client_id").references(() => clients.id),
  workshopId: integer("workshop_id").references(() => workshops.id),
});

export type Client = typeof clients.$inferSelect;
export type User = typeof users.$inferSelect;
export type ClientNote = typeof clientNotes.$inferSelect;
export type CoachingSession = typeof coachingSessions.$inferSelect;
export type Message = typeof messages.$inferSelect;

export type Package = typeof packages.$inferSelect;
export type ClientPackage = typeof clientPackages.$inferSelect;
export type BookingSettings = typeof bookingSettings.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type ResourceShare = typeof resourceShares.$inferSelect;
