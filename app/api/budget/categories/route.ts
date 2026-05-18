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

// POST — tạo category mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { label: string; emoji: string; color: string; percentage: number };
    if (!body.label?.trim()) {
      return NextResponse.json({ statusCode: 422, message: "Thiếu tên hạng mục", data: null, errors: null }, { status: 422 });
    }
    const db  = getDb();
    const all = await db.select({ so: budgetCategories.sortOrder }).from(budgetCategories).orderBy(budgetCategories.sortOrder);
    const maxOrder = all.length ? Math.max(...all.map(r => r.so)) + 1 : 0;
    const key = body.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + "_" + Date.now();
    const [created] = await db.insert(budgetCategories).values({
      key, label: body.label.trim(), emoji: body.emoji || "💡",
      color: body.color || "#6366f1",
      percentage: String(body.percentage ?? 0),
      sortOrder: maxOrder,
    }).returning();
    return NextResponse.json({ statusCode: 201, message: "Đã tạo hạng mục", data: { category: created }, errors: null }, { status: 201 });
  } catch (err) {
    console.error("[budget/categories POST]", err);
    return NextResponse.json({ statusCode: 500, message: "Server error", data: null, errors: null }, { status: 500 });
  }
}

// PUT — cập nhật percentage của từng category (bulk)
// Body: [{ id, label?, emoji?, color?, percentage }]
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as { id: string; label?: string; emoji?: string; color?: string; percentage: number }[];
    const total = body.reduce((s, c) => s + c.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      return NextResponse.json(
        { statusCode: 422, message: `Tổng tỷ lệ phải bằng 100% (hiện: ${total.toFixed(2)}%)`, data: null, errors: null },
        { status: 422 }
      );
    }
    const db = getDb();
    const updated = await Promise.all(
      body.map((c) => {
        const set: Record<string, unknown> = { percentage: String(c.percentage), updatedAt: new Date() };
        if (c.label)  set.label = c.label;
        if (c.emoji)  set.emoji = c.emoji;
        if (c.color)  set.color = c.color;
        return db.update(budgetCategories).set(set).where(eq(budgetCategories.id, c.id)).returning().then(r => r[0]);
      })
    );
    return NextResponse.json({ statusCode: 200, message: "Đã cập nhật", data: { categories: updated }, errors: null });
  } catch (err) {
    console.error("[budget/categories PUT]", err);
    return NextResponse.json({ statusCode: 500, message: "Server error", data: null, errors: null }, { status: 500 });
  }
}
