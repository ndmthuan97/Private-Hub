import { NextRequest } from "next/server";
import { ok, created, badRequest, unauthorized, serverError } from "@/lib/api-response";
import { getDb, roadmaps } from "@/db";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const data = await db.select().from(roadmaps).orderBy(asc(roadmaps.sortOrder), asc(roadmaps.createdAt));
  return ok(data);
}

export async function POST(req: NextRequest) {
  // Guard: only allow requests with valid CRON_SECRET (from automation script or Vercel Cron)
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return unauthorized();
  }

  const { title, type, content } = await req.json() as { title: string; type: string; content: string };
  if (!title?.trim()) return badRequest("Thiếu tiêu đề");
  const db = getDb();
  const [row] = await db.insert(roadmaps).values({
    title: title.trim(),
    type: type ?? "markdown",
    content: content ?? "",
  }).returning();
  return created(row);
}
