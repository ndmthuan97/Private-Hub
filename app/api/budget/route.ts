import { NextRequest } from "next/server";
import { ok, created, unprocessable, serverError } from "@/lib/api-response";
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

    return ok({ entries: rows });
  } catch (err) {
    return serverError("Server error", err);
  }
}

// POST /api/budget — create entry or accumulate into existing month/year entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      month: number; year: number; totalAmount: number; note?: string;
    };

    if (!body.month || !body.year || !body.totalAmount) {
      return unprocessable("Thiếu month, year hoặc totalAmount");
    }

    const db = getDb();
    const cats = await db.select().from(budgetCategories).orderBy(budgetCategories.sortOrder);

    // New deposit record to append to history
    const newDeposit = {
      amount:    body.totalAmount,
      note:      body.note ?? "",
      createdAt: new Date().toISOString(),
    };

    const existing = await db
      .select()
      .from(budgetEntries)
      .where(and(eq(budgetEntries.month, body.month), eq(budgetEntries.year, body.year)))
      .limit(1);

    let result;
    if (existing.length > 0) {
      const current       = existing[0];
      const prevTotal     = parseFloat(String(current.totalAmount));
      const newTotal      = prevTotal + body.totalAmount;
      const prevDeposits  = (current.deposits as Array<Record<string, unknown>>) ?? [];

      // Recalculate allocation amounts from new total
      const allocations = cats.map((c) => {
        return {
          key:        c.key,
          label:      c.label,
          emoji:      c.emoji,
          color:      c.color,
          percentage: parseFloat(String(c.percentage)),
          amount:     Math.round((newTotal * parseFloat(String(c.percentage))) / 100),
        };
      });

      [result] = await db
        .update(budgetEntries)
        .set({
          totalAmount: String(newTotal),
          allocations,
          deposits:    [...prevDeposits, newDeposit],
          updatedAt:   new Date(),
        })
        .where(eq(budgetEntries.id, current.id))
        .returning();
    } else {
      // First deposit for this month — create new entry
      const allocations = cats.map((c) => ({
        key:        c.key,
        label:      c.label,
        emoji:      c.emoji,
        color:      c.color,
        percentage: parseFloat(String(c.percentage)),
        amount:     Math.round((body.totalAmount * parseFloat(String(c.percentage))) / 100),
      }));

      [result] = await db
        .insert(budgetEntries)
        .values({
          month:       body.month,
          year:        body.year,
          totalAmount: String(body.totalAmount),
          allocations,
          deposits:    [newDeposit],
          note:        body.note ?? "",
        })
        .returning();
    }

    return created({ entry: result }, "Đã lưu");
  } catch (err) {
    return serverError("Server error", err);
  }
}

