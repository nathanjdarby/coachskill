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

export type Workshop = typeof workshops.$inferSelect;
export type Signup = typeof signups.$inferSelect;
export type NewSignup = typeof signups.$inferInsert;
