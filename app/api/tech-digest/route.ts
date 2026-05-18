// app/api/tech-digest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getGroqClient, GROQ_MODEL } from "@/lib/groq";
import { getDb, techDigests } from "@/db";
import { desc } from "drizzle-orm";

// Vercel Cron auth check
function isAuthorizedCron(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

interface DigestHighlight {
  title: string;
  description: string;
  tags: string[];
  impact: "high" | "medium" | "low";
}

interface DigestAIOutput {
  title: string;
  summary: string;
  highlights: DigestHighlight[];
  trending_tags: string[];
}

const DIGEST_PROMPT = `Bạn là một tech journalist hàng đầu chuyên tổng hợp tin công nghệ cho developers Việt Nam.

Hãy tạo một bản Tech Digest ngắn gọn về các công nghệ và sự kiện nổi bật trong tuần này (${new Date().toLocaleDateString("vi-VN")}).

Tập trung vào: AI/ML, Web Development, Cloud, Open Source, Programming Languages, DevOps, Mobile.

Trả về ĐÚNG định dạng JSON sau (không có text ngoài JSON):
{
  "title": "Chuỗi tiêu đề hấp dẫn cho tuần này",
  "summary": "Tóm tắt 2-3 câu về tuần công nghệ này",
  "highlights": [
    {
      "title": "Tên công nghệ/sự kiện",
      "description": "Mô tả 2-3 câu, giải thích rõ tại sao quan trọng",
      "tags": ["tag1", "tag2"],
      "impact": "high|medium|low"
    }
  ],
  "trending_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Yêu cầu:
- 5-8 highlights đa dạng (không chỉ AI)
- Mô tả bằng tiếng Việt, tên công nghệ giữ nguyên tiếng Anh
- trending_tags: 5-8 tags ngắn gọn`;

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// GET /api/tech-digest — list digests
export async function GET() {
  try {
    const db = getDb();
    const rows = await db
      .select({
        id:          techDigests.id,
        title:       techDigests.title,
        summary:     techDigests.summary,
        trendingTags: techDigests.trendingTags,
        createdAt:   techDigests.createdAt,
        weekNumber:  techDigests.weekNumber,
        year:        techDigests.year,
      })
      .from(techDigests)
      .orderBy(desc(techDigests.createdAt))
      .limit(20);

    return NextResponse.json({
      statusCode: 200,
      message: "OK",
      data: { digests: rows },
      errors: null,
    });
  } catch (err) {
    console.error("[tech-digest GET]", err);
    return NextResponse.json(
      { statusCode: 500, message: "Failed to fetch digests", data: null, errors: null },
      { status: 500 }
    );
  }
}

// POST /api/tech-digest — generate new digest (cron or manual)
export async function POST(req: NextRequest) {
  const isCron =
    req.headers.get("x-vercel-cron") === "1" || isAuthorizedCron(req);
  const now = new Date();

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: DIGEST_PROMPT }],
      temperature: 0.8,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<DigestAIOutput>;

    if (!parsed.title || !parsed.highlights?.length) {
      return NextResponse.json(
        { statusCode: 422, message: "AI returned invalid format", data: null, errors: { raw } },
        { status: 422 }
      );
    }

    const db = getDb();
    const [inserted] = await db
      .insert(techDigests)
      .values({
        title:           parsed.title,
        summary:         parsed.summary ?? "",
        highlights:      parsed.highlights,
        trendingTags:    parsed.trending_tags ?? [],
        weekNumber:      getWeekNumber(now),
        year:            now.getFullYear(),
        generatedByCron: isCron,
      })
      .returning();

    return NextResponse.json(
      { statusCode: 201, message: "Digest created", data: { digest: inserted }, errors: null },
      { status: 201 }
    );
  } catch (err) {
    console.error("[tech-digest POST]", err);
    return NextResponse.json(
      { statusCode: 500, message: "Failed to generate digest", data: null, errors: null },
      { status: 500 }
    );
  }
}
