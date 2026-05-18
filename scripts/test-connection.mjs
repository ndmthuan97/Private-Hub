// scripts/test-connection.mjs
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// Load .env
fs.readFileSync(path.join(ROOT, ".env"), "utf-8")
  .split(/\r?\n/)
  .filter(l => l && !l.startsWith("#") && l.includes("="))
  .forEach(l => {
    const idx = l.indexOf("=");
    const k = l.slice(0, idx).trim();
    const v = l.slice(idx + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  });

const configs = [
  { label: "Session pooler (5432)", url: process.env.DATABASE_URL },
];

for (const { label, url } of configs) {
  if (!url) { console.log(`⏭  ${label}: not configured`); continue; }

  process.stdout.write(`Testing ${label}... `);
  const sql = postgres(url, { max: 1, ssl: "require", connect_timeout: 10 });
  try {
    const [row] = await sql`SELECT current_user, version()`;
    console.log(`✅  user=${row.current_user}`);

    // Test DDL capability
    process.stdout.write(`  → DDL test... `);
    await sql.unsafe(`CREATE TABLE IF NOT EXISTS _test_ddl_probe (id int)`);
    await sql.unsafe(`DROP TABLE IF EXISTS _test_ddl_probe`);
    console.log("✅  DDL supported");
  } catch (e) {
    console.log(`❌  ${e.message}`);
  } finally {
    await sql.end();
  }
}
