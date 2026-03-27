import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const globalForDb = globalThis as unknown as {
  sqlite: Database.Database | undefined;
  drizzle: ReturnType<typeof drizzle<typeof schema>> | undefined;
};

function resolveDbPath(): string {
  const raw = process.env.SQLITE_PATH?.trim();
  if (raw) {
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
  }
  return path.join(process.cwd(), "data", "app.db");
}

export function getSqlite(): Database.Database {
  if (globalForDb.sqlite) return globalForDb.sqlite;
  const dbPath = resolveDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  globalForDb.sqlite = sqlite;
  return sqlite;
}

export function getDb() {
  if (globalForDb.drizzle) return globalForDb.drizzle;
  const sqlite = getSqlite();
  const db = drizzle(sqlite, { schema });
  globalForDb.drizzle = db;
  return db;
}

export * from "./schema";
