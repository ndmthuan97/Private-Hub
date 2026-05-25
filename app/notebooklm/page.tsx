"use client";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Plus, Copy, Check, Trash2, X, ExternalLink,
  BookOpen, Pencil, ClipboardCheck, Loader2,
  Folder, FolderOpen, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tip } from "@/components/ui/tip";

const NLM_URL = "https://notebooklm.google.com/";

interface Prompt {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/* ── Prompt modal (add / edit) ─────────────────────────────────────── */
function PromptModal({
  initial,
  defaultTitle,
  allTitles,
  onClose,
  onSave,
  onDelete,
}: {
  initial: Prompt | null;
  defaultTitle?: string;
  allTitles: string[];
  onClose: () => void;
  onSave: (id: string | null, data: { title: string; content: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const isEdit = !!initial;
  const [form, setForm]       = useState({
    title:      initial?.title      ?? defaultTitle ?? "",
    content:    initial?.content    ?? "",
  });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => titleRef.current?.focus(), 50); }, []);

  async function handleSave() {
    const title      = form.title.trim();
    const content    = form.content.trim();
    if (!title || !content) { toast.error("Tiêu đề và nội dung không được để trống."); return; }
    setSaving(true);
    try {
      await onSave(initial?.id ?? null, { title, content });
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Lưu thất bại."); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!initial || !onDelete) return;
    if (!confirm("Xóa prompt này? Không thể hoàn tác.")) return;
    setDeleting(true);
    try { await onDelete(initial.id); onClose(); }
    catch { toast.error("Xóa thất bại."); }
    finally { setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onKeyDown={e => e.key === "Escape" && onClose()}>
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-[#111] rounded-[12px] flex flex-col max-h-[90vh] overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ boxShadow: "rgba(0,0,0,0.06) 0 1px 0 0" }}>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#999]">Prompt</p>
            <p className="text-[18px] font-semibold text-[#171717] dark:text-[#f5f5f5] mt-0.5">
              {isEdit ? "Chỉnh sửa" : "Thêm mới"}
            </p>
          </div>
          <Tip label="Đóng">
            <button onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <X className="w-4 h-4" />
            </button>
          </Tip>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-[#999] mb-1.5 uppercase tracking-widest">
              Tiêu đề
            </label>
            <input
              ref={titleRef}
              list="prompt-titles-dl"
              placeholder="VD: Email từ vựng ngẫu nhiên"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full h-10 px-3 text-[14px] rounded-[7px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
              style={{ boxShadow: "var(--shadow-border)" }}
            />
            <datalist id="prompt-titles-dl">
              {allTitles.map(t => <option key={t} value={t} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#999] mb-1.5 uppercase tracking-widest">
              Nội dung prompt
            </label>
            <textarea
              rows={6}
              placeholder="Nhập nội dung prompt..."
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              className="w-full px-3 py-2.5 text-[13px] rounded-[7px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] resize-none leading-relaxed"
              style={{ boxShadow: "var(--shadow-border)" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 shrink-0 grid grid-cols-2 gap-2"
          style={{ boxShadow: "rgba(0,0,0,0.06) 0 -1px 0 0" }}>
          {isEdit ? (
            <>
              <button onClick={handleDelete} disabled={deleting}
                className="h-10 rounded-[7px] text-[13px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                style={{ boxShadow: "var(--shadow-border)" }}>
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Xóa
              </button>
              <button onClick={handleSave} disabled={saving}
                className="h-10 rounded-[7px] text-[14px] font-medium flex items-center justify-center gap-1.5 bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? "Đang lưu..." : "Cập nhật"}
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose}
                className="h-10 rounded-[7px] text-[14px] font-medium text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                style={{ boxShadow: "var(--shadow-border)" }}>
                Hủy
              </button>
              <button onClick={handleSave} disabled={saving}
                className="h-10 rounded-[7px] text-[14px] font-medium flex items-center justify-center gap-1.5 bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Folder rename dialog ──────────────────────────────────────────── */
function RenameFolderDialog({
  currentName,
  onClose,
  onSave,
}: {
  currentName: string;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>;
}) {
  const [name, setName]   = useState(currentName);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try { await onSave(trimmed); onClose(); }
    catch { toast.error("Đổi tên thất bại."); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-[12px] bg-white dark:bg-[#111] overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ boxShadow: "rgba(0,0,0,0.06) 0 1px 0 0" }}>
          <p className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Đổi tên nhóm</p>
          <Tip label="Đóng">
            <button onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </Tip>
        </div>
        <div className="px-5 py-4 space-y-4">
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") onClose(); }}
            className="w-full h-10 px-3 text-[14px] rounded-[7px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
            style={{ boxShadow: "var(--shadow-border)" }}
          />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onClose}
              className="h-9 rounded-[7px] text-[13px] font-medium text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              Hủy
            </button>
            <button onClick={handleSave} disabled={saving}
              className="h-9 rounded-[7px] text-[13px] font-medium flex items-center justify-center gap-1.5 bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Item row inside folder ────────────────────────────────────────── */
function PromptRow({
  title,
  content,
  copyKey,
  copied,
  onCopy,
  onEdit,
}: {
  title: string;
  content: string;
  copyKey: string;
  copied: string | null;
  onCopy: () => void;
  onEdit?: () => void;
}) {
  const isCopied = copied === copyKey;

  return (
    <div className="group flex items-start gap-3 px-3 py-2.5 rounded-[7px] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors">
      {/* Icon */}
      <div className="shrink-0 w-6 h-6 rounded-[5px] flex items-center justify-center bg-[#f0f0f0] dark:bg-[#222] mt-0.5">
        <ClipboardCheck className="w-3 h-3 text-[#999]" />
      </div>

      {/* Content — full width, single line truncated */}
      <p className="flex-1 min-w-0 text-[13px] text-[#171717] dark:text-[#f5f5f5] truncate">
        {content.replace(/^#+\s*/gm, "").replace(/\*\*|__|_|\*|`/g, "").replace(/\n+/g, " ")}
      </p>

      {/* Actions — visible on row hover */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tip label={isCopied ? "Đã copy!" : "Copy"}>
          <button onClick={onCopy}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-[4px] transition-colors cursor-pointer",
              isCopied
                ? "text-green-500 bg-green-50 dark:bg-green-950/30"
                : "text-[#bbb] hover:text-blue-500"
            )}
            style={{ boxShadow: "var(--shadow-border)" }}>
            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        </Tip>
        {onEdit && (
          <Tip label="Chỉnh sửa">
            <button onClick={onEdit}
              className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#bbb] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <Pencil className="w-3 h-3" />
            </button>
          </Tip>
        )}
      </div>
    </div>
  );
}

/* ── Folder section (Strategy-style) ──────────────────────────────── */
function FolderSection({
  title,
  items,
  copied,
  onCopy,
  onEdit,
  onAdd,
  onRename,
  onDeleteFolder,
}: {
  title: string;
  items: Prompt[];
  copied: string | null;
  onCopy: (id: string, content: string, isQuiz?: boolean) => void;
  onEdit: (p: Prompt) => void;
  onAdd: () => void;
  onRename: () => void;
  onDeleteFolder: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-[10px] bg-white dark:bg-[#111] overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}>

      {/* Folder header */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 group/header">
        {/* Chevron toggle */}
        <Tip label={open ? "Thu gọn" : "Mở rộng"}>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#bbb] hover:text-[#555] dark:hover:text-[#ccc] transition-colors cursor-pointer shrink-0">
            <ChevronDown
              className="w-3.5 h-3.5 transition-transform duration-150"
              style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
            />
          </button>
        </Tip>

        {/* Folder icon */}
        {open
          ? <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
          : <Folder className="w-4 h-4 text-amber-500 shrink-0" />
        }

        {/* Folder name */}
        <span className="flex-1 min-w-0 text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] truncate">
          {title}
        </span>

        {/* Action buttons — visible on hover */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/header:opacity-100 transition-opacity">
          <Tip label="Thêm prompt">
            <button onClick={e => { e.stopPropagation(); onAdd(); }}
              className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#bbb] hover:text-blue-500 transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <Plus className="w-3 h-3" />
            </button>
          </Tip>
          <Tip label="Đổi tên nhóm">
            <button onClick={e => { e.stopPropagation(); onRename(); }}
              className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#bbb] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <Pencil className="w-3 h-3" />
            </button>
          </Tip>
          <Tip label="Xóa nhóm">
            <button onClick={e => { e.stopPropagation(); onDeleteFolder(); }}
              className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#bbb] hover:text-red-500 transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <Trash2 className="w-3 h-3" />
            </button>
          </Tip>
        </div>
      </div>

      {/* Item rows */}
      {open && (
        <div className="border-t border-[#f0f0f0] dark:border-[#1f1f1f] px-2 py-1">
          {items.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-[12px] text-[#bbb]">
                Chưa có prompt — {" "}
                <button onClick={onAdd} className="text-blue-500 hover:underline cursor-pointer">
                  thêm ngay
                </button>
              </p>
            </div>
          ) : (
            items.map(p => (
              <PromptRow
                key={p.id}
                title="Prompt"
                content={p.content}
                copyKey={p.id}
                copied={copied}
                onCopy={() => onCopy(p.id, p.content)}
                onEdit={() => onEdit(p)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────── */
export default function NotebookLMPage() {
  const [prompts, setPrompts]         = useState<Prompt[]>([]);
  const [loading, setLoading]         = useState(true);
  const [copied, setCopied]           = useState<string | null>(null);
  const [mounted, setMounted]         = useState(false);
  const [modalTarget, setModalTarget] = useState<null | "add" | Prompt>(null);
  const [addDefaultTitle, setAddDefaultTitle] = useState("");
  const [renameTarget, setRenameTarget]       = useState<string | null>(null);

  useEffect(() => { setMounted(true); fetchPrompts(); }, []);

  async function fetchPrompts() {
    try {
      const res  = await fetch("/api/notebooklm/prompts");
      const json = await res.json();
      setPrompts(json.data ?? []);
    } catch { toast.error("Không tải được danh sách prompt."); }
    finally { setLoading(false); }
  }

  /* Copy */
  function handleCopy(id: string, content: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(id);
      toast.success("Đã copy prompt!");
      setTimeout(() => setCopied(null), 2000);
    });
  }

  /* Save — handles both create and update */
  async function handleSave(
    id: string | null,
    data: { title: string; content: string }
  ) {
    if (id) {
      const res  = await fetch(`/api/notebooklm/prompts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setPrompts(prev => prev.map(p => p.id === id ? json.data : p));
      toast.success("Đã cập nhật prompt.");
    } else {
      const res  = await fetch("/api/notebooklm/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setPrompts(prev => [...prev, json.data]);
      toast.success("Đã thêm prompt mới.");
    }
  }

  /* Delete single prompt */
  async function handleDelete(id: string) {
    const res = await fetch(`/api/notebooklm/prompts/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Xóa thất bại");
    setPrompts(prev => prev.filter(p => p.id !== id));
    toast.success("Đã xóa prompt.");
  }

  /* Rename all prompts in a group */
  async function handleRenameGroup(oldTitle: string, newTitle: string) {
    const targets = prompts.filter(p => p.title === oldTitle);
    await Promise.all(
      targets.map(p =>
        fetch(`/api/notebooklm/prompts/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        })
      )
    );
    setPrompts(prev => prev.map(p => p.title === oldTitle ? { ...p, title: newTitle } : p));
    toast.success("Đã đổi tên nhóm.");
  }

  /* Delete all prompts in a group */
  function handleDeleteGroup(title: string) {
    const targets = prompts.filter(p => p.title === title);
    toast.warning(`Xóa nhóm "${title}"? Tất cả ${targets.length} prompt sẽ bị xóa.`, {
      action: {
        label: "Xóa",
        onClick: async () => {
          try {
            await Promise.all(targets.map(p =>
              fetch(`/api/notebooklm/prompts/${p.id}`, { method: "DELETE" })
            ));
            setPrompts(prev => prev.filter(p => p.title !== title));
            toast.success("Đã xóa nhóm.");
          } catch { toast.error("Xóa thất bại."); }
        },
      },
      cancel: { label: "Hủy", onClick: () => {} },
      duration: 6000,
    });
  }

  /* Group prompts by title */
  const groups = (() => {
    const map = new Map<string, Prompt[]>();
    for (const p of prompts) {
      if (!map.has(p.title)) map.set(p.title, []);
      map.get(p.title)!.push(p);
    }
    return Array.from(map.entries());
  })();

  const allTitles = groups.map(([t]) => t);

  function openAdd(defaultTitle = "") {
    setAddDefaultTitle(defaultTitle);
    setModalTarget("add");
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-base)] pt-14 md:pt-0">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-[var(--bg-base)] px-5 md:px-8"
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
      <main className="flex-1 px-5 md:px-8 py-6 w-full">
        <div className="flex items-center justify-end mb-5">
          <Tip label="Thêm prompt mới">
            <button onClick={() => openAdd()}
              className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[var(--fg-primary)] text-[var(--bg-base)] hover:opacity-90 transition-opacity cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </Tip>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-[var(--fg-muted)]">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span className="text-[13px]">Đang tải prompts...</span>
          </div>
        )}

        {!loading && (
          <div className="space-y-3">
            {groups.map(([title, items]) => (
              <FolderSection
                key={title}
                title={title}
                items={items}
                copied={copied}
                onCopy={handleCopy}
                onEdit={p => setModalTarget(p)}
                onAdd={() => openAdd(title)}
                onRename={() => setRenameTarget(title)}
                onDeleteFolder={() => handleDeleteGroup(title)}
              />
            ))}
            {prompts.length === 0 && (
              <div className="text-center py-16 text-[var(--fg-muted)] text-[13px]">
                Chưa có prompt nào. Nhấn <strong>+</strong> để thêm.
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Prompt modal ─────────────────────────────────────────── */}
      {mounted && modalTarget !== null && createPortal(
        <PromptModal
          initial={modalTarget === "add" ? null : modalTarget}
          defaultTitle={modalTarget === "add" ? addDefaultTitle : undefined}
          allTitles={allTitles}
          onClose={() => setModalTarget(null)}
          onSave={handleSave}
          onDelete={modalTarget !== "add" ? handleDelete : undefined}
        />,
        document.body
      )}

      {/* ── Rename group dialog ──────────────────────────────────── */}
      {mounted && renameTarget !== null && createPortal(
        <RenameFolderDialog
          currentName={renameTarget}
          onClose={() => setRenameTarget(null)}
          onSave={newName => handleRenameGroup(renameTarget, newName)}
        />,
        document.body
      )}
    </div>
  );
}
