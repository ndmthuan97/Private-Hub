// app/api/budget/categories/route.ts — GET + PUT category percentages
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { budgetCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_CATEGORIES = [
  { key: "essential",  label: "Cần Thiết", emoji: "🏠", color: "#22c55e", percentage: "50",   sortOrder: 0 },
  { key: "savings",    label: "Tiết Kiệm", emoji: "💰", color: "#06b6d4", percentage: "10",   sortOrder: 1 },
  { key: "education",  label: "Giáo Dục",  emoji: "📚", color: "#a855f7", percentage: "10",   sortOrder: 2 },
  { key: "enjoyment",  label: "Hưởng Thụ", emoji: "🎉", color: "#f97316", percentage: "14.5", sortOrder: 3 },
  { key: "investment", label: "Đầu Tư",   emoji: "📈", color: "#3b82f6", percentage: "15",   sortOrder: 4 },
  { key: "charity",    label: "Từ Thiện",  emoji: "❤️", color: "#ec4899", percentage: "0.5",  sortOrder: 5 },
];

// GET — trả về danh sách categories (seed defaults nếu bảng trống)
export async function GET() {
  try {
    const db = getDb();
    let rows = await db.select().from(budgetCategories).orderBy(budgetCategories.sortOrder);

    if (rows.length === 0) {
      // Seed default categories
      rows = await db.insert(budgetCategories).values(DEFAULT_CATEGORIES).returning();
    }

    return NextResponse.json({ statusCode: 200, message: "OK", data: { categories: rows }, errors: null });
  } catch (err) {
    console.error("[budget/categories GET]", err);
    return NextResponse.json({ statusCode: 500, message: "Server error", data: null, errors: null }, { status: 500 });
  }
}

// PUT — cập nhật percentage của từng category
// Body: [{ id, percentage }] — tổng phải = 100
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as { id: string; percentage: number }[];

    const total = body.reduce((s, c) => s + c.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      return NextResponse.json(
        { statusCode: 422, message: `Tổng tỷ lệ phải bằng 100% (hiện: ${total.toFixed(2)}%)`, data: null, errors: null },
        { status: 422 }
      );
    }

    const db = getDb();
    const updated = await Promise.all(
      body.map((c) =>
        db.update(budgetCategories)
          .set({ percentage: String(c.percentage), updatedAt: new Date() })
          .where(eq(budgetCategories.id, c.id))
          .returning()
          .then((r) => r[0])
      )
    );

    return NextResponse.json({ statusCode: 200, message: "Đã cập nhật tỷ lệ", data: { categories: updated }, errors: null });
  } catch (err) {
    console.error("[budget/categories PUT]", err);
    return NextResponse.json({ statusCode: 500, message: "Server error", data: null, errors: null }, { status: 500 });
  }
}
