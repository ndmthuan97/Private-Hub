"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, Copy, Check, Trash2, X, ExternalLink, BookOpen, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const STORAGE_KEY = "ph_notebooklm_prompts";

const NLM_URL = "https://notebooklm.google.com/";

interface Prompt {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

const DEFAULT_PROMPTS: Prompt[] = [
  {
    id: "default-1",
    title: "Email từ vựng ngẫu nhiên",
    content: `Hôm nay hãy lấy ngẫu nhiên 10 từ mới trong file từ vựng này (ưu tiên các từ loại Động từ và Danh từ). Hãy viết cho tôi một đoạn Email công sở (chuẩn Part 7 TOEIC) bằng 100% tiếng Anh bao gồm 10 từ này. Phía sau mỗi từ vựng đó, hãy mở ngoặc đơn và ghi nghĩa tiếng Việt của nó (ví dụ: implement (thực hiện)).`,
    createdAt: 0,
  },
  {
    id: "default-2",
    title: "Giải thích ngữ pháp + bài tập",
    content: `Hãy tóm tắt cho tôi quy tắc cốt lõi nhất của chủ điểm ngữ pháp: '[Điền tên bài/chủ đề bạn muốn học, VD: Rút gọn mệnh đề quan hệ]'. Dùng ngôn ngữ bình dân, dễ hiểu nhất, tuyệt đối không dùng từ ngữ học thuật giáo điều. Sau đó, cho tôi 3 câu bài tập trắc nghiệm siêu ngắn để tôi test thử ngay xem có hiểu lý thuyết chưa nhé.`,
    createdAt: 0,
  },
];

function generateId() {
  return `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function NotebookLMPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [mounted, setMounted] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setPrompts(JSON.parse(raw));
      } else {
        setPrompts(DEFAULT_PROMPTS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PROMPTS));
      }
    } catch {
      setPrompts(DEFAULT_PROMPTS);
    }
  }, []);

  useEffect(() => {
    if (modalOpen) setTimeout(() => titleRef.current?.focus(), 50);
  }, [modalOpen]);

  function saveToStorage(next: Prompt[]) {
    setPrompts(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function handleCopy(id: string, content: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(id);
      toast.success("Đã copy prompt!");
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function openAdd() {
    setEditingId(null);
    setForm({ title: "", content: "" });
    setModalOpen(true);
  }

  function openEdit(p: Prompt) {
    setEditingId(p.id);
    setForm({ title: p.title, content: p.content });
    setModalOpen(true);
  }

  function handleSave() {
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      toast.error("Vui lòng điền đủ tiêu đề và nội dung.");
      return;
    }
    if (editingId) {
      saveToStorage(prompts.map(p => p.id === editingId ? { ...p, title, content } : p));
      toast.success("Đã cập nhật prompt.");
    } else {
      const newPrompt: Prompt = { id: generateId(), title, content, createdAt: Date.now() };
      saveToStorage([...prompts, newPrompt]);
      toast.success("Đã thêm prompt mới.");
    }
    setModalOpen(false);
  }

  function handleDelete(id: string) {
    saveToStorage(prompts.filter(p => p.id !== id));
    toast.success("Đã xóa prompt.");
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
          <a href={NLM_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors shrink-0"
            style={{ boxShadow: "var(--shadow-border)" }}>
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mở NotebookLM</span>
            <span className="sm:hidden">Mở</span>
          </a>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────── */}
      <main className="flex-1 px-5 md:px-8 py-6 max-w-3xl w-full mx-auto">
        {/* Add button */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-[13px] text-[var(--fg-muted)]">
            {prompts.length} prompt{prompts.length !== 1 ? "s" : ""}
          </p>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium bg-[var(--fg-primary)] text-[var(--bg-base)] hover:opacity-90 transition-opacity cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            Thêm prompt
          </button>
        </div>

        {/* Prompt list */}
        <div className="space-y-3">
          {prompts.map(p => (
            <PromptCard
              key={p.id}
              prompt={p}
              copied={copied === p.id}
              onCopy={() => handleCopy(p.id, p.content)}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}

          {prompts.length === 0 && (
            <div className="text-center py-16 text-[var(--fg-muted)] text-[13px]">
              Chưa có prompt nào. Nhấn <strong>Thêm prompt</strong> để bắt đầu.
            </div>
          )}
        </div>
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
                  rows={6}
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
              <button onClick={handleSave}
                className="flex-1 h-9 rounded-[6px] text-[13px] font-medium bg-[var(--fg-primary)] text-[var(--bg-base)] hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                {editingId ? "Cập nhật" : "Lưu"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function PromptCard({
  prompt,
  copied,
  onCopy,
  onEdit,
  onDelete,
}: {
  prompt: Prompt;
  copied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = prompt.content.length > 200;
  const displayContent = isLong && !expanded ? prompt.content.slice(0, 200) + "…" : prompt.content;

  return (
    <div className="rounded-[8px] bg-[var(--bg-base)] p-4 group/card"
      style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[var(--fg-primary)] mb-2">{prompt.title}</p>
          <p className="text-[13px] text-[var(--fg-secondary)] leading-relaxed whitespace-pre-wrap break-words">
            {displayContent}
          </p>
          {isLong && (
            <button onClick={() => setExpanded(v => !v)}
              className="mt-1.5 text-[12px] text-[hsl(217,91%,60%)] hover:underline cursor-pointer">
              {expanded ? "Thu gọn" : "Xem thêm"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
          <button onClick={onEdit}
            className="flex items-center justify-center w-7 h-7 rounded-[6px] text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] hover:text-[#666] dark:hover:text-[#ccc] transition-colors cursor-pointer"
            title="Chỉnh sửa">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="flex items-center justify-center w-7 h-7 rounded-[6px] text-[#999] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors cursor-pointer"
            title="Xóa">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onCopy}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] text-[11px] font-medium transition-all cursor-pointer",
              copied
                ? "bg-green-50 dark:bg-green-950/30 text-green-600"
                : "bg-[var(--bg-elevated)] text-[var(--fg-muted)] hover:text-[var(--fg-primary)]"
            )}>
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
