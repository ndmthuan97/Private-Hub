import { getDb, vocabTopics } from '@/db'
import { eq } from 'drizzle-orm'
import { ok, notFound, badRequest, serverError } from '@/lib/api-response'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db  = getDb()
    const { id } = await params
    const [row] = await db.select().from(vocabTopics).where(eq(vocabTopics.id, id))
    if (!row) return notFound('Vocab topic not found')
    return ok(row)
  } catch (error) {
    console.error('[GET /api/vocab/topics/[id]]', error)
    return serverError('Failed to fetch vocab topic', error)
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db   = getDb()
    const { id } = await params
    const body = await request.json()
    const { name, slug, icon, sortOrder } = body

    const [row] = await db
      .update(vocabTopics)
      .set({
        ...(name      !== undefined && { name }),
        ...(slug      !== undefined && { slug }),
        ...(icon      !== undefined && { icon }),
        ...(sortOrder !== undefined && { sortOrder }),
      })
      .where(eq(vocabTopics.id, id))
      .returning()

    if (!row) return notFound('Vocab topic not found')
    return ok(row)
  } catch (error) {
    console.error('[PATCH /api/vocab/topics/[id]]', error)
    return serverError('Failed to update vocab topic', error)
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db     = getDb()
    const { id } = await params
    await db.delete(vocabTopics).where(eq(vocabTopics.id, id))
    return ok(null, 'deleted')
  } catch (error) {
    console.error('[DELETE /api/vocab/topics/[id]]', error)
    return serverError('Failed to delete vocab topic', error)
  }
}
