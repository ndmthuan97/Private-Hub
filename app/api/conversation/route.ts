// app/api/conversation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq";

type Language = "en" | "jp";
type Persona = "teacher" | "friend" | "business";
type JlptLevel = "N5" | "N4" | "N3";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: Message[];
  language: Language;
  persona: Persona;
  scenario: string;
  jlptLevel?: JlptLevel;
}

function buildSystemPrompt(
  language: Language,
  persona: Persona,
  scenario: string,
  jlptLevel: JlptLevel = "N4"
): string {
  const personaMap: Record<Persona, string> = {
    teacher: language === "en"
      ? "You are a patient English teacher named Alex."
      : "あなたは丁寧な日本語の先生です。名前はさくら先生です。",
    friend: language === "en"
      ? "You are a friendly native English speaker named Alex."
      : "あなたは気さくな日本人の友達です。名前はケンです。",
    business: language === "en"
      ? "You are a professional business English coach named Alex."
      : "あなたはビジネス日本語のコーチです。敬語を使って会話してください。",
  };

  if (language === "en") {
    return `${personaMap[persona]}

Scenario: ${scenario}

Rules:
1. Respond ONLY in English. Keep responses conversational (2-4 sentences).
2. After your response, if the user made grammatical errors, append a section starting exactly with "💡 Correction:" and briefly explain the correct form. If no errors, skip this section.
3. Occasionally ask a follow-up question to keep the conversation flowing.
4. Be encouraging and supportive.
5. If there are no previous messages, YOU MUST start the conversation first — greet the user and introduce the scenario naturally.`;
  }

  // Japanese with romaji + Vietnamese translation
  return `${personaMap[persona]}

シナリオ: ${scenario}

ルール:
1. 日本語のみで返答してください。JLPT ${jlptLevel}レベルの語彙を使ってください。
2. 返答は2〜4文にしてください。
3. 返答の後、以下のフォーマットで必ず追加してください：
   📖 ローマ字: [Romanized Japanese of your response]
   🇻🇳 Dịch: [Vietnamese translation of your response]
4. ユーザーが文法的な間違いをした場合、"💡 Sửa lỗi:" で始まるセクションを追加して、正しい形を簡単に説明してください（ベトナム語で）。
5. 時々、会話を続けるための質問をしてください。
6. メッセージがまだない場合、あなたが会話を始めてください — 挨拶して、シナリオを自然に紹介してください。`;
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { messages, language, persona, scenario, jlptLevel } = body;

    // Allow empty messages array — AI will initiate the conversation
    if (!Array.isArray(messages) || !language || !persona || !scenario) {
      return NextResponse.json({
        statusCode: 400,
        message: "Missing required fields: language, persona, scenario",
        data: null,
        errors: null,
      }, { status: 400 });
    }

    const groq = getGroqClient();
    const systemPrompt = buildSystemPrompt(language, persona, scenario, jlptLevel);

    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    const reply = completion.choices[0]?.message?.content ?? "";

    return NextResponse.json({
      statusCode: 200,
      message: "OK",
      data: { reply },
      errors: null,
    });
  } catch (err) {
    console.error("[conversation/route] error:", err);
    return NextResponse.json({
      statusCode: 500,
      message: "Internal server error",
      data: null,
      errors: null,
    }, { status: 500 });
  }
}
