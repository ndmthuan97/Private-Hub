import { NextRequest, NextResponse } from "next/server";
import { getDb, roadmaps } from "@/db";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { title, type, content, folderId } = await req.json() as {
    title: string; type: string; content: string; folderId?: string | null;
  };
  const db = getDb();
  const [row] = await db.update(roadmaps)
    .set({ title: title.trim(), type, content, folderId: folderId ?? null, updatedAt: new Date() })
    .where(eq(roadmaps.id, id))
    .returning();
  return NextResponse.json({ statusCode: 200, message: "Updated", data: row, errors: null });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  await db.delete(roadmaps).where(eq(roadmaps.id, id));
  return NextResponse.json({ statusCode: 200, message: "Deleted", data: null, errors: null });
}
