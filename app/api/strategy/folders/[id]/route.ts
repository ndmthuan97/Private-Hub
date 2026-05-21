import { NextRequest, NextResponse } from "next/server";
import { getDb, strategyFolders, roadmaps } from "@/db";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json() as { name: string };
  if (!name?.trim()) {
    return NextResponse.json({ statusCode: 400, message: "Thiếu tên folder", data: null, errors: null }, { status: 400 });
  }
  const db = getDb();
  const [row] = await db.update(strategyFolders)
    .set({ name: name.trim() })
    .where(eq(strategyFolders.id, id))
    .returning();
  return NextResponse.json({ statusCode: 200, message: "Updated", data: row, errors: null });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  // Items inside this folder will have folder_id set to NULL via ON DELETE SET NULL (DB constraint)
  await db.delete(strategyFolders).where(eq(strategyFolders.id, id));
  return NextResponse.json({ statusCode: 200, message: "Deleted", data: null, errors: null });
}
