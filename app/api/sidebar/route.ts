import { NextRequest } from "next/server";
import { ok, serverError } from "@/lib/api-response";
import { getDb, sidebarConfig } from "@/db";
import { eq } from "drizzle-orm";

const CONFIG_ID = "default";

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

    return ok({
      links: row.links as unknown[],
      groups: row.groups as unknown[],
      hidden: row.hidden as unknown[],
      overrides: row.overrides as Record<string, unknown>,
    });
  } catch (e) {
    return serverError("Failed to load sidebar config", e);
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

    return ok({ links, groups, hidden, overrides }, "Sidebar config updated");
  } catch (e) {
    return serverError("Failed to update sidebar config", e);
  }
}
