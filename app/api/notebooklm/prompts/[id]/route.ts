import { NextRequest } from "next/server";
import { ok, notFound } from "@/lib/api-response";
import { getDb, nlmPrompts } from "@/db";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { title, label, content, quizPrompt } = await req.json() as {
    title?: string;
    label?: string;
    content?: string;
    quizPrompt?: string;
  };

  const db = getDb();
  const [row] = await db
    .update(nlmPrompts)
    .set({
      ...(title   !== undefined && { title: title.trim() }),
      ...(label   !== undefined && { label: label.trim() }),
      ...(content !== undefined && { content: content.trim() }),
      ...(quizPrompt !== undefined && { quizPrompt: quizPrompt?.trim() || null }),
      updatedAt: new Date(),
    })
    .where(eq(nlmPrompts.id, id))
    .returning();

  if (!row) {
    return notFound("Prompt not found");
  }

  return ok(row, "Updated");
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  await db.delete(nlmPrompts).where(eq(nlmPrompts.id, id));
  return ok(null, "Deleted");
}
