"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import {
  ArrowLeft, Loader2, Wand2, ClipboardPaste, Languages,
  ChevronDown, Sparkles, Clock, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Tip } from "@/components/ui/tip";
import TurndownService from "turndown";

/* ── Types ──────────────────────────────────────────────────── */
type Language = "en" | "jp";
type View = "input" | "result";

interface Chunk {
  text: string;
  role: string;
  hint: string;
}

interface Sentence {
  original: string;
  chunks: Chunk[];
}

interface Paragraph {
  heading: string;
  note: string;
  sentences: Sentence[];
}

interface KeyPhrase {
  phrase: string;
  type: string;
  meaning: string;
  note: string;
  example: string;
}

interface CachedEntry {
  id: string;
  language: Language;
  preview: string;
  originalText: string;
  result: AnalysisResult;
  createdAt: number;
}

interface AnalysisResult {
  paragraphs: Paragraph[];
  keyPhrases: KeyPhrase[];
}

/* ── Role Color System ──────────────────────────────────────── */
interface RoleColor {
  label: string;
  bg: string;
  darkBg: string;
  text: string;
  darkText: string;
  border: string;
  darkBorder: string;
}

const ROLE_COLORS: Record<string, RoleColor> = {
  subject:     { label: "Chủ ngữ",     bg: "hsl(210,100%,93%)", darkBg: "hsl(210,60%,18%)", text: "hsl(210,80%,35%)", darkText: "hsl(210,80%,72%)", border: "hsl(210,80%,82%)",  darkBorder: "hsl(210,50%,28%)" },
  verb:        { label: "Động từ",      bg: "hsl(142,76%,90%)",  darkBg: "hsl(142,50%,16%)", text: "hsl(142,60%,30%)", darkText: "hsl(142,60%,65%)", border: "hsl(142,60%,78%)",  darkBorder: "hsl(142,40%,26%)" },
  object:      { label: "Tân ngữ",      bg: "hsl(32,98%,90%)",   darkBg: "hsl(32,60%,18%)",  text: "hsl(32,80%,35%)",  darkText: "hsl(32,80%,68%)",  border: "hsl(32,80%,80%)",   darkBorder: "hsl(32,50%,28%)" },
  complement:  { label: "Bổ ngữ",       bg: "hsl(280,80%,92%)",  darkBg: "hsl(280,50%,18%)", text: "hsl(280,60%,40%)", darkText: "hsl(280,60%,72%)", border: "hsl(280,60%,82%)",  darkBorder: "hsl(280,40%,28%)" },
  adverbial:   { label: "Trạng ngữ",    bg: "hsl(190,90%,90%)",  darkBg: "hsl(190,50%,16%)", text: "hsl(190,70%,30%)", darkText: "hsl(190,70%,65%)", border: "hsl(190,70%,78%)",  darkBorder: "hsl(190,40%,26%)" },
  conjunction: { label: "Liên từ",       bg: "hsl(340,80%,93%)",  darkBg: "hsl(340,50%,18%)", text: "hsl(340,60%,40%)", darkText: "hsl(340,60%,72%)", border: "hsl(340,60%,84%)",  darkBorder: "hsl(340,40%,28%)" },
  modifier:    { label: "Bổ nghĩa",     bg: "hsl(55,85%,88%)",   darkBg: "hsl(55,45%,16%)",  text: "hsl(55,70%,30%)",  darkText: "hsl(55,70%,65%)",  border: "hsl(55,70%,76%)",   darkBorder: "hsl(55,35%,26%)" },
  preposition: { label: "Giới từ",       bg: "hsl(220,15%,92%)",  darkBg: "hsl(220,10%,20%)", text: "hsl(220,10%,40%)", darkText: "hsl(220,10%,65%)", border: "hsl(220,10%,82%)",  darkBorder: "hsl(220,10%,30%)" },
  greeting:    { label: "Lời chào",      bg: "hsl(32,98%,90%)",   darkBg: "hsl(32,60%,18%)",  text: "hsl(32,80%,35%)",  darkText: "hsl(32,80%,68%)",  border: "hsl(32,80%,80%)",   darkBorder: "hsl(32,50%,28%)" },
  noun:        { label: "Danh từ",       bg: "hsl(210,100%,93%)", darkBg: "hsl(210,60%,18%)", text: "hsl(210,80%,35%)", darkText: "hsl(210,80%,72%)", border: "hsl(210,80%,82%)",  darkBorder: "hsl(210,50%,28%)" },
};

