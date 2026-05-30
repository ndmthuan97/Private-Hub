import { NextRequest } from "next/server";
import { ok, notFound, serverError } from "@/lib/api-response";
import { getDb } from "@/db";
import { budgetEntries, budgetCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

// PUT /api/budget/[id] — update totalAmount
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json() as {
      totalAmount?: number;
      note?: string;
    };
    const db = getDb();

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.note !== undefined) updates.note = body.note;

    if (body.totalAmount !== undefined) {
      const cats = await db.select().from(budgetCategories).orderBy(budgetCategories.sortOrder);
      updates.totalAmount = String(body.totalAmount);
      updates.allocations = cats.map((c) => ({
        key:        c.key,
        label:      c.label,
        emoji:      c.emoji,
        color:      c.color,
        percentage: parseFloat(String(c.percentage)),
        amount:     Math.round((body.totalAmount! * parseFloat(String(c.percentage))) / 100),
      }));
    }

    const [updated] = await db
      .update(budgetEntries)
      .set(updates)
      .where(eq(budgetEntries.id, id))
      .returning();

    if (!updated) {
      return notFound("Không tìm thấy");
    }

    return ok({ entry: updated }, "Đã cập nhật");
  } catch (err) {
    return serverError("Server error", err);
  }
}

// DELETE /api/budget/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = getDb();
    const [deleted] = await db
      .delete(budgetEntries)
      .where(eq(budgetEntries.id, id))
      .returning({ id: budgetEntries.id });

    if (!deleted) {
      return notFound("Không tìm thấy");
    }

    return ok({ id: deleted.id }, "Đã xóa");
  } catch (err) {
    return serverError("Server error", err);
  }
}
