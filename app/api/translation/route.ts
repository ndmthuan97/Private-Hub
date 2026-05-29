import { NextRequest } from "next/server";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import { ok, badRequest, serverError } from "@/lib/api-response";

type Language = "en" | "jp";

interface AnalyzeBody {
  action: "analyze";
  language: Language;
  text: string;
}

type RequestBody = AnalyzeBody;

/* Grammar role labels for prompt clarity */
const ROLE_DESCRIPTIONS: Record<Language, string> = {
  en: `Grammar roles to use (pick the most fitting one for each chunk):
- "subject": Subject — who/what performs the action
- "verb": Verb / verb phrase — the action or state
- "object": Object — who/what receives the action
- "complement": Complement — extra info completing the meaning
- "adverbial": Adverbial — time, place, manner, reason
- "conjunction": Conjunction — linking words/clauses
- "modifier": Modifier — adjectives, adverbs modifying other words
- "preposition": Preposition / prepositional phrase`,

  jp: `Grammar roles to use (pick the most fitting one for each chunk):
- "subject": 主語 — who/what performs the action (は/が)
- "verb": 述語 — verb/predicate at the end
- "object": 目的語 — object of action (を/に)
- "complement": 補語 — completing info
- "adverbial": 副詞/修飾語 — time, place, manner
- "conjunction": 接続詞 — linking elements
- "modifier": 形容詞/連体修飾 — modifiers
- "preposition": 助詞/格助詞 — particles`,
};

const KEY_PHRASE_TYPES: Record<Language, string> = {
  en: `Key phrase types to identify:
- "collocation": Common word pairings (hold a meeting, submit a bid)
- "idiom": Fixed expressions/idioms (cut corners, in the long run)
- "formal_expression": Formal/professional expressions (I am writing to inform you...)
- "phrasal_verb": Phrasal verbs (carry out, follow up on)
- "connector": Advanced discourse connectors (Furthermore, In light of this)
- "advanced_vocab": Sophisticated vocabulary replacing simpler words (omit instead of forget)`,

  jp: `Key phrase types to identify:
- "collocation": よく一緒に使う言葉の組み合わせ (会議を開く, 検討を重ねる)
- "idiom": 慣用句・決まり文句 (腕を振るう, 目を通す)
- "formal_expression": 敬語・ビジネス表現 (お忙しいところ恐れ入りますが...)
- "phrasal_verb": 複合動詞 (取り組む, 見直す)
- "connector": 接続表現 (それに伴い, その結果)
- "advanced_vocab": 上級語彙 (省略する instead of 忘れる)`,
};

function buildAnalyzePrompt(language: Language, text: string): string {
  const langLabel = language === "en" ? "English" : "Japanese";
  const roles = ROLE_DESCRIPTIONS[language];
  const phraseTypes = KEY_PHRASE_TYPES[language];

  return `You are an expert ${langLabel} grammar analyst and language teacher. Your task is to analyze a text passage for Vietnamese learners who are practicing translation.

INPUT TEXT:
"""
${text}
"""

TASK:
1. **Group** sentences into logical paragraphs/sections (by topic or purpose).
2. For each paragraph, provide a heading (with emoji) and a brief note explaining the context/purpose of that section.
3. **Chunk** each sentence into meaningful phrase groups based on grammar structure.
4. Assign a grammar **role** to each chunk.
5. Provide a Vietnamese **hint** (translation/explanation) for each chunk.
6. **Extract key phrases** — important collocations, idioms, formal expressions, phrasal verbs, connectors, and advanced vocabulary that learners should memorize.

${roles}

${phraseTypes}

IMPORTANT RULES:
- Each chunk should be a meaningful phrase (2-5 words typically), NOT individual words.
- Preserve the exact original text — every word must appear in exactly one chunk.
- Chunks must be in the same order as the original sentence.
- Hints should be natural Vietnamese translations, not word-by-word.
- Extract 5-10 key phrases that are genuinely useful for learners.
- For key phrases, the "note" should explain WHY this phrase is worth learning (compare with simpler alternatives, usage context, register level).
- The "example" for key phrases should be a different sentence showing the same phrase in use.
- All headings, notes, hints, meanings, and explanations must be in Vietnamese.

Respond with ONLY valid JSON (no markdown fences, no extra text) in this exact structure:

{
  "paragraphs": [
    {
      "heading": "📌 [Section title in Vietnamese]",
      "note": "[Brief Vietnamese explanation of this section's purpose]",
      "sentences": [
        {
          "original": "[Full original sentence]",
          "chunks": [
            {
              "text": "[phrase chunk]",
              "role": "[grammar role from list above]",
              "hint": "[Vietnamese hint]"
            }
          ]
        }
      ]
    }
  ],
  "keyPhrases": [
    {
      "phrase": "[the key phrase]",
      "type": "[collocation|idiom|formal_expression|phrasal_verb|connector|advanced_vocab]",
      "meaning": "[Vietnamese meaning]",
      "note": "[Vietnamese explanation of why this is worth learning]",
      "example": "[Example sentence using this phrase]"
    }
  ]
}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();

    if (!body.action || body.action !== "analyze") {
      return badRequest("Invalid action. Must be 'analyze'.");
    }

    if (!body.text?.trim()) {
      return badRequest("Missing required field: text");
    }

    if (!body.language || !["en", "jp"].includes(body.language)) {
      return badRequest("Invalid language. Must be 'en' or 'jp'.");
    }

    const gemini = getGeminiClient();
    const prompt = buildAnalyzePrompt(body.language, body.text.trim());

    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0.3,
        responseMimeType: "application/json",
      },
    });

    const raw = response.text ?? "";

    // Parse and validate JSON structure
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Attempt to extract JSON from markdown fences
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error("AI returned invalid JSON");
      }
    }

    if (!parsed.paragraphs || !Array.isArray(parsed.paragraphs)) {
      return serverError("AI returned unexpected structure");
    }

    return ok(parsed);
  } catch (err) {
    console.error("[translation/route] error:", err);
    return serverError("Failed to analyze text", err);
  }
}