const DEFAULT_ROLE_COLOR: RoleColor = {
  label: "Khác", bg: "hsl(220,15%,92%)", darkBg: "hsl(220,10%,20%)",
  text: "hsl(220,10%,40%)", darkText: "hsl(220,10%,65%)",
  border: "hsl(220,10%,82%)", darkBorder: "hsl(220,10%,30%)",
};

function getRoleColor(role: string) {
  return ROLE_COLORS[role] || DEFAULT_ROLE_COLOR;
}

/* ── Key Phrase Type Badge Colors ───────────────────────────── */
const PHRASE_TYPE_STYLES: Record<string, { label: string; bg: string; darkBg: string; text: string; darkText: string }> = {
  collocation:       { label: "Collocation",    bg: "hsl(210,100%,93%)", darkBg: "hsl(210,60%,18%)", text: "hsl(210,80%,40%)", darkText: "hsl(210,80%,72%)" },
  idiom:             { label: "Idiom",          bg: "hsl(340,80%,93%)",  darkBg: "hsl(340,50%,18%)", text: "hsl(340,60%,40%)", darkText: "hsl(340,60%,72%)" },
  formal_expression: { label: "Formal",         bg: "hsl(280,80%,92%)",  darkBg: "hsl(280,50%,18%)", text: "hsl(280,60%,40%)", darkText: "hsl(280,60%,72%)" },
  phrasal_verb:      { label: "Phrasal Verb",   bg: "hsl(142,76%,90%)",  darkBg: "hsl(142,50%,16%)", text: "hsl(142,60%,30%)", darkText: "hsl(142,60%,65%)" },
  connector:         { label: "Connector",      bg: "hsl(32,98%,90%)",   darkBg: "hsl(32,60%,18%)",  text: "hsl(32,80%,35%)",  darkText: "hsl(32,80%,68%)" },
  advanced_vocab:    { label: "Advanced Vocab", bg: "hsl(55,85%,88%)",   darkBg: "hsl(55,45%,16%)",  text: "hsl(55,70%,30%)",  darkText: "hsl(55,70%,65%)" },
};

const DEFAULT_PHRASE_STYLE = { label: "Khác", bg: "hsl(220,15%,92%)", darkBg: "hsl(220,10%,20%)", text: "hsl(220,10%,40%)", darkText: "hsl(220,10%,65%)" };

function getPhraseTypeStyle(type: string) {
  return PHRASE_TYPE_STYLES[type] || DEFAULT_PHRASE_STYLE;
}

/* ── Theme hook — reads data-theme attribute ─────────────────── */
function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/* ── LocalStorage Cache (3-day TTL) ──────────────────────────── */
const LS_KEY = "ph_translation_cache";
const TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function loadCache(): CachedEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const entries: CachedEntry[] = JSON.parse(raw);
    const now = Date.now();
    // Filter out expired entries
    const valid = entries.filter(e => now - e.createdAt < TTL_MS);
    if (valid.length !== entries.length) localStorage.setItem(LS_KEY, JSON.stringify(valid));
    return valid;
  } catch { return []; }
}

function saveToCache(entry: CachedEntry) {
  const entries = loadCache();
  // Prepend new entry, keep max 10
  const updated = [entry, ...entries.filter(e => e.id !== entry.id)].slice(0, 10);
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
}

function removeFromCache(id: string) {
  const entries = loadCache().filter(e => e.id !== id);
  localStorage.setItem(LS_KEY, JSON.stringify(entries));
}

/* ── Flag image (Windows doesn't render flag emoji) ──────────── */
const FLAG_SRC: Record<string, string> = {
  en: "https://flagcdn.com/24x18/us.png",
  jp: "https://flagcdn.com/24x18/jp.png",
};
function FlagImg({ lang, size = 18 }: { lang: string; size?: number }) {
  return <img src={FLAG_SRC[lang] || FLAG_SRC.en} alt="" width={size} height={Math.round(size * 0.75)} className="inline-block" style={{ verticalAlign: "middle" }} />;
}

/* ── Helpers ─────────────────────────────────────────────────── */
function htmlToMarkdown(html: string): string {
  const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });
  td.addRule("strikethrough", {
    filter: ["del", "s"],
    replacement: (content) => `~~${content}~~`,
  });
  return td.turndown(html).trim();
}

