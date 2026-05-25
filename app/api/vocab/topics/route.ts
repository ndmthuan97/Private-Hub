import { getDb, vocabTopics, vocabWords } from '@/db'
import { eq, isNull, sql } from 'drizzle-orm'
import { ok, created, badRequest, serverError } from '@/lib/api-response'

export async function GET() {
  try {
    const db     = getDb()
    const result = await db
      .select({
        id:         vocabTopics.id,
        name:       vocabTopics.name,
        slug:       vocabTopics.slug,
        icon:       vocabTopics.icon,
        sortOrder:  vocabTopics.sortOrder,
        createdAt:  vocabTopics.createdAt,
        word_count:    sql<number>`count(case when ${vocabWords.deletedAt} is null then 1 end)::int`,
        learned_count: sql<number>`count(case when ${vocabWords.deletedAt} is null and ${vocabWords.repetitions} >= 3 then 1 end)::int`,
      })
      .from(vocabTopics)
      .leftJoin(vocabWords, eq(vocabTopics.id, vocabWords.topicId))
      .groupBy(vocabTopics.id)
      .orderBy(vocabTopics.sortOrder)

    return ok(result)
  } catch (error) {
    console.error('[GET /api/vocab/topics]', error)
    return serverError('Failed to fetch vocab topics', error)
  }
}

export async function POST(request: Request) {
  try {
    const db   = getDb()
    const body = await request.json()
    const { name, slug, icon, sortOrder } = body

    if (!name || !slug) return badRequest('name and slug are required')

    const [row] = await db
      .insert(vocabTopics)
      .values({ name, slug, icon: icon ?? '📖', sortOrder: sortOrder ?? 0 })
      .returning()

    return created(row)
  } catch (error) {
    console.error('[POST /api/vocab/topics]', error)
    return serverError('Failed to create vocab topic', error)
  }
}
