import { NextRequest, NextResponse } from "next/server";
import { getDb, sidebarConfig } from "@/db";
import { eq } from "drizzle-orm";

const CONFIG_ID = "default";

type ApiRes<T = unknown> = {
  statusCode: number;
  message: string;
  data: T | null;
  errors: unknown | null;
};

function json<T>(body: ApiRes<T>, status = 200) {
  return NextResponse.json(body, { status });
}

// GET /api/sidebar — return sidebar config
export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(sidebarConfig)
      .where(eq(sidebarConfig.id, CONFIG_ID))
      .limit(1);

    const row = rows[0] ?? { links: [], groups: [], hidden: [], overrides: {} };

    return json({
      statusCode: 200,
      message: "OK",
      data: {
        links: row.links as unknown[],
        groups: row.groups as unknown[],
        hidden: row.hidden as unknown[],
        overrides: row.overrides as Record<string, unknown>,
      },
      errors: null,
    });
  } catch (e) {
    return json(
      { statusCode: 500, message: "Failed to load sidebar config", data: null, errors: String(e) },
      500
    );
  }
}

// PUT /api/sidebar — upsert sidebar config
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { links, groups, hidden, overrides } = body;

    const db = getDb();

    // Build update payload — only include fields that were sent
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (links !== undefined) updates.links = links;
    if (groups !== undefined) updates.groups = groups;
    if (hidden !== undefined) updates.hidden = hidden;
    if (overrides !== undefined) updates.overrides = overrides;

    await db
      .insert(sidebarConfig)
      .values({
        id: CONFIG_ID,
        links: links ?? [],
        groups: groups ?? [],
        hidden: hidden ?? [],
        overrides: overrides ?? {},
      })
      .onConflictDoUpdate({
        target: sidebarConfig.id,
        set: updates,
      });

    return json({
      statusCode: 200,
      message: "Sidebar config updated",
      data: { links, groups, hidden, overrides },
      errors: null,
    });
  } catch (e) {
    return json(
      { statusCode: 500, message: "Failed to update sidebar config", data: null, errors: String(e) },
      500
    );
  }
}
