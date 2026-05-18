// app/api/budget/[id]/route.ts — PUT update + DELETE
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { budgetEntries, budgetCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

// PUT /api/budget/[id] — update amount/note (recalculate allocations)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json() as { totalAmount?: number; note?: string };
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
      return NextResponse.json({ statusCode: 404, message: "Không tìm thấy", data: null, errors: null }, { status: 404 });
    }

    return NextResponse.json({ statusCode: 200, message: "Đã cập nhật", data: { entry: updated }, errors: null });
  } catch (err) {
    console.error("[budget/[id] PUT]", err);
    return NextResponse.json({ statusCode: 500, message: "Server error", data: null, errors: null }, { status: 500 });
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
      return NextResponse.json({ statusCode: 404, message: "Không tìm thấy", data: null, errors: null }, { status: 404 });
    }

    return NextResponse.json({ statusCode: 200, message: "Đã xóa", data: { id: deleted.id }, errors: null });
  } catch (err) {
    console.error("[budget/[id] DELETE]", err);
    return NextResponse.json({ statusCode: 500, message: "Server error", data: null, errors: null }, { status: 500 });
  }
}
