// scripts/fix-migration.mjs — Mark old migrations as applied, run 0004
import postgres from "postgres";
import fs from "fs";
import path from "path";
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

const url = process.env.DATABASE_URL;
if (!url) { console.error("❌ DATABASE_URL missing"); process.exit(1); }

const sql = postgres(url, { max: 1, ssl: "prefer", connect_timeout: 20 });

try {
  // Mark previously broken migrations as applied (they either already ran or are no-ops)
  const toMark = ["0002_bored_strong_guy.sql", "0003_gifted_meltdown.sql"];
  for (const name of toMark) {
    await sql`INSERT INTO public.drizzle_migrations (name, hash) VALUES (${name}, 'manual-skip') ON CONFLICT (name) DO NOTHING`;
    console.log(`  ⏭  Marked as applied: ${name}`);
  }

  // Check if 0004 already applied
  const existing = await sql`SELECT name FROM public.drizzle_migrations WHERE name = '0004_strategy_folders.sql'`;
  if (existing.length > 0) {
    console.log("  ⏭  0004_strategy_folders.sql already applied");
  } else {
    const content = fs.readFileSync(path.join(ROOT, "drizzle", "0004_strategy_folders.sql"), "utf-8");
    await sql.unsafe(content);
    await sql`INSERT INTO public.drizzle_migrations (name, hash) VALUES ('0004_strategy_folders.sql', 'manual')`;
    console.log("  ✅ Applied: 0004_strategy_folders.sql");
  }

  console.log("\n✅ Migration complete");
} catch (err) {
  console.error("❌", err.message ?? err);
  process.exit(1);
} finally {
  await sql.end();
}
