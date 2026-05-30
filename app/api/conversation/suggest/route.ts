import { NextRequest, NextResponse } from "next/server";
import { ok, badRequest, serverError } from "@/lib/api-response";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";

type Language = "en" | "jp";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: Message[];
  language: Language;
  scenario: string;
}

function buildSuggestionPrompt(language: Language, scenario: string): string {
  if (language === "en") {
    return `You are a helpful assistant for an English conversation practice app.

Scenario: ${scenario}

Based on the conversation history below, generate exactly 3 short reply suggestions that the LEARNER could say next. Each suggestion should:
- Be natural and contextually appropriate
- Be 1-2 sentences long
- Vary in tone/approach (e.g., one question, one statement, one creative response)

Respond ONLY with a valid JSON array of 3 strings. No markdown, no explanation.
Example: ["suggestion 1", "suggestion 2", "suggestion 3"]`;
  }

  return `You are a helpful assistant for a Japanese conversation practice app.

Scenario: ${scenario}

Based on the conversation history below, generate exactly 3 short reply suggestions that the LEARNER could say next in Japanese. Each suggestion should:
- Be natural and contextually appropriate
- Use simple Japanese suitable for learners
- Be 1-2 sentences long
- Vary in tone/approach

Respond ONLY with a valid JSON array of 3 strings in Japanese. No markdown, no explanation.
Example: ["日本語の提案1", "日本語の提案2", "日本語の提案3"]`;
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const { messages, language, scenario } = body;

    if (!Array.isArray(messages) || messages.length === 0 || !language || !scenario) {
      return badRequest("Missing required fields");
    }

    const gemini = getGeminiClient();
    const systemPrompt = buildSuggestionPrompt(language, scenario);

    // Build conversation context for Gemini
    const conversationContext = messages
      .slice(-6) // Only send last 6 messages to save tokens
      .map((m) => `${m.role === "user" ? "Learner" : "AI"}: ${m.content}`)
      .join("\n\n");

    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: `${systemPrompt}\n\n--- Conversation History ---\n${conversationContext}`,
      config: {
        temperature: 0.8,
        maxOutputTokens: 400,
        // Force JSON output for clean parsing
        responseMimeType: "application/json",
        // Disable thinking to avoid extra tokens in output
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const text = response.text ?? "";

    // Parse JSON array from Gemini response
    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(text);
      // Handle both array and object formats
      if (Array.isArray(parsed)) {
        suggestions = parsed;
      } else if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions;
      } else {
        // Try to extract any string array from the object
        const values = Object.values(parsed).flat();
        suggestions = values.filter((v): v is string => typeof v === "string");
      }
      suggestions = suggestions.slice(0, 3).map((s) => String(s).trim()).filter(Boolean);
    } catch {
      // Fallback: strip fences, try again
      const cleaned = text.replace(/```(?:json)?\s*/g, "").replace(/```/g, "").trim();
      try {
        const arr = JSON.parse(cleaned);
        suggestions = (Array.isArray(arr) ? arr : []).slice(0, 3).map(String);
      } catch {
        // Last resort: split by newlines
        suggestions = text
          .split("\n")
          .map((s) => s.replace(/^\d+[.\)]\s*/, "").replace(/^["']|["']$/g, "").trim())
          .filter((s) => s.length > 3)
          .slice(0, 3);
      }
    }

    return ok({ suggestions });
  } catch (err: unknown) {
    // Detect Gemini rate limit (429) errors
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("quota")) {
      return NextResponse.json(
        { statusCode: 429, message: "Gemini đang bị giới hạn tốc độ. Vui lòng thử lại sau 1 phút.", data: null, errors: null },
        { status: 429 }
      );
    }

    return serverError("Internal server error", err);
  }
}
