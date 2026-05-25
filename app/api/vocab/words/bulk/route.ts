import { getDb, vocabWords } from '@/db'
import { ok, badRequest, serverError } from '@/lib/api-response'

export async function POST(request: Request) {
  try {
    const db   = getDb()
    const body = await request.json()
    const { rows, topicId } = body as {
      topicId: string
      rows: Array<{
        word:          string
        samplePhrase?: string | null
        type?:         string | null
        pronunciation?: string | null
        definitionVi?: string | null
        definitionEn?: string | null
        wordFamily?:   string | null
        synonyms?:     string | null
        antonyms?:     string | null
        example1En?:   string | null
        example1Vi?:   string | null
        example2En?:   string | null
        example2Vi?:   string | null
      }>
    }

    if (!topicId)                          return badRequest('topicId is required')
    if (!Array.isArray(rows) || rows.length === 0) return badRequest('rows must be a non-empty array')

    // Filter rows with at least a word value
    const valid = rows.filter(r => r.word?.trim())
    if (valid.length === 0) return badRequest('No valid rows (word is required)')

    const inserted = await db
      .insert(vocabWords)
      .values(valid.map(r => ({ ...r, topicId })))
      .returning()

    return ok(inserted, `${inserted.length} words created`, 201)
  } catch (error) {
    console.error('[POST /api/vocab/words/bulk]', error)
    return serverError('Bulk insert failed', error)
  }
}
