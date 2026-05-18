// app/api/tech-digest/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb, techDigests } from "@/db";
import { eq } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(techDigests)
      .where(eq(techDigests.id, id))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { statusCode: 404, message: "Digest not found", data: null, errors: null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      statusCode: 200,
      message: "OK",
      data: { digest: row },
      errors: null,
    });
  } catch (err) {
    console.error("[tech-digest/[id] GET]", err);
    return NextResponse.json(
      { statusCode: 500, message: "Internal server error", data: null, errors: null },
      { status: 500 }
    );
  }
}
