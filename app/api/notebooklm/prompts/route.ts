import { NextRequest } from "next/server";
import { ok, created, badRequest, notFound } from "@/lib/api-response";
import { getDb, nlmPrompts } from "@/db";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const rows = await db
    .select()
    .from(nlmPrompts)
    .orderBy(asc(nlmPrompts.sortOrder), asc(nlmPrompts.createdAt));
  return ok(rows);
}

export async function POST(req: NextRequest) {
  const { title, label, content, quizPrompt } = await req.json() as {
    title: string;
    label?: string;
    content: string;
    quizPrompt?: string;
  };

  if (!title?.trim() || !content?.trim()) {
    return badRequest("title and content are required");
  }

  const db = getDb();
  const [row] = await db
    .insert(nlmPrompts)
    .values({
      title: title.trim(),
      label: label?.trim() || "",
      content: content.trim(),
      quizPrompt: quizPrompt?.trim() || null,
    })
    .returning();

  return created(row);
}
