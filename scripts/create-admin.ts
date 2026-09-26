/**
 * Creates an admin account (or re-issues a set-password link for an existing
 * admin) and prints a one-time link to choose a password.
 *
 *   npm run admin:create -- you@example.com "Your Name"
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { and, eq, isNull } from "drizzle-orm";
import path from "path";
import { passwordTokens, users } from "../lib/db/schema";
import { INVITE_TTL_MS, newToken } from "../lib/tokens";

const [emailArg, ...nameParts] = process.argv.slice(2);
const email = emailArg?.trim().toLowerCase();
const name = nameParts.join(" ").trim();

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run admin:create -- <email> "<name>"');
  process.exit(1);
}

const dbPath = process.env.SQLITE_PATH?.trim()
  ? path.resolve(process.cwd(), process.env.SQLITE_PATH)
  : path.join(process.cwd(), "data", "app.db");
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

const now = new Date();
let [user] = db.select().from(users).where(eq(users.email, email)).limit(1).all();

if (user && user.role !== "admin") {
  console.error(`${email} is a client account. Use a different email for the admin account.`);
  process.exit(1);
}
if (!user) {
  if (!name) {
    console.error('A name is needed for a new admin: npm run admin:create -- <email> "<name>"');
    process.exit(1);
  }
  [user] = db
    .insert(users)
    .values({ email, name, role: "admin", createdAt: now, updatedAt: now })
    .returning()
    .all();
  console.log(`Created admin account for ${name} <${email}>.`);
} else {
  console.log(`${email} is already an admin — issuing a new set-password link.`);
}

db.update(passwordTokens)
  .set({ usedAt: now })
  .where(and(eq(passwordTokens.userId, user.id), isNull(passwordTokens.usedAt)))
  .run();
const { token, tokenHash } = newToken();
db.insert(passwordTokens)
  .values({
    userId: user.id,
    tokenHash,
    purpose: "invite",
    expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
    createdAt: now,
  })
  .run();
sqlite.close();

const base = (process.env.NEXT_PUBLIC_BASE_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
console.log(`\nSet-password link (single use, expires in 7 days):\n${base}/set-password/${token}\n`);
