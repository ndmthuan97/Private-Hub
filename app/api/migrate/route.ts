// app/api/migrate/route.ts
// Migration endpoint — chạy từ Vercel sau khi deploy
// Trigger: GET /api/migrate?secret=CRON_SECRET
//
// Tại sao cần endpoint này:
// - Supabase free tier chặn direct TCP từ IPv4 local machine
// - Vercel servers có full connectivity đến Supabase pooler
// - Session pooler (port 5432) hỗ trợ DDL (CREATE TABLE, ALTER, ...)

import { NextRequest, NextResponse } from "next/server";
import { ok, unauthorized, serverError } from "@/lib/api-response";
import postgres from "postgres";
import fs from "fs";
import path from "path";
import crypto from "crypto";

// Bảo vệ bằng CRON_SECRET
function isAuthorized(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get("secret");
  return secret === process.env.CRON_SECRET;
}

const MIGRATIONS_DIR = path.join(process.cwd(), "drizzle");

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return unauthorized();
  }

  // Dùng session pooler (port 5432) — hỗ trợ DDL, hoạt động từ Vercel
  const url = process.env.DATABASE_URL;
  if (!url) {
    return serverError("DATABASE_URL not configured");
  }

  const applied: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = postgres(url, { max: 1, ssl: "prefer", connect_timeout: 20 });

    // 1. Tạo migration tracking table trong public schema
    await sql.unsafe(`
      CREATE TABLE IF NOT EXISTS public.drizzle_migrations (
        id         SERIAL      PRIMARY KEY,
        name       TEXT        NOT NULL UNIQUE,
        hash       TEXT        NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 2. Lấy danh sách migration đã apply
    const rows = await sql<{ name: string }[]>`
      SELECT name FROM public.drizzle_migrations ORDER BY id
    `;
    const appliedSet = new Set(rows.map((r) => r.name));

    // 3. Đọc và apply từng migration file theo thứ tự
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        skipped.push(file);
        continue;
      }

      const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);

      await sql.unsafe(content);
      await sql`
        INSERT INTO public.drizzle_migrations ${sql({ name: file, hash })}
      `;
      applied.push(file);
    }

    return ok({ applied, skipped }, applied.length > 0
      ? `Applied ${applied.length} migration(s)`
      : "Already up to date");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return serverError("Migration failed", err);
  } finally {
    await sql?.end();
  }
}
