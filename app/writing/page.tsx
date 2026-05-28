"use client";
import { useState, useRef, useCallback } from "react";
import {
  ArrowLeft, RefreshCw, PenLine, Loader2, RotateCcw,
  Send, ChevronDown, ChevronUp, Copy, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tip } from "@/components/ui/tip";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ── Types ──────────────────────────────────────────────────── */
type Language = "en" | "jp";
type Step = "language" | "topic" | "write" | "review";
interface Topic { id: string; label: string; prompt: string }

/* ── Topic Pools ────────────────────────────────────────────── */
const TOPIC_POOL_EN: Topic[] = [
  { id: "email",       label: "📧 Email chuyên nghiệp",       prompt: "Professional business email" },
  { id: "meeting",     label: "💼 Business Meeting",           prompt: "Business meeting discussion or minutes" },
  { id: "support",     label: "🎧 Customer Support",           prompt: "Customer support conversation or ticket response" },
  { id: "news",        label: "📰 Tin tức / Bài báo",          prompt: "News article or press release" },
  { id: "story",       label: "📖 Câu chuyện ngắn",            prompt: "Short story or narrative" },
  { id: "toeic",       label: "📝 TOEIC Part 7 Passage",       prompt: "TOEIC Part 7 style reading passage — advertisement, notice, or letter" },
  { id: "hotel",       label: "🏨 Hotel Review",               prompt: "Hotel or restaurant review" },
  { id: "manual",      label: "📋 Hướng dẫn sử dụng",          prompt: "Product manual or user guide instructions" },
  { id: "invitation",  label: "🗓️ Thư mời sự kiện",           prompt: "Event invitation or announcement letter" },
  { id: "workplace",   label: "💬 Hội thoại công việc",         prompt: "Workplace conversation between colleagues" },
  { id: "report",      label: "📊 Báo cáo dự án",              prompt: "Project status report or summary" },
  { id: "essay",       label: "🎓 Bài luận học thuật",          prompt: "Academic essay or opinion paragraph" },
];

const TOPIC_POOL_JP: Topic[] = [
  { id: "email",       label: "📧 ビジネスメール",              prompt: "ビジネスメールの本文" },
  { id: "meeting",     label: "💼 会議の議事録",                prompt: "会議の議事録や報告" },
  { id: "support",     label: "🏪 お客様対応",                  prompt: "お客様対応の会話やメール" },
  { id: "news",        label: "📰 ニュース記事",                prompt: "ニュース記事や報道" },
  { id: "story",       label: "📖 短い物語",                    prompt: "短い物語やエッセイ" },
  { id: "jlpt",        label: "📝 JLPT読解問題",               prompt: "JLPT N3-N2レベルの読解問題スタイルの文章" },
  { id: "hotel",       label: "🏨 ホテルの口コミ",              prompt: "ホテルやレストランのレビュー" },
  { id: "manual",      label: "📋 取扱説明書",                  prompt: "製品の取扱説明書" },
  { id: "invitation",  label: "🗓️ イベントの案内",             prompt: "イベントの招待状や案内" },
  { id: "workplace",   label: "💬 職場の会話",                  prompt: "職場での同僚との会話" },
  { id: "report",      label: "📊 プロジェクト報告",            prompt: "プロジェクトの進捗報告" },
  { id: "essay",       label: "🎓 学術エッセイ",               prompt: "学術的なエッセイや意見文" },
];

