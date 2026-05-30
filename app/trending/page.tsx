"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Star, GitFork, RefreshCw, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

/* ─── Page ───────────────────────────────────────────────────── */
export default function TrendingPage() {
  const [data, setData] = useState<TrendingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetch("/api/trending")
      .then(r => r.json())
      .then(j => setData(j.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const r = await fetch("/api/trending", { method: "POST" });
      const j = await r.json();
      if (j.data) setData(j.data);
    } catch {}
    finally { setRefreshing(false); }
  }

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-8 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-[10px] bg-[#f5f5f5] dark:bg-[#1a1a1a] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] flex items-center justify-center"
            style={{ background: "hsl(340,75%,55%,0.12)", color: "hsl(340,75%,55%)" }}>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-[16px] md:text-[18px] font-bold text-[#171717] dark:text-[#f5f5f5] tracking-tight">
              GitHub Trending
            </h1>
            {data && (
              <p className="text-[11px] text-[#999]">
                Cập nhật: {new Date(data.scrapedAt).toLocaleString("vi-VN")}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-8 px-3 rounded-[7px] text-[12px] font-medium flex items-center gap-1.5 bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
        >
          {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {refreshing ? "Đang cập nhật..." : "Cập nhật"}
        </button>
      </div>

      {!data ? (
        <div className="rounded-[12px] bg-white dark:bg-[#111] p-8 text-center"
          style={{ boxShadow: "var(--shadow-card)" }}>
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-[#ccc] dark:text-[#444]" />
          <p className="text-[14px] font-medium text-[#555] dark:text-[#aaa] mb-1">Chưa có dữ liệu trending</p>
          <p className="text-[12px] text-[#999] mb-4">Bấm "Cập nhật" để scrape GitHub Trending lần đầu.</p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-9 px-4 rounded-[7px] text-[13px] font-medium bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
          >
            {refreshing ? "Đang scrape..." : "Scrape ngay"}
          </button>
        </div>
      ) : (
        <>
          {/* AI Summary */}
          {data.aiSummary && (
            <div className="rounded-[12px] bg-white dark:bg-[#111] p-4 md:p-5"
              style={{ boxShadow: "var(--shadow-card)" }}>
              <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] mb-3 flex items-center gap-1.5">
                <span className="inline-block w-5 h-5 rounded-[5px] text-[11px] flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, hsl(260,80%,60%), hsl(340,75%,55%))", color: "#fff" }}>
                  ✦
                </span>
                AI Insights
              </h2>
              <div className="text-[13px] leading-relaxed text-[#444] dark:text-[#bbb] whitespace-pre-wrap">
                {data.aiSummary}
              </div>
            </div>
          )}

          {/* Repos Grid */}
          <div>
            <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] mb-3">
              Top {data.repos.length} Repos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.repos.map((repo, idx) => (
                <a
                  key={repo.name}
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group rounded-[10px] bg-white dark:bg-[#111] p-4 transition-all duration-150 hover:translate-y-[-1px]"
                  style={{ boxShadow: "var(--shadow-card)" }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[11px] font-bold text-[#bbb] dark:text-[#555] tabular-nums shrink-0 w-5">
                        #{idx + 1}
                      </span>
                      <span className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] truncate group-hover:text-[hsl(340,75%,55%)] transition-colors">
                        {repo.name}
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-[#ccc] dark:text-[#444] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {(repo.aiSummary || repo.description) && (
                    <p className="text-[12px] text-[#777] dark:text-[#888] mb-3 line-clamp-2 leading-relaxed">
                      {repo.aiSummary || repo.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 flex-wrap">
                    {repo.language && (
                      <span className="flex items-center gap-1 text-[11px] text-[#777] dark:text-[#888]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: repo.languageColor }} />
                        {repo.language}
                      </span>
                    )}
                    {repo.starsToday > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] font-medium text-amber-500">
                        <Star className="w-3 h-3" />
                        +{repo.starsToday.toLocaleString()}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5 text-[11px] text-[#999]">
                      <Star className="w-3 h-3" />
                      {repo.totalStars.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-0.5 text-[11px] text-[#999]">
                      <GitFork className="w-3 h-3" />
                      {repo.forks.toLocaleString()}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
