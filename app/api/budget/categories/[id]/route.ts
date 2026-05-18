// app/api/budget/categories/[id]/route.ts — DELETE single category
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { budgetCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const db = getDb();
    // Không cho xóa nếu chỉ còn 1 category
    const count = await db.select({ id: budgetCategories.id }).from(budgetCategories);
    if (count.length <= 1) {
      return NextResponse.json({ statusCode: 422, message: "Phải có ít nhất 1 hạng mục", data: null, errors: null }, { status: 422 });
    }
    const [deleted] = await db.delete(budgetCategories).where(eq(budgetCategories.id, id)).returning({ id: budgetCategories.id });
    if (!deleted) {
      return NextResponse.json({ statusCode: 404, message: "Không tìm thấy", data: null, errors: null }, { status: 404 });
    }
    return NextResponse.json({ statusCode: 200, message: "Đã xóa hạng mục", data: { id: deleted.id }, errors: null });
  } catch (err) {
    console.error("[budget/categories/[id] DELETE]", err);
    return NextResponse.json({ statusCode: 500, message: "Server error", data: null, errors: null }, { status: 500 });
  }
}
