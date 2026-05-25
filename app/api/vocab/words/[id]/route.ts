import { getDb, vocabWords } from '@/db'
import { eq } from 'drizzle-orm'
import { ok, notFound, serverError } from '@/lib/api-response'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db     = getDb()
    const { id } = await params
    const [row]  = await db.select().from(vocabWords).where(eq(vocabWords.id, id))
    if (!row) return notFound('Vocab word not found')
    return ok(row)
  } catch (error) {
    console.error('[GET /api/vocab/words/[id]]', error)
    return serverError('Failed to fetch vocab word', error)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db     = getDb()
    const { id } = await params
    const body   = await request.json()

    // Only update provided fields; always bump updatedAt
    const patch: Record<string, unknown> = { updatedAt: new Date() }
    const fields = [
      'word', 'samplePhrase', 'type', 'pronunciation',
      'definitionVi', 'definitionEn',
      'wordFamily', 'synonyms', 'antonyms',
      'example1En', 'example1Vi',
      'example2En', 'example2Vi',
    ] as const
    for (const f of fields) {
      if (body[f] !== undefined) patch[f] = body[f]
    }

    const [row] = await db
      .update(vocabWords)
      .set(patch)
      .where(eq(vocabWords.id, id))
      .returning()

    if (!row) return notFound('Vocab word not found')
    return ok(row)
  } catch (error) {
    console.error('[PATCH /api/vocab/words/[id]]', error)
    return serverError('Failed to update vocab word', error)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db     = getDb()
    const { id } = await params
    // Soft-delete: set deletedAt timestamp
    const [row]  = await db
      .update(vocabWords)
      .set({ deletedAt: new Date() })
      .where(eq(vocabWords.id, id))
      .returning()
    if (!row) return notFound('Vocab word not found')
    return ok(null, 'deleted')
  } catch (error) {
    console.error('[DELETE /api/vocab/words/[id]]', error)
    return serverError('Failed to delete vocab word', error)
  }
}
