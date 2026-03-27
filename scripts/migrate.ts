import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../lib/db/schema";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = process.env.SQLITE_PATH?.trim()
  ? path.isAbsolute(process.env.SQLITE_PATH)
    ? process.env.SQLITE_PATH
    : path.join(process.cwd(), process.env.SQLITE_PATH)
  : path.join(process.cwd(), "data", "app.db");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
sqlite.close();
console.log("Migrations complete:", dbPath);
