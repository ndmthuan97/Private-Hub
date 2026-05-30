import { NextRequest } from 'next/server'
import { getDb, vocabWords, budgetEntries, roadmaps, nlmPrompts } from '@/db'
import { sql, eq } from 'drizzle-orm'
import { ok, serverError } from '@/lib/api-response'

export async function GET(req: NextRequest) {
  try {
    const db = getDb()
    const now = new Date()
    const currentMonth = now.getMonth() + 1
    const currentYear = now.getFullYear()

    // Optional year filter for budget — defaults to current year
    const yearParam = req.nextUrl.searchParams.get('year')
    const budgetYear = yearParam ? parseInt(yearParam) : currentYear

    const [vocabStats, budgetYearData, strategyCount, nlmCount] = await Promise.all([
      db.select({
        totalWords:   sql<number>`count(case when ${vocabWords.deletedAt} is null then 1 end)::int`,
        learnedWords: sql<number>`count(case when ${vocabWords.deletedAt} is null and ${vocabWords.repetitions} >= 3 then 1 end)::int`,
        topicCount:   sql<number>`count(distinct ${vocabWords.topicId})::int`,
      }).from(vocabWords),

      // Budget: ALL months for the requested year
      db.select()
        .from(budgetEntries)
        .where(eq(budgetEntries.year, budgetYear))
        .orderBy(budgetEntries.month),

      db.select({ count: sql<number>`count(*)::int` }).from(roadmaps),
      db.select({ count: sql<number>`count(*)::int` }).from(nlmPrompts),
    ])

    const vocab = vocabStats[0] ?? { totalWords: 0, learnedWords: 0, topicCount: 0 }

    // Build monthly summary for the year
    const months = budgetYearData.map(entry => {
      const total = parseFloat(String(entry.totalAmount))
      const allocs = entry.allocations as Array<{ spent?: number }>
      const spent = allocs.reduce((sum, a) => sum + (Number(a.spent) || 0), 0)
      return {
        month: entry.month,
        total,
        spent,
        remaining: total - spent,
        allocations: entry.allocations as Array<Record<string, unknown>>,
      }
    })

    // Current month data for the stat card
    const currentEntry = budgetYearData.find(e => e.month === currentMonth && budgetYear === currentYear)
    let currentTotal = 0, currentSpent = 0
    if (currentEntry) {
      currentTotal = parseFloat(String(currentEntry.totalAmount))
      const allocs = currentEntry.allocations as Array<{ spent?: number }>
      currentSpent = allocs.reduce((sum, a) => sum + (Number(a.spent) || 0), 0)
    }

    // Distinct years that have budget data (for year selector)
    const yearsResult = await db
      .selectDistinct({ year: budgetEntries.year })
      .from(budgetEntries)
      .orderBy(budgetEntries.year)
    const availableYears = yearsResult.map(r => r.year)
    if (!availableYears.includes(currentYear)) availableYears.push(currentYear)
    availableYears.sort((a, b) => b - a)

    return ok({
      vocab: {
        totalWords:   vocab.totalWords,
        learnedWords: vocab.learnedWords,
        topicCount:   vocab.topicCount,
      },
      budget: {
        currentMonth,
        currentYear,
        selectedYear: budgetYear,
        availableYears,
        currentMonthTotal:     currentTotal,
        currentMonthSpent:     currentSpent,
        currentMonthRemaining: currentTotal - currentSpent,
        months,
      },
      strategy: {
        totalItems: strategyCount[0]?.count ?? 0,
      },
      notebooklm: {
        totalPrompts: nlmCount[0]?.count ?? 0,
      },
    })
  } catch (error) {
    console.error('[GET /api/dashboard]', error)
    return serverError('Failed to fetch dashboard data', error)
  }
}
