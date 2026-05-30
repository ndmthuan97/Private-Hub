"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageCircle, Wallet, BookA, Headphones, PenLine, Languages,
  Map, CalendarDays, BookOpen, Settings, BookCheck,
  FileText, ArrowUpRight, ChevronDown, TrendingUp, Star,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ─── Types ───────────────────────────────────────────────────── */
type MonthEntry = {
  month: number; total: number; spent: number; remaining: number;
  allocations: Alloc[];
};

type DashboardData = {
  vocab:      { totalWords: number; learnedWords: number; topicCount: number };
  budget: {
    currentMonth: number; currentYear: number; selectedYear: number;
    availableYears: number[];
    currentMonthTotal: number; currentMonthSpent: number; currentMonthRemaining: number;
    months: MonthEntry[];
  };
  strategy:   { totalItems: number };
  notebooklm: { totalPrompts: number };
};

type Alloc = { key: string; label: string; emoji: string; color: string; percentage: number; amount: number; spent?: number };

/* ─── Helpers ──────────────────────────────────────────────────── */
function formatVND(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("vi-VN");
}

const MONTH_LABELS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ─── Month Colors (12 unique hues) ──────────────────────────── */
const MONTH_COLORS = [
  "",
  "hsl(350,75%,55%)", "hsl(15,85%,55%)",  "hsl(38,92%,52%)",
  "hsl(55,80%,48%)",  "hsl(95,65%,45%)",  "hsl(150,65%,42%)",
  "hsl(175,70%,40%)", "hsl(200,80%,50%)", "hsl(225,75%,58%)",
  "hsl(260,70%,60%)", "hsl(285,60%,55%)", "hsl(320,65%,52%)",
];

/* ─── Shortcuts ─────────────────────────────────────────────────── */
const SHORTCUTS = [
  { href: "/conversation", label: "Giao Tiếp",  icon: MessageCircle, color: "hsl(160,84%,42%)" },
  { href: "/vocab",        label: "Từ Vựng",     icon: BookA,         color: "hsl(239,84%,67%)" },
  { href: "/dictation",    label: "Dictation",   icon: Headphones,    color: "hsl(160,84%,42%)" },
  { href: "/writing",      label: "Luyện Viết",  icon: PenLine,       color: "hsl(24,95%,53%)" },
  { href: "/translation",  label: "Luyện Dịch",  icon: Languages,     color: "hsl(24,95%,53%)" },
  { href: "/budget",       label: "Ngân Sách",   icon: Wallet,        color: "hsl(38,92%,52%)" },
  { href: "/strategy",     label: "Strategy",    icon: Map,           color: "hsl(262,83%,58%)" },
  { href: "/calendar",     label: "Calendar",    icon: CalendarDays,  color: "hsl(217,91%,60%)" },
  { href: "/notebooklm",   label: "NotebookLM",  icon: BookOpen,      color: "hsl(217,91%,60%)" },
  { href: "/settings",     label: "Cài đặt",     icon: Settings,      color: "#888" },
];

const CALENDAR_EMBED = "https://calendar.google.com/calendar/embed?src=ndmthuan.97%40gmail.com&ctz=Asia%2FHo_Chi_Minh&mode=AGENDA&showTitle=0&showNav=0&showTabs=0&showCalendars=0&showPrint=0";

/* ─── Dashboard Page ────────────────────────────────────────────── */
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [budgetYear, setBudgetYear] = useState<number>(new Date().getFullYear());

  const loadData = useCallback((year: number) => {
    fetch(`/api/dashboard?year=${year}`)
      .then(r => r.json())
      .then(j => { if (j.data) setData(j.data); })
      .catch(() => {});
  }, []);

  useEffect(() => { loadData(budgetYear); }, [budgetYear, loadData]);

  function handleYearChange(year: number) {
    setBudgetYear(year);
  }

  const today = new Date();
  const dateStr = today.toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="px-4 py-5 md:px-8 md:py-6 space-y-5 md:space-y-6">
      {/* ── Quick Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={BookCheck}
          iconColor="hsl(239,84%,67%)"
          label="Từ vựng"
          value={data ? `${data.vocab.learnedWords}/${data.vocab.totalWords}` : "—"}
          sub={data ? `${data.vocab.topicCount} chủ đề` : ""}
          href="/vocab"
        />
        <StatCard
          icon={Wallet}
          iconColor="hsl(38,92%,52%)"
          label={data ? `${MONTH_LABELS[data.budget.currentMonth]}/${data.budget.currentYear}` : "Ngân sách"}
          value={data ? formatVND(data.budget.currentMonthRemaining) : "—"}
          sub={data && data.budget.currentMonthTotal > 0 ? `Đã chi ${formatVND(data.budget.currentMonthSpent)}` : "Chưa nạp"}
          href="/budget"
        />
        <StatCard
          icon={FileText}
          iconColor="hsl(262,83%,58%)"
          label="Strategy"
          value={data ? `${data.strategy.totalItems}` : "—"}
          sub="tài liệu"
          href="/strategy"
        />
        <StatCard
          icon={BookOpen}
          iconColor="hsl(217,91%,60%)"
          label="NotebookLM"
          value={data ? `${data.notebooklm.totalPrompts}` : "—"}
          sub="prompts"
          href="/notebooklm"
        />
      </div>

      {/* ── Trending Widget ──────────────────────────────────── */}
      <TrendingWidget />

      {/* ── Budget Chart ────────────────────────────────────── */}
      <BudgetWidget data={data} budgetYear={budgetYear} onYearChange={handleYearChange} />
    </div>
  );
}

