import { NextRequest } from "next/server";
import { ok, created, badRequest } from "@/lib/api-response";
import { getDb, strategyFolders } from "@/db";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const data = await db.select().from(strategyFolders).orderBy(asc(strategyFolders.sortOrder), asc(strategyFolders.createdAt));
  return ok(data);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json() as { name: string };
  if (!name?.trim()) {
    return badRequest("Thiếu tên folder");
  }
  const db = getDb();
  const [row] = await db.insert(strategyFolders).values({ name: name.trim() }).returning();
  return created(row);
}
