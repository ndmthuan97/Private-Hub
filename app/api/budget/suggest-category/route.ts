import { NextRequest, NextResponse } from "next/server";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const { name } = await req.json() as { name: string };
  if (!name?.trim()) {
    return NextResponse.json({ emoji: "💡", color: "#6366f1" });
  }
  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{
        role: "user",
        content: `Gợi ý 1 emoji phù hợp và 1 màu hex tươi sáng cho hạng mục chi tiêu tên "${name.trim()}".
Trả về JSON: {"emoji":"...","color":"#xxxxxx"}
Chỉ JSON, không text khác.`,
      }],
      temperature: 0.7,
      max_tokens: 40,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { emoji?: string; color?: string };
    return NextResponse.json({
      emoji: parsed.emoji ?? "💡",
      color: /^#[0-9a-f]{6}$/i.test(parsed.color ?? "") ? parsed.color : "#6366f1",
    });
  } catch {
    return NextResponse.json({ emoji: "💡", color: "#6366f1" });
  }
}
