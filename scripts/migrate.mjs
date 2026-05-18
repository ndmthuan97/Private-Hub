// scripts/migrate.mjs — Dual-mode migrator
// Mode 1 (local/CI): node scripts/migrate.mjs         → dùng DATABASE_SESSION_URL
// Mode 2 (via app):  node scripts/migrate.mjs --api   → gọi /api/migrate endpoint
import postgres from "postgres";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// Load .env manually
const envFile = path.join(ROOT, ".env");
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, "utf-8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .forEach((l) => {
      const eqIdx = l.indexOf("=");
      const key = l.slice(0, eqIdx).trim();
      const val = l.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    });
}

const MODE = process.argv.includes("--api") ? "api" : "direct";
const MIGRATIONS_DIR = path.join(ROOT, "drizzle");

// ─── Mode 1: Direct DB connection ─────────────────────────────
async function runDirect() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("❌ DATABASE_URL missing in .env"); process.exit(1); }

  console.log("🚀 Connecting via session pooler...");
  const sql = postgres(url, { max: 1, ssl: "prefer", connect_timeout: 20 });

  try {
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.drizzle_migrations (
        id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE,
        hash TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const rows = await sql`SELECT name FROM public.drizzle_migrations ORDER BY id`;
    const appliedSet = new Set(rows.map((r) => r.name));

    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
    let count = 0;
    for (const file of files) {
      if (appliedSet.has(file)) { console.log(`  ⏭  ${file}`); continue; }
      const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
      console.log(`  ▶  ${file}`);
      await sql.unsafe(content);
      await sql`INSERT INTO public.drizzle_migrations ${sql({ name: file, hash })}`;
      console.log(`  ✅ ${file}`);
      count++;
    }
    console.log(count === 0 ? "\n✅ Already up to date" : `\n✅ Applied ${count} migration(s)`);
  } finally {
    await sql.end();
  }
}

// ─── Mode 2: Via /api/migrate endpoint (works from Vercel) ────
async function runViaApi() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const secret  = process.env.CRON_SECRET;
  if (!secret) { console.error("❌ CRON_SECRET missing in .env"); process.exit(1); }

  const url = `${baseUrl}/api/migrate?secret=${encodeURIComponent(secret)}`;
  console.log(`🚀 Calling ${baseUrl}/api/migrate ...`);

  const res = await fetch(url);
  const json = await res.json();

  if (json.statusCode === 200) {
    const { applied, skipped } = json.data;
    if (skipped?.length) console.log(`  ⏭  Skipped: ${skipped.join(", ")}`);
    applied?.forEach((f) => console.log(`  ✅ ${f}`));
    console.log(`\n✅ ${json.message}`);
  } else {
    console.error("❌", json.message, json.errors);
    process.exit(1);
  }
}

const runner = MODE === "api" ? runViaApi : runDirect;
runner().catch((err) => {
  console.error("❌", err.message ?? err);
  process.exit(1);
});
