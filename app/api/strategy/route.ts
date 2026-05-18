import { NextRequest, NextResponse } from "next/server";
import { getDb, roadmaps } from "@/db";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const data = await db.select().from(roadmaps).orderBy(asc(roadmaps.sortOrder), asc(roadmaps.createdAt));
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
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
