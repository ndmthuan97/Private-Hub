import { NextRequest } from "next/server";
import { ok, notFound, unprocessable, serverError } from "@/lib/api-response";
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
      return unprocessable("Phải có ít nhất 1 hạng mục");
    }
    const [deleted] = await db.delete(budgetCategories).where(eq(budgetCategories.id, id)).returning({ id: budgetCategories.id });
    if (!deleted) {
      return notFound("Không tìm thấy");
    }
    return ok({ id: deleted.id }, "Đã xóa hạng mục");
  } catch (err) {
    return serverError("Server error", err);
  }
}
