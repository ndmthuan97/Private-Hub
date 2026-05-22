"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Copy, Check, Trash2, X, ExternalLink,
  BookOpen, Pencil, ClipboardCheck, Loader2, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tip } from "@/components/ui/tip";

const NLM_URL = "https://notebooklm.google.com/";

// localStorage keys for default-prompt overrides
const LS_OVERRIDES_KEY = "nlm_default_overrides";   // Record<id, Partial<Prompt>>
const LS_HIDDEN_KEY    = "nlm_default_hidden";       // string[] of hidden default ids

// Canonical default prompts — source-of-truth, never mutated
const CANONICAL_DEFAULTS: Prompt[] = [
  {
    id: "default-1",
    title: "Email từ vựng ngẫu nhiên",
    content: `Hôm nay hãy lấy ngẫu nhiên 10 từ mới trong file từ vựng này (ưu tiên các từ loại Động từ và Danh từ). Hãy viết cho tôi một đoạn Email công sở (chuẩn Part 7 TOEIC) bằng 100% tiếng Anh bao gồm 10 từ này.`,
    quizPrompt: `The quiz must focus on all vocabulary words that appeared in the office email just generated — including the 10 selected words AND any other notable words from the email body. Test their meanings, correct usage in context, and synonyms. Questions should use fill-in-the-blank or choose-the-correct-meaning format with realistic workplace sentences.`,
    isDefault: true,
    sortOrder: -2,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "default-2",
    title: "Giải thích ngữ pháp + bài tập",
    content: `Hãy tóm tắt cho tôi quy tắc cốt lõi nhất của chủ điểm ngữ pháp: '[Điền tên bài/chủ đề bạn muốn học, VD: Rút gọn mệnh đề quan hệ]'. Dùng ngôn ngữ bình dân, dễ hiểu nhất, tuyệt đối không dùng từ ngữ học thuật giáo điều. Sau đó, cho tôi 10 câu bài tập trắc nghiệm siêu ngắn để tôi test thử ngay xem có hiểu lý thuyết chưa nhé.`,
    quizPrompt: `The quiz must focus solely on the grammar topic just explained in the previous response. Questions must test whether I can correctly apply the grammar rule in real sentences — include tricky distractors that reveal common mistakes. Do not test unrelated grammar points.`,
    isDefault: true,
    sortOrder: -1,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
];

interface Prompt {
  id: string;
  title: string;
  content: string;
  quizPrompt?: string | null;
  isDefault?: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ── localStorage helpers ────────────────────────────────────────
function loadOverrides(): Record<string, Partial<Prompt>> {
  try { return JSON.parse(localStorage.getItem(LS_OVERRIDES_KEY) ?? "{}"); }
  catch { return {}; }
}
function loadHidden(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_HIDDEN_KEY) ?? "[]"); }
  catch { return []; }
}
function saveOverrides(v: Record<string, Partial<Prompt>>) {
  localStorage.setItem(LS_OVERRIDES_KEY, JSON.stringify(v));
}
function saveHidden(v: string[]) {
  localStorage.setItem(LS_HIDDEN_KEY, JSON.stringify(v));
}

// Apply per-id overrides on top of the canonical default list
function applyOverrides(
  overrides: Record<string, Partial<Prompt>>,
  hidden: string[],
): Prompt[] {
  return CANONICAL_DEFAULTS
    .filter(p => !hidden.includes(p.id))
    .map(p => ({ ...p, ...(overrides[p.id] ?? {}) }));
}

