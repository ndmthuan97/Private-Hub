import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";
import { getGeminiClient, GEMINI_MODEL } from "@/lib/gemini";
import { ok, serverError } from "@/lib/api-response";

const REDIS_KEY = "ph:trending:daily";
const TTL_SECONDS = 24 * 60 * 60; // 24h

/* ─── Types ──────────────────────────────────────────────────── */
interface TrendingRepo {
  name: string;
  url: string;
  description: string;
  language: string;
  languageColor: string;
  starsToday: number;
  totalStars: number;
  forks: number;
  aiSummary?: string;
}

interface TrendingData {
  date: string;
  repos: TrendingRepo[];
  aiSummary: string;
  scrapedAt: string;
}

/* ─── GET — read cached trending data ────────────────────────── */
export async function GET() {
  try {
    const raw = await redis.get(REDIS_KEY);
    if (!raw) return ok(null, "No trending data available");
    const data: TrendingData = JSON.parse(raw as string);
    return ok(data);
  } catch (err) {
    return serverError("Failed to load trending data", err);
  }
}

/* ─── POST — scrape + AI summarize (called by Vercel Cron) ──── */
export async function POST(req: NextRequest) {
  try {
    // Validate cron secret in production
    if (process.env.NODE_ENV === "production") {
      const authHeader = req.headers.get("authorization");
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // Step 1: Scrape GitHub Trending
    const repos = await scrapeGitHubTrending();
    if (repos.length === 0) {
      return serverError("Failed to scrape any repos from GitHub Trending");
    }

    // Step 2: AI Summarize via Gemini
    const { overview, repoSummaries } = await generateAISummary(repos);

    // Merge per-repo AI summaries
    for (const repo of repos) {
      repo.aiSummary = repoSummaries[repo.name] ?? "";
    }

    // Step 3: Save to Redis with 24h TTL
    const today = new Date().toISOString().slice(0, 10);
    const data: TrendingData = {
      date: today,
      repos,
      aiSummary: overview,
      scrapedAt: new Date().toISOString(),
    };

    await redis.set(REDIS_KEY, JSON.stringify(data), "EX", TTL_SECONDS);

    return ok(data, `Scraped ${repos.length} repos`);
  } catch (err) {
    return serverError("Failed to scrape trending", err);
  }
}

/* ─── Scraper ────────────────────────────────────────────────── */
async function scrapeGitHubTrending(): Promise<TrendingRepo[]> {
  const res = await fetch("https://github.com/trending", {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "text/html",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  const html = await res.text();

  const repos: TrendingRepo[] = [];

  // Parse each <article> block from the trending page
  const articleRegex = /<article[^>]*class="Box-row"[^>]*>([\s\S]*?)<\/article>/g;
  let match: RegExpExecArray | null;

  while ((match = articleRegex.exec(html)) !== null) {
    const block = match[1];

    // Repo name from <h2> heading link: href="/owner/repo"
    const nameMatch = block.match(/<h2[^>]*>[\s\S]*?href="\/([^"?]+)"[\s\S]*?<\/h2>/);
    const name = nameMatch?.[1]?.trim() ?? "";
    if (!name || name.split("/").length !== 2) continue;

    // Description from <p class="col-9 ...">
    const descMatch = block.match(/<p[^>]*class="[^"]*col-9[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    const description = descMatch?.[1]?.replace(/<[^>]*>/g, "").trim() ?? "";

    // Language + color
    const langMatch = block.match(/<span[^>]*itemprop="programmingLanguage"[^>]*>([\s\S]*?)<\/span>/);
    const language = langMatch?.[1]?.trim() ?? "";
    const langColorMatch = block.match(/background-color:\s*(#[a-fA-F0-9]+)/);
    const languageColor = langColorMatch?.[1] ?? "#666";

    // Total stars — stargazers link contains the count
    const starsMatch = block.match(/\/stargazers"[\s\S]*?>([\s\S]*?)<\/a>/);
    const starsText = starsMatch?.[1]?.replace(/<[^>]*>/g, "").trim() ?? "0";
    const totalStars = parseInt(starsText.replace(/,/g, ""), 10) || 0;

    // Forks
    const forksMatch = block.match(/\/forks"[\s\S]*?>([\s\S]*?)<\/a>/);
    const forksText = forksMatch?.[1]?.replace(/<[^>]*>/g, "").trim() ?? "0";
    const forks = parseInt(forksText.replace(/,/g, ""), 10) || 0;

    // Stars today
    const todayMatch = block.match(/([\d,]+)\s*stars?\s*today/i);
    const starsToday = parseInt((todayMatch?.[1] ?? "0").replace(/,/g, ""), 10);

    repos.push({
      name,
      url: `https://github.com/${name}`,
      description,
      language,
      languageColor,
      starsToday,
      totalStars,
      forks,
    });
  }

  return repos.slice(0, 25);
}

/* ─── AI Summary ───────────────────────────────────────────────── */
async function generateAISummary(repos: TrendingRepo[]): Promise<{ overview: string; repoSummaries: Record<string, string> }> {
  const client = getGeminiClient();

  const repoList = repos
    .slice(0, 20)
    .map((r, i) => `${i + 1}. ${r.name} (${r.language || "N/A"}) — ${r.starsToday} stars today, ${r.totalStars} total\n   ${r.description}`)
    .join("\n");

  const prompt = `Analyze these GitHub Trending repos. Return a JSON object with:
1. "overview": A concise Vietnamese summary (2-3 sentences MAX). Identify the main trend themes today (AI, DevTools, etc.) and 1-2 standout projects. No lengthy paragraphs.
2. "repoSummaries": An object where each key is the repo name ("owner/repo") and value is a ONE-LINE Vietnamese description of what the project does and why it’s useful (max 15 words).

Return ONLY valid JSON, no markdown fences.

${repoList}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const text = (response.text ?? "").trim();
    // Strip markdown code fences if present
    const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(jsonStr);
    return {
      overview: parsed.overview ?? "",
      repoSummaries: parsed.repoSummaries ?? {},
    };
  } catch {
    return { overview: "⚠️ Không thể tạo AI summary.", repoSummaries: {} };
  }
}
