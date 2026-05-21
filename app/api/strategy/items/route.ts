import { NextRequest, NextResponse } from "next/server";
import { getDb, roadmaps } from "@/db";

// POST /api/strategy/items — create a new strategy item from UI (no CRON_SECRET needed)
export async function POST(req: NextRequest) {
  const { title, type, content, folderId } = await req.json() as {
    title: string;
    type: string;
    content: string;
    folderId?: string | null;
  };

  if (!title?.trim()) {
    return NextResponse.json({ statusCode: 400, message: "Thiếu tiêu đề", data: null, errors: null }, { status: 400 });
  }

  const db = getDb();
  const [row] = await db.insert(roadmaps).values({
    title:    title.trim(),
    type:     type ?? "markdown",
    content:  content ?? "",
    folderId: folderId ?? null,
  }).returning();

  return NextResponse.json({ statusCode: 201, message: "Created", data: row, errors: null }, { status: 201 });
}