export default function NotebookLMPage() {
  const [customPrompts, setCustomPrompts]   = useState<Prompt[]>([]);
  const [defaultPrompts, setDefaultPrompts] = useState<Prompt[]>([]);
  const [overrides, setOverrides]           = useState<Record<string, Partial<Prompt>>>({});
  const [hiddenIds, setHiddenIds]           = useState<string[]>([]);
  const [loading, setLoading]               = useState(true);
  const [copied, setCopied]                 = useState<string | null>(null);
  const [modalOpen, setModalOpen]           = useState(false);
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [saving, setSaving]                 = useState(false);
  const [form, setForm]                     = useState({ title: "", content: "", quizPrompt: "" });
  const [mounted, setMounted]               = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const hasModifiedDefaults =
    Object.keys(overrides).length > 0 || hiddenIds.length > 0;

  const allPrompts = [...defaultPrompts, ...customPrompts];

  // ── Bootstrap ────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const ov  = loadOverrides();
    const hid = loadHidden();
    setOverrides(ov);
    setHiddenIds(hid);
    setDefaultPrompts(applyOverrides(ov, hid));
    fetchPrompts();
  }, []);

  useEffect(() => {
    if (modalOpen) setTimeout(() => titleRef.current?.focus(), 50);
  }, [modalOpen]);

  async function fetchPrompts() {
    try {
      const res  = await fetch("/api/notebooklm/prompts");
      const json = await res.json();
      setCustomPrompts(json.data ?? []);
    } catch {
      toast.error("Không tải được danh sách prompt.");
    } finally {
      setLoading(false);
    }
  }

  // ── Copy ─────────────────────────────────────────────────────
  function handleCopy(id: string, content: string, isQuiz = false) {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(isQuiz ? `quiz-${id}` : id);
      toast.success(isQuiz ? "Đã copy Quiz Prompt!" : "Đã copy prompt!");
      setTimeout(() => setCopied(null), 2000);
    });
  }

  // ── Modal helpers ────────────────────────────────────────────
  function openAdd() {
    setEditingId(null);
    setForm({ title: "", content: "", quizPrompt: "" });
    setModalOpen(true);
  }

  function openEdit(p: Prompt) {
    setEditingId(p.id);
    setForm({ title: p.title, content: p.content, quizPrompt: p.quizPrompt ?? "" });
    setModalOpen(true);
  }

  // ── Save (create / update custom OR override default) ────────
  async function handleSave() {
    const title      = form.title.trim();
    const content    = form.content.trim();
    const quizPrompt = form.quizPrompt.trim() || undefined;
    if (!title || !content) {
      toast.error("Vui lòng điền đủ tiêu đề và nội dung.");
      return;
    }

    setSaving(true);
    try {
      const isEditingDefault = editingId?.startsWith("default-");

      if (isEditingDefault && editingId) {
        // Store override in localStorage — no DB needed for built-in defaults
        const newOverrides = {
          ...overrides,
          [editingId]: { title, content, quizPrompt: quizPrompt ?? null },
        };
        saveOverrides(newOverrides);
        setOverrides(newOverrides);
        setDefaultPrompts(applyOverrides(newOverrides, hiddenIds));
        toast.success("Đã cập nhật prompt mặc định.");

      } else if (editingId) {
        // Update existing custom prompt via API
        const res  = await fetch(`/api/notebooklm/prompts/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, quizPrompt }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        setCustomPrompts(prev => prev.map(p => p.id === editingId ? json.data : p));
        toast.success("Đã cập nhật prompt.");

      } else {
        // Create new custom prompt via API
        const res  = await fetch("/api/notebooklm/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, quizPrompt }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message);
        setCustomPrompts(prev => [...prev, json.data]);
        toast.success("Đã thêm prompt mới.");
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lỗi khi lưu prompt.");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete (hide default / delete custom from DB) ────────────
  function handleDelete(p: Prompt) {
    const msg = p.isDefault
      ? `Ẩn prompt mặc định "${p.title}"? Bạn có thể khôi phục sau.`
      : `Xóa hẳn prompt "${p.title}"? Hành động này không thể hoàn tác.`;

    toast.warning(msg, {
      action: {
        label: p.isDefault ? "Ẩn" : "Xóa",
        onClick: async () => {
          if (p.isDefault) {
            // Hide the default prompt locally — just add to hidden list
            const newHidden = [...hiddenIds, p.id];
            saveHidden(newHidden);
            setHiddenIds(newHidden);
            setDefaultPrompts(applyOverrides(overrides, newHidden));
            toast.success("Đã ẩn prompt mặc định.");
            return;
          }
          try {
            const res = await fetch(`/api/notebooklm/prompts/${p.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Xóa thất bại");
            setCustomPrompts(prev => prev.filter(x => x.id !== p.id));
            toast.success("Đã xóa prompt.");
          } catch {
            toast.error("Không xóa được prompt.");
          }
        },
      },
      cancel: { label: "Hủy", onClick: () => {} },
      duration: 6000,
    });
  }

  // ── Reset all default-prompt overrides ───────────────────────
  function handleResetDefaults() {
    saveOverrides({});
    saveHidden([]);
    setOverrides({});
    setHiddenIds([]);
    setDefaultPrompts(applyOverrides({}, []));
    toast.success("Đã khôi phục prompt mặc định.");
  }

  function handleModalKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setModalOpen(false);
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-base)] pt-14 md:pt-0">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 md:top-0 z-10 bg-[var(--bg-base)] px-5 md:px-8"
        style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
        <div className="flex items-center gap-3 h-14">
          <Link href="/"
            className="flex items-center justify-center w-7 h-7 rounded-[6px] text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] hover:text-[#666] dark:hover:text-[#ccc] transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <BookOpen className="w-4 h-4 shrink-0" style={{ color: "hsl(217,91%,60%)" }} />
            <h1 className="text-[15px] font-semibold text-[var(--fg-primary)] truncate">NotebookLM</h1>
            <span className="text-[12px] text-[var(--fg-muted)] hidden sm:inline">— Kho prompt</span>
          </div>
          <Tip label="Mở NotebookLM">
            <a href={NLM_URL} target="_blank" rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors shrink-0"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </Tip>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="flex-1 px-5 md:px-8 py-6 max-w-3xl w-full mx-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <p className="text-[13px] text-[var(--fg-muted)]">
              {loading ? "Đang tải…" : `${allPrompts.length} prompt${allPrompts.length !== 1 ? "s" : ""}`}
            </p>
            {/* Reset button — only visible when defaults have been modified */}
            {hasModifiedDefaults && (
              <Tip label="Khôi phục prompt mặc định">
                <button onClick={handleResetDefaults}
                  className="flex items-center gap-1 h-6 px-2 rounded-[5px] text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer">
                  <RotateCcw className="w-3 h-3" />
                  Khôi phục mặc định
                </button>
              </Tip>
            )}
          </div>
          <Tip label="Thêm prompt mới">
            <button onClick={openAdd}
              className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[var(--fg-primary)] text-[var(--bg-base)] hover:opacity-90 transition-opacity cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </Tip>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="flex items-center justify-center py-16 text-[var(--fg-muted)]">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-[13px]">Đang tải prompts...</span>
          </div>
        )}

        {/* Prompt list */}
        {!loading && (
          <div className="space-y-3">
            {allPrompts.map(p => (
              <PromptCard
                key={p.id}
                prompt={p}
                copied={copied}
                onCopy={() => handleCopy(p.id, p.content)}
                onCopyQuiz={() => p.quizPrompt && handleCopy(p.id, p.quizPrompt, true)}
                onEdit={() => openEdit(p)}
                onDelete={() => handleDelete(p)}
              />
            ))}

            {allPrompts.length === 0 && (
              <div className="text-center py-16 text-[var(--fg-muted)] text-[13px]">
                Chưa có prompt nào. Nhấn <strong>Thêm prompt</strong> để bắt đầu.
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Modal ───────────────────────────────────────────────── */}
      {mounted && modalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
          onKeyDown={handleModalKeyDown}>
          <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-[var(--bg-base)] rounded-[12px] p-5 space-y-4"
            style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-[var(--fg-primary)]">
                {editingId ? "Chỉnh sửa prompt" : "Thêm prompt mới"}
              </h2>
              <button onClick={() => setModalOpen(false)}
                className="flex items-center justify-center w-7 h-7 rounded-[6px] text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--fg-muted)] mb-1.5 uppercase tracking-wide">Tiêu đề</label>
                <input
                  ref={titleRef}
                  type="text"
                  placeholder="VD: Email từ vựng ngẫu nhiên"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full h-9 px-3 text-[13px] rounded-[6px] bg-[var(--bg-elevated)] text-[var(--fg-primary)] outline-none"
                  style={{ boxShadow: "var(--shadow-border)" }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--fg-muted)] mb-1.5 uppercase tracking-wide">Nội dung prompt</label>
                <textarea
                  placeholder="Nhập nội dung prompt..."
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={5}
                  className="w-full px-3 py-2.5 text-[13px] rounded-[6px] bg-[var(--bg-elevated)] text-[var(--fg-primary)] outline-none resize-none leading-relaxed"
                  style={{ boxShadow: "var(--shadow-border)" }}
                />
              </div>
              <div>
                {/* Quiz prompt is optional — paste into NotebookLM Customize Quiz dialog */}
                <label className="block text-[11px] font-medium mb-1.5 uppercase tracking-wide" style={{ color: "hsl(38,92%,50%)" }}>
                  Quiz Prompt <span className="normal-case tracking-normal font-normal text-[var(--fg-muted)]">(tuỳ chọn)</span>
                </label>
                <textarea
                  placeholder="Prompt để kiểm tra lại sau khi học, dán vào ô Customize Quiz của NotebookLM..."
                  value={form.quizPrompt}
                  onChange={e => setForm(f => ({ ...f, quizPrompt: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2.5 text-[13px] rounded-[6px] bg-[var(--bg-elevated)] text-[var(--fg-primary)] outline-none resize-none leading-relaxed"
                  style={{ boxShadow: "var(--shadow-border)" }}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setModalOpen(false)}
                className="flex-1 h-9 rounded-[6px] text-[13px] font-medium text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer">
                Hủy
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 h-9 rounded-[6px] text-[13px] font-medium bg-[var(--fg-primary)] text-[var(--bg-base)] hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60">
                {saving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Check className="w-3.5 h-3.5" />}
                {saving ? "Đang lưu..." : editingId ? "Cập nhật" : "Lưu"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── PromptSection ─────────────────────────────────────────────────

function PromptSection({
  label,
  icon,
  text,
  copyLabel,
  copied,
  onCopy,
}: {
  label: string;
  icon?: React.ReactNode;
  text: string;
  copyLabel: string;
  copied: boolean;
  onCopy: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-[6px] bg-[var(--bg-elevated)] overflow-hidden"
      style={{ boxShadow: "var(--shadow-border)" }}>

      {/* ── Section header: label + chevron (accordion toggle) + copy ── */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Left: chevron + label — clicking here toggles expand */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer group/sec text-left"
        >
          <svg
            className="w-3 h-3 shrink-0 text-[var(--fg-muted)] transition-transform duration-150"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--fg-muted)] flex items-center gap-1 shrink-0">
            {icon}{label}
          </span>
          {/* 1-line preview when collapsed */}
          {!expanded && (
            <span className="text-[11.5px] text-[var(--fg-secondary)] truncate min-w-0">
              {text}
            </span>
          )}
        </button>

        {/* Right: copy button — always visible */}
        <Tip label={copied ? "Đã copy!" : copyLabel}>
          <button onClick={onCopy}
            className={cn(
              "flex items-center gap-1 h-5 px-1.5 rounded-[4px] text-[10px] font-medium transition-all cursor-pointer shrink-0",
              copied
                ? "bg-green-100 dark:bg-green-950/40 text-green-600"
                : "text-[#999] hover:bg-[#e0e0e0] dark:hover:bg-[#2a2a2a] hover:text-[var(--fg-primary)]"
            )}>
            {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </Tip>
      </div>

      {/* ── Expanded full text ── */}
      {expanded && (
        <p className="px-3 pb-3 pt-0.5 text-[12.5px] text-[var(--fg-secondary)] leading-relaxed break-words border-t border-[var(--bg-base)]">
          {text}
        </p>
      )}
    </div>
  );
}


// ── PromptCard ────────────────────────────────────────────────────

function PromptCard({
  prompt,
  copied,
  onCopy,
  onCopyQuiz,
  onEdit,
  onDelete,
}: {
  prompt: Prompt;
  copied: string | null;
  onCopy: () => void;
  onCopyQuiz: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isCopied     = copied === prompt.id;
  const isQuizCopied = copied === `quiz-${prompt.id}`;

  return (
    <div className="rounded-[8px] bg-[var(--bg-base)]"
      style={{ boxShadow: "var(--shadow-card)" }}>

      {/* ── Header: title + edit/delete ── */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-3">
        <p className="text-[13px] font-semibold text-[var(--fg-primary)] flex-1 min-w-0 truncate">
          {prompt.title}
        </p>
        {/* Action buttons — always visible for all prompts */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Tip label="Chỉnh sửa">
            <button onClick={onEdit}
              className="flex items-center justify-center w-6 h-6 rounded-[5px] text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] hover:text-[#666] dark:hover:text-[#ccc] transition-colors cursor-pointer">
              <Pencil className="w-3 h-3" />
            </button>
          </Tip>
          <Tip label={prompt.isDefault ? "Ẩn prompt này" : "Xóa prompt"}>
            <button onClick={onDelete}
              className="flex items-center justify-center w-6 h-6 rounded-[5px] text-[#999] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors cursor-pointer">
              <Trash2 className="w-3 h-3" />
            </button>
          </Tip>
        </div>
      </div>

      {/* ── Sections — always visible ── */}
      <div className="px-4 pb-4 space-y-2">
        <PromptSection
          label="Prompt"
          text={prompt.content}
          copyLabel="Copy prompt"
          copied={isCopied}
          onCopy={onCopy}
        />
        {prompt.quizPrompt && (
          <PromptSection
            label="Quiz Prompt"
            icon={<ClipboardCheck className="w-2.5 h-2.5" />}
            text={prompt.quizPrompt}
            copyLabel="Copy Quiz Prompt"
            copied={isQuizCopied}
            onCopy={onCopyQuiz}
          />
        )}
      </div>
    </div>
  );
}