/* ── Reusable TopBar (same pattern as Writing page) ──────────── */
function TopBar({ onBack, right }: { onBack?: () => void; right?: React.ReactNode }) {
  return (
    <div className="shrink-0 px-6 py-3 bg-white dark:bg-[#111] sticky top-0 z-[10] flex items-center justify-between"
      style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
      <div className="flex items-center gap-3">
        {onBack && (
          <Tip label="Quay lại">
            <button onClick={onBack}
              className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Tip>
        )}
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">
          🌐 Luyện Dịch
        </p>
      </div>
      {right}
    </div>
  );
}

/* ── Chunk Highlight Component ──────────────────────────────── */
function ChunkHighlight({ chunk, isDark }: { chunk: Chunk; isDark: boolean }) {
  const [hovered, setHovered] = useState(false);
  const color = getRoleColor(chunk.role);

  const textColor = isDark ? color.darkText : color.text;
  const tooltipBg = isDark ? "#1f1f1f" : "#ffffff";
  const badgeBg   = isDark ? color.darkBg : color.bg;

  return (
    <span
      className="relative inline cursor-help transition-colors duration-150"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => { e.stopPropagation(); setHovered(v => !v); }}
      style={{
        color: textColor,
        textDecorationLine: hovered ? "underline" : "none",
        textDecorationStyle: "dotted",
        textUnderlineOffset: "3px",
        textDecorationColor: textColor,
      }}
    >
      {chunk.text}

      {/* Tooltip */}
      {hovered && (
        <span
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none"
          style={{ minWidth: 160, maxWidth: 260 }}
        >
          {/* Arrow */}
          <span
            className="absolute -bottom-[5px] left-1/2 -translate-x-1/2"
            style={{
              width: 0, height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: `5px solid ${tooltipBg}`,
            }}
          />
          <span
            className="block rounded-[10px] px-3 py-2.5"
            style={{ background: tooltipBg, boxShadow: "0 4px 24px rgba(0,0,0,0.16)" }}
          >
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-[3px] mb-1.5"
              style={{ background: badgeBg, color: textColor }}
            >
              {color.label}
            </span>
            <span className="block text-[12px] text-[#444] dark:text-[#bbb] leading-relaxed">
              {chunk.hint}
            </span>
          </span>
        </span>
      )}
    </span>
  );
}

/* ── Color Legend Component ──────────────────────────────────── */
function ColorLegend({ isDark }: { isDark: boolean }) {
  const mainRoles = ["subject", "verb", "object", "complement", "adverbial", "conjunction", "modifier", "preposition"];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {mainRoles.map(role => {
        const c = getRoleColor(role);
        const text = isDark ? c.darkText : c.text;
        return (
          <span key={role} className="inline-flex items-center gap-1.5 text-[11px] font-medium" style={{ color: text }}>
            <span className="w-2 h-2 rounded-full" style={{ background: text }} />
            {c.label}
          </span>
        );
      })}
    </div>
  );
}

