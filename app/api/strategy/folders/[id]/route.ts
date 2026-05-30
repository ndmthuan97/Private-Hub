import { NextRequest } from "next/server";
import { ok, badRequest } from "@/lib/api-response";
import { getDb, strategyFolders } from "@/db";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json() as { name: string };
  if (!name?.trim()) {
    return badRequest("Thiếu tên folder");
  }
  const db = getDb();
  const [row] = await db.update(strategyFolders)
    .set({ name: name.trim() })
    .where(eq(strategyFolders.id, id))
    .returning();
  return ok(row, "Updated");
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  // Items inside this folder will have folder_id set to NULL via ON DELETE SET NULL (DB constraint)
  await db.delete(strategyFolders).where(eq(strategyFolders.id, id));
  return ok(null, "Deleted");
}
