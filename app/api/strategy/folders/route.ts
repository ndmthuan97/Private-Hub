import { NextRequest, NextResponse } from "next/server";
import { getDb, strategyFolders } from "@/db";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const data = await db.select().from(strategyFolders).orderBy(asc(strategyFolders.sortOrder), asc(strategyFolders.createdAt));
  return NextResponse.json({ statusCode: 200, message: "OK", data, errors: null });
}

export async function POST(req: NextRequest) {
  const { name } = await req.json() as { name: string };
  if (!name?.trim()) {
    return NextResponse.json({ statusCode: 400, message: "Thiếu tên folder", data: null, errors: null }, { status: 400 });
  }
  const db = getDb();
  const [row] = await db.insert(strategyFolders).values({ name: name.trim() }).returning();
  return NextResponse.json({ statusCode: 201, message: "Created", data: row, errors: null }, { status: 201 });
}
