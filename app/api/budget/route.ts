// app/api/budget/route.ts — GET list + POST create
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { budgetEntries, budgetCategories } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";

// GET /api/budget?month=5&year=2026  (filter optional)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const month = searchParams.get("month");
    const year  = searchParams.get("year");

    const db = getDb();
    const conditions = [];
    if (month) conditions.push(eq(budgetEntries.month, parseInt(month)));
    if (year)  conditions.push(eq(budgetEntries.year,  parseInt(year)));

    const rows = await db
      .select()
      .from(budgetEntries)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(budgetEntries.year), desc(budgetEntries.month));

    return NextResponse.json({ statusCode: 200, message: "OK", data: { entries: rows }, errors: null });
  } catch (err) {
    console.error("[budget GET]", err);
    return NextResponse.json({ statusCode: 500, message: "Server error", data: null, errors: null }, { status: 500 });
  }
}

// POST /api/budget — tạo entry mới (hoặc overwrite nếu tháng/năm đã tồn tại)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      month: number; year: number; totalAmount: number; note?: string;
    };

    if (!body.month || !body.year || !body.totalAmount) {
      return NextResponse.json(
        { statusCode: 422, message: "Thiếu month, year hoặc totalAmount", data: null, errors: null },
        { status: 422 }
      );
    }

    const db = getDb();

    // Lấy categories hiện tại để tính allocation
    const cats = await db.select().from(budgetCategories).orderBy(budgetCategories.sortOrder);
    const allocations = cats.map((c) => ({
      key:        c.key,
      label:      c.label,
      emoji:      c.emoji,
      color:      c.color,
      percentage: parseFloat(String(c.percentage)),
      amount:     Math.round((body.totalAmount * parseFloat(String(c.percentage))) / 100),
    }));

    // Upsert: nếu tháng/năm đã tồn tại thì update
    const existing = await db
      .select({ id: budgetEntries.id })
      .from(budgetEntries)
      .where(and(eq(budgetEntries.month, body.month), eq(budgetEntries.year, body.year)))
      .limit(1);

    let result;
    if (existing.length > 0) {
      [result] = await db
        .update(budgetEntries)
        .set({
          totalAmount: String(body.totalAmount),
          allocations,
          note:        body.note ?? "",
          updatedAt:   new Date(),
        })
        .where(eq(budgetEntries.id, existing[0].id))
        .returning();
    } else {
      [result] = await db
        .insert(budgetEntries)
        .values({
          month:       body.month,
          year:        body.year,
          totalAmount: String(body.totalAmount),
          allocations,
          note:        body.note ?? "",
        })
        .returning();
    }

    return NextResponse.json(
      { statusCode: 201, message: "Đã lưu", data: { entry: result }, errors: null },
      { status: 201 }
    );
  } catch (err) {
    console.error("[budget POST]", err);
    return NextResponse.json({ statusCode: 500, message: "Server error", data: null, errors: null }, { status: 500 });
  }
}
