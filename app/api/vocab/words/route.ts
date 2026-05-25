import { getDb, vocabWords } from '@/db'
import { eq, isNull, and, asc } from 'drizzle-orm'
import { ok, created, badRequest, serverError } from '@/lib/api-response'

export async function GET(request: Request) {
  try {
    const db        = getDb()
    const { searchParams } = new URL(request.url)
    const topicId   = searchParams.get('topic_id')

    const rows = topicId
      ? await db
          .select()
          .from(vocabWords)
          .where(and(eq(vocabWords.topicId, topicId), isNull(vocabWords.deletedAt)))
          .orderBy(asc(vocabWords.createdAt))
      : await db
          .select()
          .from(vocabWords)
          .where(isNull(vocabWords.deletedAt))
          .orderBy(asc(vocabWords.createdAt))

    return ok(rows)
  } catch (error) {
    console.error('[GET /api/vocab/words]', error)
    return serverError('Failed to fetch vocab words', error)
  }
}

export async function POST(request: Request) {
  try {
    const db   = getDb()
    const body = await request.json()

    if (!body.word)     return badRequest('word is required')
    if (!body.topic_id && !body.topicId) return badRequest('topic_id is required')

    // Accept both snake_case (from form) and camelCase
    const payload = {
      topicId:       body.topicId       ?? body.topic_id,
      word:          body.word,
      samplePhrase:  body.samplePhrase  ?? body.sample_phrase  ?? null,
      type:          body.type          ?? null,
      pronunciation: body.pronunciation ?? null,
      definitionVi:  body.definitionVi  ?? body.definition_vi  ?? null,
      definitionEn:  body.definitionEn  ?? body.definition_en  ?? null,
      wordFamily:    body.wordFamily     ?? body.word_family    ?? null,
      synonyms:      body.synonyms      ?? null,
      antonyms:      body.antonyms      ?? null,
      example1En:    body.example1En    ?? body.example1_en    ?? null,
      example1Vi:    body.example1Vi    ?? body.example1_vi    ?? null,
      example2En:    body.example2En    ?? body.example2_en    ?? null,
      example2Vi:    body.example2Vi    ?? body.example2_vi    ?? null,
    }

    const [row] = await db.insert(vocabWords).values(payload).returning()
    return created(row)
  } catch (error) {
    console.error('[POST /api/vocab/words]', error)
    return serverError('Failed to create vocab word', error)
  }
}