/* ─── Stat Card ───────────────────────────────────────────────── */
function StatCard({ icon: Icon, iconColor, label, value, sub, href }: {
  icon: typeof BookA; iconColor: string; label: string; value: string; sub: string; href: string;
}) {
  return (
    <Link href={href}
      className="rounded-[12px] bg-white dark:bg-[#111] p-3.5 md:p-4 group transition-all duration-150 hover:translate-y-[-2px]"
      style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0"
          style={{ background: `${iconColor}15`, color: iconColor }}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[11px] font-medium text-[#999] uppercase tracking-wide truncate">{label}</span>
      </div>
      <p className="text-[20px] md:text-[22px] font-bold text-[#171717] dark:text-[#f5f5f5] tracking-tight leading-none mb-0.5">
        {value}
      </p>
      <p className="text-[11px] text-[#999]">{sub}</p>
    </Link>
  );
}

/* ─── Budget Widget ───────────────────────────────────────────── */
function BudgetWidget({ data, budgetYear, onYearChange }: {
  data: DashboardData | null; budgetYear: number; onYearChange: (y: number) => void;
}) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const activeEntry = selectedMonth
    ? data?.budget.months.find(m => m.month === selectedMonth) ?? null
    : null;
  const maxTotal = data ? Math.max(...data.budget.months.map(m => m.total), 1) : 1;

  // Gridline ticks (4 horizontal lines)
  const gridLines = [0.25, 0.5, 0.75, 1].map(pct => ({
    value: maxTotal * pct,
    pct: pct * 100,
  }));

  return (
    <div className="rounded-[12px] bg-white dark:bg-[#111] p-4 md:p-5"
      style={{ boxShadow: "var(--shadow-card)" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Ngân sách</h2>
          {data && data.budget.availableYears.length > 0 && (
            <div className="relative">
              <select
                value={budgetYear}
                onChange={e => { onYearChange(Number(e.target.value)); setSelectedMonth(null); }}
                className="appearance-none text-[11px] font-medium text-[#666] dark:text-[#aaa] bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-[5px] pl-2 pr-6 py-1 cursor-pointer outline-none"
              >
                {data.budget.availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#999] pointer-events-none" />
            </div>
          )}
        </div>
        <Link href="/budget" className="text-[11px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors flex items-center gap-0.5">
          Xem đầy đủ <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Chart: Y-axis + bars + gridlines */}
      <div className="flex">
        {/* Y-axis labels */}
        <div className="flex flex-col-reverse justify-between pr-3 h-[180px] md:h-[220px] shrink-0 py-0.5 w-[44px] md:w-[52px]">
          <span className="text-[10px] md:text-[11px] font-medium text-[#999] dark:text-[#666] leading-none text-right">0</span>
          {gridLines.map(g => (
            <span key={g.pct} className="text-[10px] md:text-[11px] font-medium text-[#999] dark:text-[#666] leading-none text-right">
              {formatVND(g.value)}
            </span>
          ))}
        </div>

        {/* Chart body */}
        <div className="flex-1 min-w-0 relative h-[180px] md:h-[220px]">
          {/* Horizontal gridlines */}
          {gridLines.map(g => (
            <div
              key={g.pct}
              className="absolute left-0 right-0 border-t border-dashed border-[#eee] dark:border-[#222]"
              style={{ bottom: `${g.pct}%` }}
            />
          ))}
          <div className="absolute left-0 right-0 bottom-0 border-t border-[#e0e0e0] dark:border-[#333]" />

          {/* Bars */}
          <div className="flex items-end gap-1 md:gap-2 h-full relative z-10">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
              const entry = data?.budget.months.find(e => e.month === m);
              const total = entry?.total ?? 0;
              const spent = entry?.spent ?? 0;
              const barH = total > 0 ? Math.max(4, (total / maxTotal) * 100) : 0;
              const isActive = m === selectedMonth;
              const color = MONTH_COLORS[m];

              return (
                <button
                  key={m}
                  onClick={() => entry && setSelectedMonth(isActive ? null : m)}
                  className={cn(
                    "flex-1 flex flex-col items-center cursor-pointer transition-all group relative h-full",
                    !entry && "opacity-15 cursor-default"
                  )}
                >
                  {/* Value tooltip on active bar */}
                  {total > 0 && isActive && (
                    <span
                      className="absolute text-[9px] font-semibold text-[#171717] dark:text-[#f5f5f5] whitespace-nowrap z-20"
                      style={{ bottom: `${barH + 2}%` }}
                    >
                      {formatVND(total)}
                    </span>
                  )}

                  <div className="w-full flex flex-col justify-end h-full">
                    <div
                      className={cn(
                        "w-full rounded-t-[4px] transition-all duration-300 relative overflow-hidden",
                        isActive ? "opacity-100" : "opacity-50 group-hover:opacity-75"
                      )}
                      style={{
                        height: `${barH}%`,
                        minHeight: total > 0 ? 4 : 0,
                        background: color,
                        transform: isActive ? "scaleX(1.08)" : undefined,
                      }}
                    >
                      {spent > 0 && (
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-black/20"
                          style={{ height: `${(spent / total) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* X-axis month labels */}
      <div className="flex ml-[44px] md:ml-[52px] mt-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
          const entry = data?.budget.months.find(e => e.month === m);
          const isActive = m === selectedMonth;
          const color = MONTH_COLORS[m];
          return (
            <span
              key={m}
              className={cn(
                "flex-1 text-center text-[9px] md:text-[11px] font-semibold leading-none transition-colors",
                !entry && "opacity-30",
                isActive ? "" : "text-[#999] dark:text-[#666]"
              )}
              style={isActive ? { color } : undefined}
            >
              {MONTH_LABELS[m]}
            </span>
          );
        })}
      </div>

      {/* Dialog for month detail */}
      {activeEntry && activeEntry.allocations.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedMonth(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white dark:bg-[#1a1a1a] rounded-[14px] w-full max-w-md p-5 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedMonth(null)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#f0f0f0] dark:bg-[#333] flex items-center justify-center text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div className="mb-4">
              <h3 className="text-[14px] font-bold text-[#171717] dark:text-[#f5f5f5]">
                {MONTH_LABELS[activeEntry.month]} — {formatVND(activeEntry.total)}
              </h3>
              <p className="text-[11px] text-[#999] mt-0.5">
                Đã chi {formatVND(activeEntry.spent)} · Còn {formatVND(activeEntry.remaining)}
              </p>
            </div>

            {/* Allocations */}
            <div className="space-y-3">
              {activeEntry.allocations.map((a) => {
                const pct = a.amount > 0 ? Math.min(100, ((Number(a.spent) || 0) / a.amount) * 100) : 0;
                return (
                  <div key={a.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-medium text-[#333] dark:text-[#ccc]">
                        {a.emoji} {a.label}
                      </span>
                      <span className="text-[11px] text-[#999]">
                        {formatVND(Number(a.spent) || 0)} / {formatVND(a.amount)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#f0f0f0] dark:bg-[#2a2a2a] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: a.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Trending Widget ─────────────────────────────────────────── */
function TrendingWidget() {
  const [repos, setRepos] = useState<{ name: string; url: string; description: string; language: string; languageColor: string; starsToday: number; aiSummary?: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/trending")
      .then(r => r.json())
      .then(j => {
        if (j.data?.repos) setRepos(j.data.repos.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-[12px] bg-white dark:bg-[#111] p-4 md:p-5 animate-pulse"
        style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="h-4 w-32 bg-[#f0f0f0] dark:bg-[#222] rounded mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map(n => <div key={n} className="h-10 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-[6px]" />)}
        </div>
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="rounded-[12px] bg-white dark:bg-[#111] p-4 md:p-5"
        style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" style={{ color: "hsl(340,75%,55%)" }} />
            Trending
          </h2>
        </div>
        <p className="text-[12px] text-[#999] text-center py-4">Chưa có dữ liệu. Xem <Link href="/trending" className="underline">trang Trending</Link> để cập nhật.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] bg-white dark:bg-[#111] p-4 md:p-5"
      style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" style={{ color: "hsl(340,75%,55%)" }} />
          GitHub Trending
        </h2>
        <Link href="/trending" className="text-[11px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors flex items-center gap-0.5">
          Xem đầy đủ <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-1">
        {repos.map((r, i) => (
          <a
            key={r.name}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 py-2 px-2 rounded-[6px] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors group"
          >
            <span className="text-[10px] font-bold text-[#ccc] dark:text-[#444] tabular-nums w-4 text-right shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-[#333] dark:text-[#ddd] truncate group-hover:text-[hsl(340,75%,55%)] transition-colors">
                {r.name}
              </p>
              {(r.aiSummary || r.description) && (
                <p className="text-[10px] text-[#999] truncate">{r.aiSummary || r.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {r.language && (
                <span className="flex items-center gap-1 text-[10px] text-[#999]">
                  <span className="w-2 h-2 rounded-full" style={{ background: r.languageColor }} />
                  {r.language}
                </span>
              )}
              {r.starsToday > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-500">
                  <Star className="w-2.5 h-2.5" />
                  +{r.starsToday.toLocaleString()}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
