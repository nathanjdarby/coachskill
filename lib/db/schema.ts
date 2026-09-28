import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
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
  /** Online with an automatic video room, online with Monika's own link, or in person (location text only). */
  locationMode: text("location_mode", { enum: ["jitsi", "custom", "in_person"] }).notNull().default("in_person"),
  meetingUrl: text("meeting_url"),
  /** Bumped when the time or joining details change, so calendar invites update. */
  icsSequence: integer("ics_sequence").notNull().default(0),
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
    /** The client-area account this booking belongs to (set when the attendee is onboarded). */
    clientId: integer("client_id"),
    reminder24hSentAt: integer("reminder_24h_sent_at", { mode: "timestamp_ms" }),
    reminder1hSentAt: integer("reminder_1h_sent_at", { mode: "timestamp_ms" }),
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
  /** Optional, for people who'd rather have a phone call. */
  phone: text("phone"),
  /** Enquiry form answers (see lib/discovery.ts). `interests` is values joined with "|". */
  interests: text("interests"),
  audience: text("audience"),
  teamSize: text("team_size"),
  support: text("support"),
  startTimeline: text("start_timeline"),
  anythingElse: text("anything_else"),
  /** From the earlier version of the form; empty for newer enquiries. */
  persona: text("persona", {
    enum: ["professional", "business_owner", "corporate"],
  }),
  goal: text("goal"),
  challenges: text("challenges"),
  /** Set when the admin decides not to take this request forward. */
  declinedAt: integer("declined_at", { mode: "timestamp_ms" }),
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
  /** Coaching clients vs people who came in through a workshop booking. */
  kind: text("kind", { enum: ["client", "attendee"] }).notNull().default("client"),
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
  /** The session a recap came from (a plain id, so sessions can be removed freely). */
  sessionId: integer("session_id"),
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

/** Kinds of appointment Monika offers (like Calendly event types). */
export const eventTypes = sqliteTable("event_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  /** Null means "use the client's package session length" (or 60). */
  durationMinutes: integer("duration_minutes"),
  /** Null means use the global gap between sessions. */
  bufferMinutes: integer("buffer_minutes"),
  audience: text("audience", { enum: ["clients_with_credits", "invite_only", "admin_only"] }).notNull(),
  locationMode: text("location_mode", { enum: ["jitsi", "custom", "in_person"] }).notNull().default("jitsi"),
  customUrl: text("custom_url"),
  colour: text("colour").notNull().default("#22d3ee"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * Every appointment: 1:1 sessions, discovery calls and any other event type.
 * Prospects without a client account are identified by invitee name/email.
 */
export const coachingSessions = sqliteTable("coaching_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").references(() => clients.id),
  eventTypeId: integer("event_type_id").references(() => eventTypes.id),
  discoveryCallId: integer("discovery_call_id").references(() => discoveryCalls.id),
  inviteeName: text("invitee_name"),
  inviteeEmail: text("invitee_email"),
  /** jitsi/custom: video link in meetingUrl; phone: Monika rings inviteePhone; in_person: locationText. */
  locationMode: text("location_mode", { enum: ["jitsi", "custom", "in_person", "phone"] }).notNull().default("custom"),
  locationText: text("location_text"),
  /** The number Monika rings for a phone call. */
  inviteePhone: text("invitee_phone"),
  /** Random secret signed into a prospect's manage link (/appointments/<token>); replacing it revokes old links. */
  manageTokenHash: text("manage_token_hash").unique(),
  /** Monika's private notes. */
  notes: text("notes"),
  /** Recap for the client or prospect, sent in the follow-up email. */
  recap: text("recap"),
  /** Who last edited the recap (shown as the author of the shared update). */
  recapById: integer("recap_by_id"),
  followUpEnabled: integer("follow_up_enabled", { mode: "boolean" }).notNull().default(true),
  followUpSentAt: integer("follow_up_sent_at", { mode: "timestamp_ms" }),
  /** Set when Monika was emailed that the guest is waiting in the in-app room. */
  waitingAlertSentAt: integer("waiting_alert_sent_at", { mode: "timestamp_ms" }),
  /** The package this session uses a credit from, if any. */
  clientPackageId: integer("client_package_id").references(() => clientPackages.id),
  title: text("title").notNull(),
  startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  meetingUrl: text("meeting_url"),
  bookedBy: text("booked_by", { enum: ["admin", "client", "invitee"] }).notNull().default("admin"),
  /** Cancelled sessions stay for the record but free the slot and the package credit. */
  cancelledAt: integer("cancelled_at", { mode: "timestamp_ms" }),
  cancelledBy: text("cancelled_by", { enum: ["admin", "client", "invitee"] }),
  reminder24hSentAt: integer("reminder_24h_sent_at", { mode: "timestamp_ms" }),
  reminder1hSentAt: integer("reminder_1h_sent_at", { mode: "timestamp_ms" }),
  /** Bumped on every change so calendar apps update the existing event. */
  icsSequence: integer("ics_sequence").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }),
});

