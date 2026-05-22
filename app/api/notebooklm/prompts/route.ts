import { NextRequest, NextResponse } from "next/server";
import { getDb, nlmPrompts } from "@/db";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const rows = await db
    .select()
    .from(nlmPrompts)
    .orderBy(asc(nlmPrompts.sortOrder), asc(nlmPrompts.createdAt));
  return NextResponse.json({ statusCode: 200, message: "OK", data: rows, errors: null });
}

export async function POST(req: NextRequest) {
  const { title, content, quizPrompt } = await req.json() as {
    title: string;
    content: string;
    quizPrompt?: string;
  };

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json(
      { statusCode: 400, message: "title and content are required", data: null, errors: null },
      { status: 400 }
    );
  }

  const db = getDb();
  const [row] = await db
    .insert(nlmPrompts)
    .values({
      title: title.trim(),
      content: content.trim(),
      quizPrompt: quizPrompt?.trim() || null,
    })
    .returning();

  return NextResponse.json({ statusCode: 201, message: "Created", data: row, errors: null }, { status: 201 });
}