/* ── Key Phrase Card Component ──────────────────────────────── */
function KeyPhraseCard({ kp, isDark }: { kp: KeyPhrase; isDark: boolean }) {
  const style = getPhraseTypeStyle(kp.type);
  const [open, setOpen] = useState(false);

  const accentColor = isDark ? style.darkText : style.text;
  const badgeBg     = isDark ? style.darkBg   : style.bg;
  const badgeText   = isDark ? style.darkText : style.text;

  // Highlight the phrase within the example sentence
  const highlightExample = useMemo(() => {
    if (!kp.example) return null;
    const idx = kp.example.toLowerCase().indexOf(kp.phrase.toLowerCase());
    if (idx === -1) return <span>{kp.example}</span>;
    const before = kp.example.slice(0, idx);
    const match = kp.example.slice(idx, idx + kp.phrase.length);
    const after = kp.example.slice(idx + kp.phrase.length);
    return (
      <span>
        {before}<strong style={{ color: accentColor }}>{match}</strong>{after}
      </span>
    );
  }, [kp.example, kp.phrase, accentColor]);

  return (
    <div
      className="rounded-[8px] pl-3 pr-3 py-2.5 transition-colors cursor-pointer hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a]"
      style={{
        borderLeft: `3px solid ${accentColor}`,
        boxShadow: "var(--shadow-border)",
      }}
      onClick={() => setOpen(v => !v)}
    >
      {/* Header: badge + phrase + meaning + chevron */}
      <div className="flex items-center gap-2">
        <div className="flex items-baseline gap-2 flex-wrap flex-1 min-w-0">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-[2px] rounded-[3px] shrink-0 translate-y-[-1px]"
            style={{ background: badgeBg, color: badgeText }}
          >
            {style.label}
          </span>
          <span className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] leading-tight">
            {kp.phrase}
          </span>
          <span className="text-[12px] text-[#888] dark:text-[#666]">—</span>
          <span className="text-[12px] text-[#555] dark:text-[#aaa] leading-tight">
            {kp.meaning}
          </span>
        </div>
        <ChevronDown
          className="w-3 h-3 text-[#bbb] shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </div>

      {/* Expandable detail */}
      {open && (
        <div className="mt-2 space-y-1 animate-fade-up">
          {kp.note && (
            <p className="text-[11px] text-[#888] dark:text-[#777] leading-relaxed">
              {kp.note}
            </p>
          )}
          {kp.example && (
            <p className="text-[11px] text-[#999] dark:text-[#666] italic leading-relaxed">
              <span className="not-italic text-[10px] font-medium uppercase tracking-wider text-[#ccc] dark:text-[#555] mr-1.5">ex</span>
              {highlightExample}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Page Component ─────────────────────────────────────── */
export default function TranslationPage() {
  const isDark = useIsDark();

  const [view, setView]           = useState<View>("input");
  const [language, setLanguage]   = useState<Language>("en");
  const [inputText, setInputText] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [rawText, setRawText]     = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult]       = useState<AnalysisResult | null>(null);
  const [originalText, setOriginalText]       = useState("");
  const [originalCollapsed, setOriginalCollapsed] = useState(true);
  const [keyPhrasesOpen, setKeyPhrasesOpen]       = useState(false);
  const [history, setHistory]     = useState<CachedEntry[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load cache on mount
  useEffect(() => { setHistory(loadCache()); }, []);

  /* ── Paste convert ──────────────────────────────────────────── */
  function handleConvert() {
    setInputText(rawText);
    setPasteMode(false);
    setRawText("");
    toast.success("Đã dán nội dung");
  }

  /* ── API call ───────────────────────────────────────────────── */
  async function handleAnalyze() {
    const text = inputText.trim();
    if (!text) { toast.error("Nhập đoạn văn cần phân tích"); return; }

    setAnalyzing(true);
    setResult(null);
    setOriginalText(text);

    try {
      const res = await fetch("/api/translation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", language, text }),
      });
      const json = await res.json();

      if (json.statusCode === 200 && json.data) {
        setResult(json.data);
        setView("result");
        // Cache result
        const entry: CachedEntry = {
          id: Date.now().toString(36),
          language,
          preview: text.slice(0, 80),
          originalText: text,
          result: json.data,
          createdAt: Date.now(),
        };
        saveToCache(entry);
        setHistory(loadCache());
      } else {
        toast.error(json.message || "Không thể phân tích văn bản");
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleReset() {
    setView("input");
    setResult(null);
    setOriginalText("");
    setInputText("");
  }

  function handleBack() {
    setView("input");
    setResult(null);
    setOriginalText("");
  }

  function loadFromHistory(entry: CachedEntry) {
    setLanguage(entry.language);
    setOriginalText(entry.originalText);
    setResult(entry.result);
    setView("result");
  }

  function deleteFromHistory(id: string) {
    removeFromCache(id);
    setHistory(loadCache());
  }

  /* ════════════════════════════════════════════════════════════
     ANALYSIS RESULT VIEW
     ════════════════════════════════════════════════════════════ */
  if (view === "result" && result) {
    return (
      <div className="flex flex-col h-screen">
        {/* TopBar — same pattern as Writing page */}
        <TopBar
          onBack={handleBack}
          right={
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[hsl(24,95%,53%,0.1)] text-[hsl(24,95%,45%)] dark:text-[hsl(24,95%,60%)]"
                style={{ boxShadow: "inset 0 0 0 1px hsl(24,95%,53%,0.25)" }}>
                <FlagImg lang={language} size={16} /> {language === "en" ? "English" : "日本語"}
              </span>
            </div>
          }
        />

        {/* Single column scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Original text (collapsible) */}
          <div>
            <button
              onClick={() => setOriginalCollapsed(v => !v)}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <ChevronDown
                className="w-3 h-3 text-[#bbb] transition-transform duration-200"
                style={{ transform: originalCollapsed ? "none" : "rotate(180deg)" }}
              />
              <span className="text-[11px] font-medium uppercase tracking-widest text-[#999] group-hover:text-[#666] dark:group-hover:text-[#aaa] transition-colors">
                📄 Đoạn văn gốc
              </span>
            </button>
            {!originalCollapsed && (
              <p className="text-[13px] leading-[1.8] text-[#444] dark:text-[#bbb] whitespace-pre-wrap mt-2 pl-5">
                {originalText}
              </p>
            )}
          </div>

          {/* Color legend — inline */}
          <ColorLegend isDark={isDark} />

          {/* All paragraphs — continuous flow */}
          <div className="space-y-5">
            {result.paragraphs.map((para, pi) => (
              <div key={pi}>
                <p className="text-[14px] leading-[2.2] font-medium">
                  {para.sentences.map((sentence, si) => (
                    <span key={si}>
                      {sentence.chunks.map((chunk, ci) => (
                        <span key={ci}>
                          <ChunkHighlight chunk={chunk} isDark={isDark} />
                          {ci < sentence.chunks.length - 1 && " "}
                        </span>
                      ))}
                      {si < para.sentences.length - 1 && " "}
                    </span>
                  ))}
                </p>

                {pi < result.paragraphs.length - 1 && (
                  <div className="mt-5 border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]" />
                )}
              </div>
            ))}
          </div>

          {/* Key Phrases — below text */}
          {result.keyPhrases && result.keyPhrases.length > 0 && (
            <div className="pt-3 border-t border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
              <button
                onClick={() => setKeyPhrasesOpen(v => !v)}
                className="flex items-center gap-2 w-full cursor-pointer group"
              >
                <ChevronDown
                  className="w-3 h-3 text-[#bbb] transition-transform duration-200"
                  style={{ transform: keyPhrasesOpen ? "rotate(180deg)" : "none" }}
                />
                <Sparkles className="w-4 h-4 text-[hsl(24,95%,53%)]" />
                <h2 className="text-[15px] font-bold text-[#171717] dark:text-[#f5f5f5]">
                  Cụm từ ăn điểm
                </h2>
                <span className="text-[11px] text-[#bbb] font-medium">
                  ({result.keyPhrases.length})
                </span>
              </button>
              {keyPhrasesOpen && (
                <div className="space-y-2 mt-3 animate-fade-up">
                  {result.keyPhrases.map((kp, i) => (
                    <KeyPhraseCard key={i} kp={kp} isDark={isDark} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bottom action */}
          <div className="flex items-center justify-center pt-2 pb-4">
            <button onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-[13px] font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: "linear-gradient(135deg, hsl(24,95%,53%), hsl(38,92%,52%))" }}>
              <Languages className="w-3.5 h-3.5" />
              Phân tích đoạn mới
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════
     INPUT VIEW — matches Writing page layout pattern
     ════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-screen">
      <TopBar />

      <div className="flex-1 flex items-center justify-center px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-2xl space-y-5">
          {/* Title */}
          <div className="text-center space-y-1.5">
            <h1 className="text-[22px] font-semibold text-[#171717] dark:text-[#f5f5f5]">
              Chọn ngôn ngữ & nhập đoạn văn
            </h1>
            <p className="text-[13px] text-[#999]">
              AI sẽ phân tích cấu trúc ngữ pháp với highlight màu sắc và trích xuất cụm từ &quot;ăn điểm&quot;
            </p>
          </div>

          {/* Language selector */}
          <div className="flex justify-center gap-3">
            {([
              { lang: "en" as Language, name: "English" },
              { lang: "jp" as Language, name: "日本語" },
            ]).map(item => (
              <button
                key={item.lang}
                onClick={() => setLanguage(item.lang)}
                className="flex items-center gap-2.5 py-3 px-6 rounded-[10px] bg-white dark:bg-[#111] transition-all duration-150 cursor-pointer group"
                style={{
                  boxShadow: language === item.lang
                    ? "inset 0 0 0 2px hsl(24,95%,53%)"
                    : "var(--shadow-card)",
                }}
              >
                <FlagImg lang={item.lang} size={22} />
                <span className={`text-[14px] font-semibold transition-colors ${
                  language === item.lang
                    ? "text-[hsl(24,95%,45%)] dark:text-[hsl(24,95%,60%)]"
                    : "text-[#171717] dark:text-[#f5f5f5] group-hover:text-[hsl(24,95%,53%)]"
                }`}>
                  {item.name}
                </span>
              </button>
            ))}
          </div>

          {/* Input card */}
          <div className="rounded-[12px] bg-white dark:bg-[#111] overflow-hidden"
            style={{ boxShadow: "var(--shadow-card)" }}>

            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3"
              style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
              <label className="text-[11px] font-medium uppercase tracking-widest text-[#999]">
                Đoạn văn cần phân tích
              </label>
              <Tip label={pasteMode ? "Huỷ dán" : "Dán văn bản từ Word/Docs"}>
                <button
                  type="button"
                  onClick={() => { setPasteMode(p => !p); setRawText(""); }}
                  className={`flex items-center gap-1.5 h-6 px-2.5 rounded-[5px] text-[11px] font-medium transition-all cursor-pointer ${
                    pasteMode
                      ? "bg-amber-500 text-white"
                      : "text-[#888] hover:text-[#171717] dark:hover:text-[#f5f5f5]"
                  }`}
                  style={pasteMode ? undefined : { boxShadow: "var(--shadow-border)" }}
                >
                  <ClipboardPaste className="w-3 h-3" />
                  {pasteMode ? "Huỷ" : "Dán"}
                </button>
              </Tip>
            </div>

            {/* Paste area — same pattern as Strategy page */}
            {pasteMode && (
              <div className="mx-5 mt-3 rounded-[8px] border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200 dark:border-amber-800">
                  <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    Dán từ Google Docs / Word / web — tự giữ style
                  </span>
                  <button
                    type="button"
                    onClick={handleConvert}
                    disabled={!rawText.trim()}
                    className="flex items-center gap-1.5 h-6 px-3 rounded-[5px] text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    <Wand2 className="w-3 h-3" />Chuyển đổi
                  </button>
                </div>
                <textarea
                  autoFocus
                  placeholder="Dán nội dung vào đây..."
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  onPaste={e => {
                    const html = e.clipboardData.getData("text/html");
                    if (html) {
                      e.preventDefault();
                      const plainText = htmlToMarkdown(html)
                        .replace(/^#+\s*/gm, "")
                        .replace(/\*\*|__|_|\*|`/g, "")
                        .replace(/^\s*[-*]\s/gm, "")
                        .trim();
                      setInputText(plainText);
                      setPasteMode(false);
                      setRawText("");
                      toast.success("Đã dán nội dung");
                    }
                  }}
                  rows={6}
                  className="w-full px-3 py-2.5 text-[12px] bg-transparent text-[#333] dark:text-[#ddd] resize-none leading-relaxed outline-none"
                />
              </div>
            )}

            {/* Main textarea */}
            <div className="px-5 py-4">
              <textarea
                ref={textareaRef}
                placeholder={
                  language === "en"
                    ? "Paste or type an English paragraph here...\n\nExample: Dear Project Team, I am writing to update you on our upcoming software infrastructure upgrade..."
                    : "日本語の文章をここに入力してください...\n\n例: 本日は、来月予定されているソフトウェアインフラのアップグレードについて..."
                }
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                rows={pasteMode ? 6 : 10}
                className="w-full px-3 py-2.5 text-[13px] font-mono rounded-[7px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] resize-none leading-relaxed"
                style={{ boxShadow: "var(--shadow-border)" }}
              />
            </div>

            {/* Action buttons — grid matching Strategy page */}
            <div className="grid grid-cols-2 gap-2 px-5 pb-5 pt-2">
              <button
                onClick={() => { setInputText(""); setPasteMode(false); setRawText(""); }}
                disabled={!inputText.trim()}
                className="h-10 rounded-[7px] text-[14px] font-medium text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer disabled:opacity-40"
                style={{ boxShadow: "var(--shadow-border)" }}
              >
                Xoá
              </button>
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !inputText.trim()}
                className="h-10 rounded-[7px] text-[14px] font-medium flex items-center justify-center gap-1.5 bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang phân tích...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Phân tích
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recent history */}
          {history.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-widest text-[#999] flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Gần đây
              </p>
              {history.map(entry => (
                <div key={entry.id}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-[8px] bg-white dark:bg-[#111] group transition-colors"
                  style={{ boxShadow: "var(--shadow-border)" }}>
                  <button
                    onClick={() => loadFromHistory(entry)}
                    className="flex-1 min-w-0 text-left cursor-pointer">
                    <p className="text-[13px] text-[#171717] dark:text-[#f5f5f5] truncate">
                      {entry.preview}{entry.originalText.length > 80 ? "…" : ""}
                    </p>
                    <p className="text-[10px] text-[#bbb] mt-0.5">
                      <FlagImg lang={entry.language} size={14} /> · {new Date(entry.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFromHistory(entry.id); }}
                    className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#ccc] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
