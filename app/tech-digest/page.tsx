"use client";
// app/tech-digest/page.tsx
import { useState, useEffect, useCallback } from "react";
import { Newspaper, RefreshCw, ChevronRight, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface DigestSummary {
  id: string;
  title: string;
  summary: string;
  trending_tags: string[];
  created_at: string;
  week_number: number;
  year: number;
}

function SkeletonCard() {
  return (
    <div className="rounded-[12px] [box-shadow:var(--shadow-card)] overflow-hidden bg-[var(--bg-surface)] p-6 space-y-3">
      <div className="skeleton h-4 w-20 rounded-[4px]" />
      <div className="skeleton h-6 w-3/4 rounded-[4px]" />
      <div className="skeleton h-4 w-full rounded-[4px]" />
      <div className="skeleton h-4 w-2/3 rounded-[4px]" />
    </div>
  );
}

export default function TechDigestPage() {
  const [digests, setDigests] = useState<DigestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchDigests = useCallback(async () => {
    try {
      const res = await fetch("/api/tech-digest");
      const json = await res.json();
      setDigests(json.data?.digests ?? []);
    } catch {
      toast.error("Không thể tải danh sách digest");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDigests();
  }, [fetchDigests]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/tech-digest", { method: "POST" });
      const json = await res.json();
      if (json.statusCode === 201) {
        toast.success("Đã tạo digest mới!");
        await fetchDigests();
      } else {
        toast.error(json.message || "Tạo digest thất bại");
      }
    } catch {
      toast.error("Lỗi kết nối, vui lòng thử lại");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="px-8 py-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 animate-fade-up">
        <div>
          <Badge variant="digest" className="mb-3">
            <Newspaper className="w-3 h-3 mr-1" aria-hidden="true" />
            AI Tech Digest
          </Badge>
          <h1 className="text-[32px] font-[600] leading-[1.25] tracking-[-0.04em] text-[var(--fg-primary)] mb-2">
            Công nghệ tuần này
          </h1>
          <p className="text-[15px] text-[var(--fg-secondary)] leading-[1.5]">
            AI tự tổng hợp các xu hướng công nghệ nổi bật · 2 lần/tuần
          </p>
        </div>

        <Button
          id="btn-generate-digest"
          variant="secondary"
          size="default"
          onClick={handleGenerate}
          disabled={generating}
          className="shrink-0 mt-1"
          aria-label="Tạo digest mới ngay"
        >
          <RefreshCw
            className={`w-4 h-4 ${generating ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {generating ? "Đang tạo..." : "Tạo mới"}
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
        </div>
      ) : digests.length === 0 ? (
        <Card featured className="animate-fade-up">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-14 h-14 rounded-[8px] gradient-digest flex items-center justify-center">
              <Newspaper className="w-7 h-7 text-white" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[18px] font-[600] tracking-[-0.02em] text-[var(--fg-primary)] mb-1">
                Chưa có digest nào
              </p>
              <p className="text-[14px] text-[var(--fg-secondary)]">
                Bấm &quot;Tạo mới&quot; để AI tổng hợp công nghệ tuần này.
              </p>
            </div>
            <Button
              id="btn-generate-first-digest"
              variant="gradient"
              size="lg"
              onClick={handleGenerate}
              disabled={generating}
            >
              <Zap className="w-4 h-4" aria-hidden="true" />
              {generating ? "Đang tạo..." : "Tạo digest đầu tiên"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {digests.map((digest, i) => (
            <Link key={digest.id} href={`/tech-digest/${digest.id}`} id={`digest-${digest.id}`}>
              <Card
                featured
                className="overflow-hidden transition-[box-shadow,transform] duration-[150ms] hover:translate-y-[-1px] cursor-pointer animate-fade-up group"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent className="p-6">
                  {/* Meta */}
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="digest">Tuần {digest.week_number}/{digest.year}</Badge>
                    <span className="text-[12px] text-[var(--fg-muted)]">
                      {formatRelativeDate(digest.created_at)}
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-[20px] font-[600] leading-[1.33] tracking-[-0.02em] text-[var(--fg-primary)] mb-2 group-hover:text-[var(--digest-color)] transition-colors duration-[150ms]">
                    {digest.title}
                  </h2>

                  {/* Summary */}
                  <p className="text-[14px] text-[var(--fg-secondary)] leading-[1.56] mb-4 line-clamp-2">
                    {digest.summary}
                  </p>

                  {/* Tags + arrow */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1.5">
                      {digest.trending_tags.slice(0, 5).map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] font-[500] px-2 py-0.5 rounded-[9999px] bg-[var(--bg-elevated)] text-[var(--fg-muted)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--fg-muted)] group-hover:translate-x-1 transition-transform duration-[150ms]" aria-hidden="true" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
