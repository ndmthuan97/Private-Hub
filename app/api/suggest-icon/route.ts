import { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq";

// Curated set of Lucide icons available in the sidebar
const AVAILABLE_ICONS = [
  "Globe", "Code", "Music", "Video", "Image", "FileText",
  "Database", "Cloud", "ShoppingBag", "Gamepad2", "GraduationCap",
  "Heart", "Star", "Rocket", "Zap", "Coffee", "Briefcase",
  "Palette", "Newspaper", "Link", "BookOpen", "Camera",
  "MessageCircle", "Mail", "Map", "Calculator", "Headphones",
  "Shield", "Terminal", "Search", "Home", "Settings",
  "Users", "TrendingUp", "BarChart3", "Wrench", "Cpu",
  "Smartphone", "Monitor", "Wifi", "Lock",
];

export async function POST(req: NextRequest) {
  try {
    const { url, label } = await req.json();
    if (!url && !label) {
      return ok({ icon: "Globe" });
    }

    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: `You are an icon matcher. Given a website URL and/or label, pick the SINGLE most appropriate icon name from this list: ${AVAILABLE_ICONS.join(", ")}. Reply with ONLY the icon name, nothing else.`,
        },
        {
          role: "user",
          content: `URL: ${url || "N/A"}\nLabel: ${label || "N/A"}`,
        },
      ],
      temperature: 0,
      max_tokens: 20,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "Globe";
    // Validate the response is in our list
    const icon = AVAILABLE_ICONS.includes(raw) ? raw : "Globe";

    return ok({ icon });
  } catch {
    return ok({ icon: "Globe" }, "Fallback");
  }
}
