import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { workshops } from "../lib/db/schema";

const dbPath = process.env.SQLITE_PATH?.trim()
  ? path.isAbsolute(process.env.SQLITE_PATH)
    ? process.env.SQLITE_PATH
    : path.join(process.cwd(), process.env.SQLITE_PATH)
  : path.join(process.cwd(), "data", "app.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema: { workshops } });

const now = new Date();
const stripePrice = process.env.STRIPE_PRICE_ID?.trim() || null;
const stripeProduct = process.env.STRIPE_PRODUCT_ID?.trim() || null;

async function main() {
  await db
    .insert(workshops)
    .values({
      slug: "value-selling",
      name: "Value Selling Workshop",
      stripePriceId: stripePrice,
      stripeProductId: stripeProduct,
      createdAt: now,
    })
    .onConflictDoNothing({ target: workshops.slug });

  sqlite.close();
  console.log("Seed complete: workshop value-selling");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
