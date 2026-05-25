import { getGroqClient, GROQ_MODEL } from '@/lib/groq'
import { getDb, vocabWords } from '@/db'
import { ok, badRequest, serverError } from '@/lib/api-response'

interface WordPayload {
  word:          string
  samplePhrase:  string | null
  type:          string | null
  pronunciation: string | null
  definitionVi:  string | null
  definitionEn:  string | null
  wordFamily:    string | null
  synonyms:      string | null
  antonyms:      string | null
  example1En:    string | null
  example1Vi:    string | null
  example2En:    string | null
  example2Vi:    string | null
}

const SYSTEM_PROMPT = `You are a bilingual English-Vietnamese dictionary expert in the style of Cambridge Dictionary.
Given a list of English words or phrases, return a JSON array where each element has ALL of these fields:
{
  "word":          string  — the original word/phrase,
  "samplePhrase":  string  — 2-3 common collocations or usage patterns (comma-separated), e.g. "sustainable development, sustainable energy",
  "type":          string  — one of: noun | verb | adjective | adverb | phrase | idiom | expression,
  "pronunciation": string  — IPA transcription, e.g. "/səˈsteɪnəbl/",
  "definitionVi":  string  — concise Vietnamese definition in Cambridge style (1-2 sentences),
  "definitionEn":  string  — concise English definition in Cambridge style (1-2 sentences),
  "wordFamily":    string  — related word forms (comma-separated), e.g. "sustain (v), sustainability (n), sustainably (adv)",
  "synonyms":      string  — 2-4 synonyms (comma-separated),
  "antonyms":      string  — 1-3 antonyms if applicable, or empty string,
  "example1En":    string  — first example sentence in English (natural, B2-C1 level),
  "example1Vi":    string  — Vietnamese translation of example1En,
  "example2En":    string  — second example sentence in English (different context from example 1),
  "example2Vi":    string  — Vietnamese translation of example2En
}

Rules:
- All fields must be filled. Use empty string "" for antonyms if none apply.
- Definitions must be clear and concise, no more than 2 sentences each.
- Example sentences must be natural, contextually varied, and demonstrate the word in use.
- Return ONLY a valid JSON array, no markdown, no explanation text.`

export async function POST(request: Request) {
  try {
    const body     = await request.json()
    const { words, topicId } = body as { words: string[]; topicId?: string }

    if (!Array.isArray(words) || words.length === 0) {
      return badRequest('words must be a non-empty array')
    }
    if (words.length > 30) {
      return badRequest('Maximum 30 words per request')
    }

    const groq      = getGroqClient()
    const wordList  = words.map(w => w.trim()).filter(Boolean)

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Fill dictionary data for these words/phrases:\n${wordList.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\nReturn as JSON: { "words": [...] }`,
        },
      ],
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    let parsed: WordPayload[]
    try {
      const obj = JSON.parse(raw)
      // Support both { words: [...] } and bare array
      parsed = Array.isArray(obj) ? obj : (obj.words ?? [])
    } catch {
      return serverError('AI returned invalid JSON')
    }

    // If topicId provided, bulk-insert into DB and return saved rows
    if (topicId) {
      const db   = getDb()
      const rows = await db
        .insert(vocabWords)
        .values(parsed.map(p => ({ ...p, topicId })))
        .returning()
      return ok({ saved: rows, preview: parsed })
    }

    // Otherwise just return the AI-generated data (preview mode)
    return ok({ saved: null, preview: parsed })
  } catch (error) {
    console.error('[POST /api/vocab/ai-fill]', error)
    return serverError('AI fill failed', error)
  }
}
