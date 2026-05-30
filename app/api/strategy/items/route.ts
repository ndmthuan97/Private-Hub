import { NextRequest } from "next/server";
import { created, badRequest } from "@/lib/api-response";
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
    return badRequest("Thiếu tiêu đề");
  }

  const db = getDb();
  const [row] = await db.insert(roadmaps).values({
    title:    title.trim(),
    type:     type ?? "markdown",
    content:  content ?? "",
    folderId: folderId ?? null,
  }).returning();

  return created(row);
}
