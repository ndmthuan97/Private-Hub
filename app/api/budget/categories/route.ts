import { NextRequest } from "next/server";
import { ok, created, unprocessable, serverError } from "@/lib/api-response";
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

    return ok({ categories: rows });
  } catch (err) {
    return serverError("Server error", err);
  }
}

// POST — tạo category mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { label: string; emoji: string; color: string; percentage: number };
    if (!body.label?.trim()) {
      return unprocessable("Thiếu tên hạng mục");
    }
    const db  = getDb();
    const all = await db.select({ so: budgetCategories.sortOrder }).from(budgetCategories).orderBy(budgetCategories.sortOrder);
    const maxOrder = all.length ? Math.max(...all.map(r => r.so)) + 1 : 0;
    const key = body.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + "_" + Date.now();
    const [row] = await db.insert(budgetCategories).values({
      key, label: body.label.trim(), emoji: body.emoji || "💡",
      color: body.color || "#6366f1",
      percentage: String(body.percentage ?? 0),
      sortOrder: maxOrder,
    }).returning();
    return created({ category: row }, "Đã tạo hạng mục");
  } catch (err) {
    return serverError("Server error", err);
  }
}

// PUT — cập nhật percentage của từng category (bulk)
// Body: [{ id, label?, emoji?, color?, percentage }]
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as { id: string; label?: string; emoji?: string; color?: string; percentage: number }[];
    const total = body.reduce((s, c) => s + c.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      return unprocessable(`Tổng tỷ lệ phải bằng 100% (hiện: ${total.toFixed(2)}%)`);
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
    return ok({ categories: updated }, "Đã cập nhật");
  } catch (err) {
    return serverError("Server error", err);
  }
}
