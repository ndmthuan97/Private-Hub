import { NextRequest } from "next/server";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq";
import { ok, badRequest, serverError } from "@/lib/api-response";

type Language = "en" | "jp";
type Action = "generate" | "review";

interface GenerateBody {
  action: "generate";
  language: Language;
  scenario: string;
}

interface ReviewBody {
  action: "review";
  language: Language;
  scenario: string;
  sourceText: string;
  userWriting: string;
}

type RequestBody = GenerateBody | ReviewBody;

function buildGeneratePrompt(language: Language, scenario: string): string {
  const langLabel = language === "en" ? "English" : "Japanese";

  return `You are a Vietnamese content creator. Your task is to write a paragraph in **Vietnamese** (150–300 words) that serves as source material for a ${langLabel} translation exercise.

Scenario/Context: ${scenario}

Rules:
1. Write ONLY in Vietnamese. The paragraph must feel natural and realistic.
2. The content should match the scenario — e.g., if "email chuyên nghiệp", write an actual professional email body in Vietnamese; if "TOEIC Part 7 Passage", write a passage that resembles a TOEIC reading comprehension text (but in Vietnamese).
3. Use diverse vocabulary and sentence structures appropriate for intermediate-to-advanced learners.
4. Include a brief context line at the top in this format:
   📌 **Ngữ cảnh:** [1-sentence description of the situation]
5. The main body should be 150–300 words. Do NOT include translation or any ${langLabel} text.
6. Make it engaging and realistic — avoid generic filler content.`;
}

function buildReviewPrompt(
  language: Language,
  scenario: string,
  sourceText: string,
  userWriting: string
): string {
  const langLabel = language === "en" ? "English" : "Japanese";
  const langCode = language === "en" ? "English" : "日本語";

  return `You are an expert ${langLabel} language teacher and translator. A student has translated a Vietnamese paragraph into ${langLabel}. Your job is to provide a comprehensive, constructive review.

**Scenario:** ${scenario}

**Original Vietnamese text:**
${sourceText}

**Student's ${langLabel} translation:**
${userWriting}

Provide your review in the following markdown format. Write explanations in Vietnamese so the student can understand easily:

## 📊 Đánh giá tổng quan
Give an overall assessment and a score from 1-10. Be encouraging but honest.

## ✅ Điểm tốt
List 2-3 things the student did well (good word choices, natural expressions, accurate grammar).

## ❌ Lỗi cần sửa
For each error found, use this format:
- **"[student's text]"** → **"[corrected text]"**
  - 💬 [Brief explanation in Vietnamese of why this is wrong and what the correct form is]

## 💡 Gợi ý cải thiện
Suggest 2-4 ways to make the writing more natural, idiomatic, or sophisticated. Include specific examples with collocations, idioms, or advanced expressions.

## 🔄 Paraphrase thay thế
Provide 3-5 alternative ways to express key sentences/phrases from the student's text. Format:
- **Original:** "[student's phrase]"
  - ➡️ "[alternative 1]" — [brief note on tone/register]
  - ➡️ "[alternative 2]" — [brief note on tone/register]

## 📝 Bản dịch tham khảo
Provide a complete, polished ${langCode} translation of the original Vietnamese text as a reference. This should be natural, fluent, and appropriate for the scenario context.

Rules:
1. Be thorough but constructive — the goal is to help the student improve.
2. If the student made very few errors, focus more on sophistication and style improvements.
3. All explanations should be in Vietnamese. All example translations/corrections should be in ${langLabel}.
4. The reference translation should be significantly different from the student's version to show alternative approaches.`;
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();

    if (!body.action || !body.language || !body.scenario) {
      return badRequest("Missing required fields: action, language, scenario");
    }

    const groq = getGroqClient();

    if (body.action === "generate") {
      const systemPrompt = buildGeneratePrompt(body.language, body.scenario);

      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.8,
        max_tokens: 800,
      });

      const text = completion.choices[0]?.message?.content ?? "";
      return ok({ text });
    }

    if (body.action === "review") {
      const { sourceText, userWriting } = body as ReviewBody;

      if (!sourceText || !userWriting) {
        return badRequest("Missing required fields: sourceText, userWriting");
      }

      const systemPrompt = buildReviewPrompt(
        body.language,
        body.scenario,
        sourceText,
        userWriting
      );

      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: "system", content: systemPrompt }],
        temperature: 0.5,
        max_tokens: 2000,
      });

      const review = completion.choices[0]?.message?.content ?? "";
      return ok({ review });
    }

    return badRequest("Invalid action. Must be 'generate' or 'review'.");
  } catch (err) {
    console.error("[writing/route] error:", err);
    return serverError("Failed to process writing request", err);
  }
}
