import { NextRequest, NextResponse } from "next/server";
import { getDb, roadmaps } from "@/db";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const data = await db.select().from(roadmaps).orderBy(asc(roadmaps.sortOrder), asc(roadmaps.createdAt));
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  // Guard: only allow requests with valid CRON_SECRET (from automation script or Vercel Cron)
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { title, type, content } = await req.json() as { title: string; type: string; content: string };
  if (!title?.trim()) return NextResponse.json({ message: "Thiếu tiêu đề" }, { status: 400 });
  const db = getDb();
  const [row] = await db.insert(roadmaps).values({
    title: title.trim(),
    type: type ?? "markdown",
    content: content ?? "",
  }).returning();
  return NextResponse.json({ data: row }, { status: 201 });
}
