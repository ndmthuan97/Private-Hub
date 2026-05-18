// db/index.ts — Drizzle client singleton (lazy init, safe for Next.js)
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set in environment variables");

  // postgres-js client — connection pooling disabled for serverless (Vercel)
  const client = postgres(url, { prepare: false, max: 1 });
  _db = drizzle(client, { schema });
  return _db;
}

// Re-export schema types for convenience
export * from "./schema";