/* ── Helpers ─────────────────────────────────────────────────── */
function pickRandom<T>(arr: T[], n: number, exclude: T[] = []): T[] {
  const pool = arr.filter(x => !exclude.includes(x));
  const source = pool.length >= n ? pool : arr;
  return [...source].sort(() => Math.random() - 0.5).slice(0, n);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/* ── Reusable TopBar ─────────────────────────────────────────── */
function TopBar({ onBack, right }: { onBack?: () => void; right?: React.ReactNode }) {
  return (
    <div className="shrink-0 px-6 py-3 bg-white dark:bg-[#111] sticky top-0 z-[10] flex items-center justify-between"
      style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
            style={{ boxShadow: "var(--shadow-border)" }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">
          ✍️ Luyện Viết
        </p>
      </div>
      {right}
    </div>
  );
}

/* ── Main Page Component ─────────────────────────────────────── */
export default function WritingPage() {
  const [step, setStep]                       = useState<Step>("language");
  const [language, setLanguage]               = useState<Language>("en");
  const [selectedTopic, setSelectedTopic]     = useState<Topic | null>(null);
  const [suggestedTopics, setSuggestedTopics] = useState<Topic[]>([]);
  const shownTopicsRef = useRef<Topic[]>([]);
  const [customTopic, setCustomTopic]         = useState("");

  // Write step
  const [sourceText, setSourceText]       = useState("");
  const [userWriting, setUserWriting]     = useState("");
  const [generating, setGenerating]       = useState(false);

  // Review step
  const [reviewResult, setReviewResult]   = useState("");
  const [reviewing, setReviewing]         = useState(false);
  const [sourceCollapsed, setSourceCollapsed] = useState(false);
  const [copied, setCopied]               = useState(false);

  /* ── Step transitions ─────────────────────────────────────── */
  function selectLanguage(lang: Language) {
    setLanguage(lang);
    shownTopicsRef.current = [];
    const picked = pickRandom(lang === "en" ? TOPIC_POOL_EN : TOPIC_POOL_JP, 6);
    shownTopicsRef.current = picked;
    setSuggestedTopics(picked);
    setStep("topic");
  }

  function refreshTopics() {
    const pool = language === "en" ? TOPIC_POOL_EN : TOPIC_POOL_JP;
    const picked = pickRandom(pool, 6, shownTopicsRef.current);
    shownTopicsRef.current = [...shownTopicsRef.current, ...picked];
    setSuggestedTopics(picked);
  }

  async function selectTopic(topic: Topic) {
    setSelectedTopic(topic);
    setUserWriting("");
    setReviewResult("");
    setStep("write");
    await generatePassage(topic);
  }

  function handleCustomTopicSubmit() {
    const text = customTopic.trim();
    if (!text) return;
    const topic: Topic = { id: "custom", label: `✨ ${text}`, prompt: text };
    setCustomTopic("");
    selectTopic(topic);
  }

  /* ── API calls ────────────────────────────────────────────── */
  async function generatePassage(topic: Topic) {
    setGenerating(true);
    setSourceText("");
    try {
      const res = await fetch("/api/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", language, scenario: topic.prompt }),
      });
      const json = await res.json();
      if (json.statusCode === 200) {
        setSourceText(json.data.text);
      } else {
        toast.error("Không thể tạo đoạn văn, thử lại nhé");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setGenerating(false);
    }
  }

  const submitReview = useCallback(async () => {
    if (!userWriting.trim() || !sourceText || !selectedTopic) return;
    setReviewing(true);
    try {
      const res = await fetch("/api/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          language,
          scenario: selectedTopic.prompt,
          sourceText,
          userWriting: userWriting.trim(),
        }),
      });
      const json = await res.json();
      if (json.statusCode === 200) {
        setReviewResult(json.data.review);
        setStep("review");
      } else {
        toast.error("Không thể review bài viết, thử lại nhé");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setReviewing(false);
    }
  }, [userWriting, sourceText, selectedTopic, language]);

  function reset() {
    setStep("language");
    setSelectedTopic(null);
    setSourceText("");
    setUserWriting("");
    setReviewResult("");
  }

  function tryAgain() {
    setUserWriting("");
    setReviewResult("");
    if (selectedTopic) {
      setStep("write");
      generatePassage(selectedTopic);
    }
  }

  async function copyReview() {
    try {
      await navigator.clipboard.writeText(reviewResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  }

  /* ═══════════════════════════════════════════════════════════
     STEP 1: Language Selection
     ═══════════════════════════════════════════════════════════ */
  if (step === "language") return (
    <div className="flex flex-col items-center justify-center h-screen px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">
            ✍️ Luyện Viết
          </p>
          <h1 className="text-[22px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Chọn ngôn ngữ</h1>
          <p className="text-[13px] text-[#999]">Bạn muốn luyện viết ngôn ngữ nào hôm nay?</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {([
            { lang: "en" as Language, flag: "🇺🇸", name: "English",  sub: "Tiếng Anh" },
            { lang: "jp" as Language, flag: "🇯🇵", name: "日本語",    sub: "Tiếng Nhật" },
          ]).map(item => (
            <button key={item.lang} onClick={() => selectLanguage(item.lang)}
              className="flex flex-col items-center gap-2 py-7 px-4 rounded-[12px] bg-white dark:bg-[#111] hover:ring-2 hover:ring-[hsl(24,95%,53%)] transition-all duration-150 cursor-pointer group"
              style={{ boxShadow: "var(--shadow-card)" }}>
              <span className="text-[40px]">{item.flag}</span>
              <span className="text-[16px] font-semibold text-[#171717] dark:text-[#f5f5f5] group-hover:text-[hsl(24,95%,53%)] transition-colors">{item.name}</span>
              <span className="text-[12px] text-[#999]">{item.sub}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     STEP 2: Topic Selection
     ═══════════════════════════════════════════════════════════ */
  if (step === "topic") return (
    <div className="flex flex-col h-screen">
      <TopBar
        onBack={() => setStep("language")}
        right={<span className="text-[13px] font-medium text-[#999]">{language === "en" ? "🇺🇸 English" : "🇯🇵 日本語"}</span>}
      />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Chọn chủ đề</h2>
              <p className="text-[12px] text-[#999] mt-0.5">AI sẽ tạo đoạn văn tiếng Việt theo chủ đề bạn chọn</p>
            </div>
            <Tip label="Làm mới chủ đề">
              <button onClick={refreshTopics}
                className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#666] dark:text-[#888] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
                style={{ boxShadow: "var(--shadow-border)" }}>
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </Tip>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedTopics.map((topic, i) => (
              <button key={topic.id} onClick={() => selectTopic(topic)}
                className={cn(
                  "text-left px-4 py-3.5 rounded-[8px] bg-white dark:bg-[#111] text-[14px] font-medium text-[#555] dark:text-[#aaa] hover:text-[hsl(24,95%,50%)] dark:hover:text-[hsl(24,95%,60%)] hover:ring-1 hover:ring-[hsl(24,95%,53%,0.4)] transition-all duration-150 cursor-pointer",
                  "w-full sm:w-[calc(50%-4px)]",
                  suggestedTopics.length % 2 !== 0 && i === suggestedTopics.length - 1 && "sm:mx-auto"
                )}
                style={{ boxShadow: "var(--shadow-border)" }}>
                {topic.label}
              </button>
            ))}
          </div>

          {/* Custom topic */}
          <div className="pt-2" style={{ boxShadow: "rgba(0,0,0,0.06) 0px -1px 0px 0px inset" }}>
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#999] mb-2">Hoặc nhập chủ đề của bạn</p>
            <div className="flex gap-2">
              <div className="flex-1 rounded-[8px] overflow-hidden" style={{ boxShadow: "var(--shadow-border)" }}>
                <input
                  type="text"
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCustomTopicSubmit()}
                  placeholder="Ví dụ: Thư xin nghỉ phép..."
                  className="w-full h-10 px-3 text-[13px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] placeholder:text-[#ccc] outline-none"
                />
              </div>
              <button onClick={handleCustomTopicSubmit} disabled={!customTopic.trim()}
                className="flex h-10 px-3 items-center gap-1.5 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] text-[12px] font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 shrink-0">
                <PenLine className="w-3.5 h-3.5" /> Dùng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     STEP 3: Writing
     ═══════════════════════════════════════════════════════════ */
  if (step === "write") return (
    <div className="flex flex-col h-screen">
      <TopBar
        onBack={() => setStep("topic")}
        right={
          <div className="flex items-center gap-2">
            {selectedTopic && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[hsl(24,95%,53%,0.1)] text-[hsl(24,95%,45%)] dark:text-[hsl(24,95%,60%)]"
                style={{ boxShadow: "inset 0 0 0 1px hsl(24,95%,53%,0.25)" }}>
                {selectedTopic.label}
              </span>
            )}
            <Tip label="Đổi đoạn văn">
              <button onClick={() => selectedTopic && generatePassage(selectedTopic)}
                disabled={generating}
                className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer disabled:opacity-40"
                style={{ boxShadow: "var(--shadow-border)" }}>
                <RefreshCw className={cn("w-3.5 h-3.5", generating && "animate-spin")} />
              </button>
            </Tip>
          </div>
        }
      />

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {/* Left — Source text */}
        <div className="lg:w-1/2 border-b lg:border-b-0 lg:border-r border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] flex flex-col overflow-hidden">
          <div className="px-5 py-3 shrink-0 flex items-center justify-between"
            style={{ boxShadow: "rgba(0,0,0,0.04) 0px 1px 0px 0px" }}>
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#999]">📄 Đoạn văn gốc (Tiếng Việt)</p>
            <button onClick={() => setSourceCollapsed(v => !v)}
              className="lg:hidden flex h-6 w-6 items-center justify-center rounded text-[#999] hover:text-[#666] transition-colors cursor-pointer">
              {sourceCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className={cn(
            "flex-1 overflow-y-auto px-5 py-4 transition-all duration-200",
            sourceCollapsed ? "max-h-0 lg:max-h-none overflow-hidden py-0" : "max-h-[40vh] lg:max-h-none"
          )}>
            {generating ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-[hsl(24,95%,53%)]" />
                <p className="text-[12px] text-[#999]">Đang tạo đoạn văn...</p>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-[14px] leading-[1.8] text-[var(--fg-primary)] whitespace-pre-wrap">{sourceText}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right — User writing area */}
        <div className="lg:w-1/2 flex flex-col overflow-hidden">
          <div className="px-5 py-3 shrink-0 flex items-center justify-between"
            style={{ boxShadow: "rgba(0,0,0,0.04) 0px 1px 0px 0px" }}>
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#999]">
              ✏️ Bài viết của bạn ({language === "en" ? "English" : "日本語"})
            </p>
            <span className={cn(
              "text-[11px] font-medium tabular-nums",
              countWords(userWriting) > 0 ? "text-[hsl(24,95%,53%)]" : "text-[#ccc]"
            )}>
              {countWords(userWriting)} từ
            </span>
          </div>
          <div className="flex-1 flex flex-col px-5 py-4 overflow-hidden">
            <textarea
              id="writing-input"
              value={userWriting}
              onChange={e => setUserWriting(e.target.value)}
              disabled={generating || !sourceText}
              placeholder={language === "en"
                ? "Write your English translation here..."
                : "ここに日本語の翻訳を書いてください..."}
              className="flex-1 w-full bg-[#fafafa] dark:bg-[#1a1a1a] rounded-[8px] px-4 py-4 text-[14px] leading-[1.8] text-[var(--fg-primary)] placeholder:text-[#ccc] resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(24,95%,53%,0.4)] transition-shadow"
              style={{ boxShadow: "var(--shadow-border)", minHeight: "200px" }}
            />
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 px-6 py-4 bg-white dark:bg-[#111]"
        style={{ boxShadow: "rgba(0,0,0,0.06) 0px -1px 0px 0px" }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <p className="text-[11px] text-[#bbb] hidden sm:block">
            Viết xong bản dịch → bấm Gửi Review để AI đánh giá
          </p>
          <button
            id="btn-submit-review"
            onClick={submitReview}
            disabled={reviewing || !userWriting.trim() || !sourceText}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-[13px] font-semibold text-white transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 ml-auto"
            style={{ background: "linear-gradient(135deg, hsl(24,95%,53%), hsl(38,92%,52%))" }}>
            {reviewing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Đang review...</>
            ) : (
              <><Send className="w-4 h-4" /> Gửi Review</>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════════
     STEP 4: Review
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-screen">
      <TopBar
        right={
          <div className="flex items-center gap-2">
            {selectedTopic && (
              <span className="text-[12px] text-[#999] truncate max-w-[200px] hidden sm:block">
                {selectedTopic.label}
              </span>
            )}
            <Tip label="Copy kết quả">
              <button onClick={copyReview}
                className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
                style={{ boxShadow: "var(--shadow-border)" }}>
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </Tip>
            <Tip label="Thử bài mới">
              <button onClick={tryAgain}
                className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
                style={{ boxShadow: "var(--shadow-border)" }}>
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </Tip>
            <Tip label="Bắt đầu lại">
              <button onClick={reset}
                className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
                style={{ boxShadow: "var(--shadow-border)" }}>
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </Tip>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
          {/* User's writing summary — collapsible */}
          <details className="group rounded-[8px] bg-white dark:bg-[#111] overflow-hidden"
            style={{ boxShadow: "var(--shadow-card)" }}>
            <summary className="px-5 py-3.5 cursor-pointer flex items-center gap-3 text-[13px] font-medium text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] transition-colors list-none [&::-webkit-details-marker]:hidden">
              <ChevronDown className="w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-open:rotate-180" />
              <span>Xem lại bài viết của bạn</span>
              <span className="ml-auto text-[11px] font-medium text-[hsl(24,95%,53%)]">{countWords(userWriting)} từ</span>
            </summary>
            <div className="px-5 pb-4 space-y-3">
              <div className="rounded-[6px] px-4 py-3 bg-[var(--bg-surface)]"
                style={{ boxShadow: "var(--shadow-border)" }}>
                <p className="text-[11px] font-medium uppercase tracking-widest text-[#999] mb-2">Đoạn gốc (Tiếng Việt)</p>
                <p className="text-[13px] leading-[1.7] text-[var(--fg-secondary)] whitespace-pre-wrap">{sourceText}</p>
              </div>
              <div className="rounded-[6px] px-4 py-3 bg-[hsl(24,95%,53%,0.04)]"
                style={{ boxShadow: "inset 0 0 0 1px hsl(24,95%,53%,0.12)" }}>
                <p className="text-[11px] font-medium uppercase tracking-widest text-[hsl(24,95%,45%)] dark:text-[hsl(24,95%,60%)] mb-2">
                  Bài viết của bạn ({language === "en" ? "English" : "日本語"})
                </p>
                <p className="text-[13px] leading-[1.7] text-[var(--fg-primary)] whitespace-pre-wrap">{userWriting}</p>
              </div>
            </div>
          </details>

          {/* AI Review result */}
          <div className="rounded-[8px] bg-white dark:bg-[#111] overflow-hidden animate-fade-up"
            style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="px-5 py-3.5 flex items-center gap-2"
              style={{ boxShadow: "rgba(0,0,0,0.04) 0px 1px 0px 0px" }}>
              <div className="w-6 h-6 rounded-full gradient-writing flex items-center justify-center shrink-0">
                <span className="text-white text-[10px] font-[700]">AI</span>
              </div>
              <p className="text-[13px] font-semibold text-[var(--fg-primary)]">Kết quả Review</p>
            </div>
            <div className="px-5 py-5 writing-review-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children, ...props }) => (
                    <h2 className="text-[15px] font-semibold text-[var(--fg-primary)] mt-6 mb-2 first:mt-0 flex items-center gap-2" {...props}>{children}</h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3 className="text-[14px] font-semibold text-[var(--fg-primary)] mt-4 mb-1.5" {...props}>{children}</h3>
                  ),
                  p: ({ children, ...props }) => (
                    <p className="text-[13px] leading-[1.7] text-[var(--fg-secondary)] mb-2" {...props}>{children}</p>
                  ),
                  ul: ({ children, ...props }) => (
                    <ul className="space-y-1.5 mb-3 pl-1" {...props}>{children}</ul>
                  ),
                  li: ({ children, ...props }) => (
                    <li className="text-[13px] leading-[1.65] text-[var(--fg-secondary)] flex gap-1.5" {...props}>
                      <span className="shrink-0 mt-[2px]">•</span>
                      <span>{children}</span>
                    </li>
                  ),
                  strong: ({ children, ...props }) => (
                    <strong className="font-semibold text-[var(--fg-primary)]" {...props}>{children}</strong>
                  ),
                  blockquote: ({ children, ...props }) => (
                    <blockquote className="border-l-2 border-[hsl(24,95%,53%)] pl-3 my-2 text-[13px] italic text-[var(--fg-muted)]" {...props}>{children}</blockquote>
                  ),
                  hr: (props) => (
                    <hr className="my-4 border-[var(--border)]" {...props} />
                  ),
                }}
              >
                {reviewResult}
              </ReactMarkdown>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-3 pb-6">
            <button onClick={tryAgain}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[8px] text-[13px] font-medium text-[var(--fg-secondary)] hover:text-[var(--fg-primary)] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <RefreshCw className="w-3.5 h-3.5" /> Thử đề mới
            </button>
            <button onClick={reset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-[13px] font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, hsl(24,95%,53%), hsl(38,92%,52%))" }}>
              <RotateCcw className="w-3.5 h-3.5" /> Bắt đầu lại
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