/** Single-use links Monika sends a prospect so they can pick a time for a call (/book/<token>). */
export const bookingLinks = sqliteTable("booking_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Random secret signed into the link; see lib/signed-links.ts. */
  secret: text("secret").notNull(),
  eventTypeId: integer("event_type_id")
    .notNull()
    .references(() => eventTypes.id),
  discoveryCallId: integer("discovery_call_id").references(() => discoveryCalls.id),
  inviteeName: text("invitee_name").notNull(),
  inviteeEmail: text("invitee_email").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  usedAt: integer("used_at", { mode: "timestamp_ms" }),
  appointmentId: integer("appointment_id").references(() => coachingSessions.id),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/**
 * Who joined an in-app (JaaS) call and for how long. One row per browser tab that
 * joined; `last_seen_at` is refreshed by a heartbeat so crashed tabs still count.
 * Plain ids (no foreign keys) so appointments and signups can be removed freely.
 */
export const meetingAttendance = sqliteTable(
  "meeting_attendance",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    appointmentId: integer("appointment_id"),
    workshopId: integer("workshop_id"),
    signupId: integer("signup_id"),
    role: text("role", { enum: ["host", "guest"] }).notNull(),
    name: text("name").notNull(),
    /** Random per page load, so repeat reports from the same tab update one row. */
    sessionKey: text("session_key").notNull().unique(),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
    leftAt: integer("left_at", { mode: "timestamp_ms" }),
  },
  (t) => [index("meeting_attendance_appointment_idx").on(t.appointmentId), index("meeting_attendance_workshop_idx").on(t.workshopId)],
);

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
  /** Secret in Monika's calendar feed URL (/api/calendar/<token>). Kept readable so the link can be copied again. */
  feedToken: text("feed_token"),
});

/** Monika's own calendars (private iCal addresses); their busy times block booking slots. */
export const calendarSources = sqliteTable("calendar_sources", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
  /** Secret address; never shown in full after it's saved. */
  url: text("url").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  /** Whether all-day events (holidays, days off) block the whole day. */
  blockAllDay: integer("block_all_day", { mode: "boolean" }).notNull().default(true),
  lastFetchedAt: integer("last_fetched_at", { mode: "timestamp_ms" }),
  lastSuccessAt: integer("last_success_at", { mode: "timestamp_ms" }),
  lastError: text("last_error"),
  busyCount: integer("busy_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

/** Busy times read from a calendar source. Only times are kept, never event titles. */
export const externalBusy = sqliteTable(
  "external_busy",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sourceId: integer("source_id")
      .notNull()
      .references(() => calendarSources.id),
    startsAt: integer("starts_at", { mode: "timestamp_ms" }).notNull(),
    endsAt: integer("ends_at", { mode: "timestamp_ms" }).notNull(),
    allDay: integer("all_day", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("external_busy_source_idx").on(t.sourceId), index("external_busy_starts_idx").on(t.startsAt)],
);

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
export type EventType = typeof eventTypes.$inferSelect;
/** Sessions, discovery calls and other bookings all live in coaching_sessions. */
export type Appointment = CoachingSession;
export type BookingLink = typeof bookingLinks.$inferSelect;
export type CalendarSource = typeof calendarSources.$inferSelect;
export type MeetingAttendance = typeof meetingAttendance.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type ResourceShare = typeof resourceShares.$inferSelect;
