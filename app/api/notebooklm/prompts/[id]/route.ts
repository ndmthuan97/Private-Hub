import { NextRequest, NextResponse } from "next/server";
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
    return NextResponse.json(
      { statusCode: 404, message: "Prompt not found", data: null, errors: null },
      { status: 404 }
    );
  }

  return NextResponse.json({ statusCode: 200, message: "Updated", data: row, errors: null });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  await db.delete(nlmPrompts).where(eq(nlmPrompts.id, id));
  return NextResponse.json({ statusCode: 200, message: "Deleted", data: null, errors: null });
}
