import { defineConfig } from "drizzle-kit";
import path from "path";

const dbPath = process.env.SQLITE_PATH?.trim()
  ? path.isAbsolute(process.env.SQLITE_PATH)
    ? process.env.SQLITE_PATH
    : path.join(process.cwd(), process.env.SQLITE_PATH)
  : path.join(process.cwd(), "data", "app.db");

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: `file:${dbPath}`,
  },
});
