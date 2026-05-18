"use client";
// app/tech-digest/[id]/page.tsx
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface DigestHighlight {
  title: string;
  description: string;
  tags: string[];
  impact: "high" | "medium" | "low";
}

interface Digest {
  id: string;
  title: string;
  summary: string;
  highlights: DigestHighlight[];
  trending_tags: string[];
  created_at: string;
  week_number: number;
  year: number;
}

const IMPACT_CONFIG = {
  high:   { label: "Quan trọng", color: "text-[hsl(0,84%,65%)]",   bg: "bg-[hsl(0,84%,60%,0.10)]" },
  medium: { label: "Đáng chú ý", color: "text-[hsl(38,92%,60%)]", bg: "bg-[hsl(38,92%,52%,0.10)]" },
  low:    { label: "Thú vị",     color: "text-[var(--fg-muted)]",  bg: "bg-[var(--bg-elevated)]" },
};

function SkeletonDetail() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-8 w-2/3 rounded-[4px]" />
      <div className="skeleton h-5 w-full rounded-[4px]" />
      <div className="skeleton h-5 w-4/5 rounded-[4px]" />
      {[1, 2, 3, 4].map((n) => (
        <div key={n} className="rounded-[8px] [box-shadow:var(--shadow-card)] p-5 space-y-2 bg-[var(--bg-surface)]">
          <div className="skeleton h-5 w-1/2 rounded-[4px]" />
          <div className="skeleton h-4 w-full rounded-[4px]" />
          <div className="skeleton h-4 w-3/4 rounded-[4px]" />
        </div>
      ))}
    </div>
  );
}

export default function DigestDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [digest, setDigest] = useState<Digest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/tech-digest/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.statusCode === 200) {
          setDigest(json.data.digest);
        } else {
          toast.error("Không tìm thấy digest");
        }
      })
      .catch(() => toast.error("Lỗi tải dữ liệu"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="px-8 py-10 max-w-3xl mx-auto">
      {/* Back */}
      <div className="mb-6 animate-fade-up">
        <Button asChild variant="ghost" size="sm" id="btn-back-digest">
          <Link href="/tech-digest">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Quay lại
          </Link>
        </Button>
      </div>

      {loading ? (
        <SkeletonDetail />
      ) : !digest ? (
        <p className="text-[var(--fg-muted)]">Không tìm thấy digest.</p>
      ) : (
        <>
          {/* Header */}
          <div className="mb-8 animate-fade-up">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="digest">Tuần {digest.week_number}/{digest.year}</Badge>
              <span className="text-[12px] text-[var(--fg-muted)]">
                {formatDate(digest.created_at)}
              </span>
            </div>
            <h1 className="text-[32px] font-[600] leading-[1.25] tracking-[-0.04em] text-[var(--fg-primary)] mb-4">
              {digest.title}
            </h1>
            <p className="text-[17px] font-[400] leading-[1.65] text-[var(--fg-secondary)]">
              {digest.summary}
            </p>
          </div>

          {/* Trending tags */}
          {digest.trending_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-8 animate-fade-up" style={{ animationDelay: "60ms" }}>
              <TrendingUp className="w-4 h-4 text-[var(--fg-muted)] shrink-0 mt-0.5" aria-hidden="true" />
              {digest.trending_tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[12px] font-[500] px-2.5 py-0.5 rounded-[9999px] [box-shadow:var(--shadow-border)] text-[var(--fg-secondary)] bg-[var(--bg-elevated)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Highlights */}
          <div className="space-y-3">
            {digest.highlights.map((h, i) => {
              const impact = IMPACT_CONFIG[h.impact] ?? IMPACT_CONFIG.low;
              return (
                <Card
                  key={i}
                  className="animate-fade-up"
                  style={{ animationDelay: `${80 + i * 50}ms` }}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-1 self-stretch rounded-full shrink-0 ${
                          h.impact === "high"
                            ? "bg-[hsl(0,84%,60%)]"
                            : h.impact === "medium"
                            ? "bg-[hsl(38,92%,52%)]"
                            : "bg-[var(--fg-muted)]"
                        }`}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h2 className="text-[16px] font-[600] tracking-[-0.02em] text-[var(--fg-primary)]">
                            {h.title}
                          </h2>
                          <span className={`text-[11px] font-[500] px-2 py-0.5 rounded-[9999px] ${impact.bg} ${impact.color}`}>
                            {impact.label}
                          </span>
                        </div>
                        <p className="text-[14px] leading-[1.65] text-[var(--fg-secondary)] mb-3">
                          {h.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {h.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[11px] font-[500] px-2 py-0.5 rounded-[9999px] bg-[var(--brand-bg)] text-[var(--brand)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
