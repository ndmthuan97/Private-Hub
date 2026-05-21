"use client";
import { useState, useCallback, useEffect, useRef, useMemo, isValidElement, cloneElement, createElement, Fragment } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  Plus, X, Check, Loader2, Pencil, Trash2, FileText, Link2,
  ExternalLink, ArrowLeft, Eye, Wand2, ClipboardPaste,
  FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown,
  ChevronLeft, MoreHorizontal, Bookmark, MessageSquarePlus,
  StickyNote,
} from "lucide-react";
import TurndownService from "turndown";
import type { Roadmap, StrategyFolder } from "@/db/schema";
import { Tip } from "@/components/ui/tip";

/* ── Constants ──────────────────────────────────────────────── */
const FOLDERS_PER_PAGE = 5;
const ITEMS_PER_FOLDER = 5;

/* ── Types ─────────────────────────────────────────────────── */
type FormState = { title: string; type: "markdown" | "embed"; content: string; folderId: string | null };
const EMPTY: FormState = { title: "", type: "markdown", content: "", folderId: null };

/* ── Helpers ────────────────────────────────────────────────── */
function htmlToMarkdown(html: string): string {
  const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });
  td.addRule("strikethrough", {
    filter: ["del", "s"],
    replacement: (content) => `~~${content}~~`,
  });
  return td.turndown(html).trim();
}

function convertToMarkdown(raw: string): string {
  return raw
    .split("\n")
    .map(line => {
      const headingMatch = line.match(/^\*\*(\d+\.\s+.+?)\*\*\s*$/) || line.match(/^\*\*(.+?)\*\*\s*$/);
      if (headingMatch) return `## ${headingMatch[1].replace(/:$/, "").trim()}`;
      if (/^    \*   /.test(line)) return line.replace(/^    \*   /, "    - ");
      if (/^\*   /.test(line)) return line.replace(/^\*   /, "- ");
      return line;
    })
    .join("\n")
    .trim();
}

function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    const h = u.hostname.replace("www.", "");
    if (h === "docs.google.com") {
      const base = u.pathname.replace(/\/(edit|view|preview|embed|htmlview|pub)(\/.*)?$/, "");
      if (url.includes("/presentation/")) return `https://docs.google.com${base}/embed`;
      if (url.includes("/spreadsheets/")) return `https://docs.google.com${base}/htmlview`;
      if (url.includes("/document/"))     return `https://docs.google.com${base}/preview`;
    }
    if (h === "drive.google.com") {
      const base = u.pathname.replace(/\/(view|edit|preview)(\/.*)?$/, "");
      return `https://drive.google.com${base}/preview`;
    }
  } catch { /* keep original */ }
  return url;
}

function detectFileType(url: string): { label: string; color: string; bg: string } {
  try {
    const h = new URL(url).hostname.replace("www.", "");
    if (h === "docs.google.com") {
      if (url.includes("/spreadsheets/")) return { label: "Google Sheets", color: "#16a34a", bg: "bg-green-50 dark:bg-green-950/30" };
      if (url.includes("/document/"))     return { label: "Google Docs",   color: "#2563eb", bg: "bg-blue-50 dark:bg-blue-950/30" };
      if (url.includes("/presentation/")) return { label: "Google Slides", color: "#ea580c", bg: "bg-orange-50 dark:bg-orange-950/30" };
      return { label: "Google Drive", color: "#2563eb", bg: "bg-blue-50 dark:bg-blue-950/30" };
    }
    if (h === "drive.google.com") return { label: "Google Drive", color: "#2563eb", bg: "bg-blue-50 dark:bg-blue-950/30" };
    if (h.includes("youtube.com") || h === "youtu.be") return { label: "YouTube",  color: "#dc2626", bg: "bg-red-50 dark:bg-red-950/30" };
    if (h.includes("notion.so"))  return { label: "Notion",  color: "#555",    bg: "bg-gray-100 dark:bg-gray-800/40" };
    if (h.includes("figma.com"))  return { label: "Figma",   color: "#a855f7", bg: "bg-purple-50 dark:bg-purple-950/30" };
    if (h.includes("miro.com"))   return { label: "Miro",    color: "#f59e0b", bg: "bg-yellow-50 dark:bg-yellow-950/30" };
    return { label: h, color: "#666", bg: "bg-gray-100 dark:bg-gray-800/40" };
  } catch { return { label: "URL", color: "#666", bg: "bg-gray-100 dark:bg-gray-800/40" }; }
}

function TypeBadge({ type, url }: { type: string; url?: string }) {
  if (type === "embed" && url) {
    const { label, color, bg } = detectFileType(url);
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${bg}`} style={{ color }}>{label}</span>;
  }
  return <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/30 text-purple-500 font-medium whitespace-nowrap">Markdown</span>;
}

/* ── Folder Dialog (create / rename) ───────────────────────── */
function FolderDialog({ initial, onClose, onSaved }: {
  initial?: StrategyFolder; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial;

  async function handleSave() {
    if (!name.trim()) { toast.error("Nhập tên folder"); return; }
    setSaving(true);
    try {
      const url    = isEdit ? `/api/strategy/folders/${initial!.id}` : "/api/strategy/folders";
      const method = isEdit ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const j = await r.json();
      if (r.ok) { toast.success(isEdit ? "Đã đổi tên" : "Đã tạo folder"); onSaved(); }
      else toast.error(j.message ?? "Lỗi");
    } catch { toast.error("Lỗi kết nối"); }
    finally { setSaving(false); }
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full max-w-sm rounded-[12px] bg-white dark:bg-[#111] overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
          <p className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5]">
            {isEdit ? "Đổi tên folder" : "Tạo folder mới"}
          </p>
          <Tip label="Đóng">
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          </Tip>
        </div>
        <div className="px-5 py-4 space-y-4">
          <input autoFocus type="text" placeholder="VD: Học ngoại ngữ, Tài chính..."
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
            className="w-full h-10 px-3 text-[14px] rounded-[7px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
            style={{ boxShadow: "var(--shadow-border)" }} />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onClose} className="h-9 rounded-[7px] text-[13px] font-medium text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer" style={{ boxShadow: "var(--shadow-border)" }}>Hủy</button>
            <button onClick={handleSave} disabled={saving}
              className="h-9 rounded-[7px] text-[13px] font-medium flex items-center justify-center gap-1.5 bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Form dialog (item) ─────────────────────────────────────── */
function FormDialog({ initial, folders, defaultFolderId, onClose, onSaved }: {
  initial?: Roadmap;
  folders: StrategyFolder[];
  defaultFolderId?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? { title: initial.title, type: initial.type as "markdown" | "embed", content: initial.content, folderId: initial.folderId ?? null }
      : { ...EMPTY, folderId: defaultFolderId ?? null },
  );
  const [saving, setSaving]       = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [rawText, setRawText]     = useState("");
  const isEdit = !!initial;

  function handleConvert() {
    const md = convertToMarkdown(rawText);
    setForm(f => ({ ...f, content: md }));
    setPasteMode(false);
    setRawText("");
    toast.success("Đã chuyển đổi sang Markdown");
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error("Nhập tiêu đề"); return; }
    if (!form.content.trim()) { toast.error("Nhập nội dung hoặc URL"); return; }
    setSaving(true);
    try {
      const url    = isEdit ? `/api/strategy/${initial!.id}` : "/api/strategy/items";
      const method = isEdit ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const j = await r.json();
      if (r.ok) { toast.success(isEdit ? "Đã cập nhật" : "Đã thêm"); onSaved(); }
      else toast.error(j.message ?? "Lỗi");
    } catch { toast.error("Lỗi kết nối"); }
    finally { setSaving(false); }
  }

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-[12px] bg-white dark:bg-[#111] overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#999]">Strategy</p>
            <p className="text-[18px] font-semibold text-[#171717] dark:text-[#f5f5f5] mt-0.5">{isEdit ? "Chỉnh sửa" : "Thêm mới"}</p>
          </div>
          <Tip label="Đóng">
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer" style={{ boxShadow: "var(--shadow-border)" }}>
              <X className="w-4 h-4" />
            </button>
          </Tip>
        </div>
        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-widest text-[#999] mb-1.5 block">Tiêu đề</label>
            <input autoFocus type="text" placeholder="VD: Lộ trình học TOEIC"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full h-10 px-3 text-[14px] rounded-[7px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
              style={{ boxShadow: "var(--shadow-border)" }} />
          </div>
          {/* Folder picker */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-widest text-[#999] mb-1.5 block">Folder</label>
            <select
              value={form.folderId ?? ""}
              onChange={e => setForm(f => ({ ...f, folderId: e.target.value || null }))}
              className="w-full h-10 px-3 text-[13px] rounded-[7px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <option value="">— Không có folder —</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          {/* Type toggle */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-widest text-[#999] mb-1.5 block">Loại</label>
            <div className="flex gap-2">
              {(["markdown", "embed"] as const).map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-[7px] text-[13px] font-medium transition-all cursor-pointer"
                  style={{ boxShadow: form.type === t ? "none" : "var(--shadow-border)", background: form.type === t ? "#171717" : undefined, color: form.type === t ? "white" : "#888" }}>
                  {t === "markdown" ? <FileText className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                  {t === "markdown" ? "Markdown" : "Embed URL"}
                </button>
              ))}
            </div>
          </div>
          {/* Content */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium uppercase tracking-widest text-[#999]">
                {form.type === "markdown" ? "Nội dung (Markdown)" : "URL nhúng"}
              </label>
              {form.type === "markdown" && (
                <Tip label={pasteMode ? "Huỷ dán" : "Dán văn bản từ Word/Docs"}>
                  <button type="button" onClick={() => { setPasteMode(p => !p); setRawText(""); }}
                    className={`flex items-center gap-1.5 h-6 px-2.5 rounded-[5px] text-[11px] font-medium transition-all cursor-pointer ${pasteMode ? "bg-amber-500 text-white" : "text-[#888] hover:text-[#171717] dark:hover:text-[#f5f5f5]"}`}
                    style={pasteMode ? undefined : { boxShadow: "var(--shadow-border)" }}>
                    <ClipboardPaste className="w-3 h-3" />
                    {pasteMode ? "Huỷ" : "Dán"}
                  </button>
                </Tip>
              )}
            </div>

            {form.type === "markdown" && pasteMode && (
              <div className="mb-3 rounded-[8px] border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200 dark:border-amber-800">
                  <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Dán từ Google Docs / Word / web — tự giữ style</span>
                  <button type="button" onClick={handleConvert} disabled={!rawText.trim()}
                    className="flex items-center gap-1.5 h-6 px-3 rounded-[5px] text-[11px] font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-40 cursor-pointer transition-colors">
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
                      const md = htmlToMarkdown(html);
                      setForm(f => ({ ...f, content: md }));
                      setPasteMode(false);
                      setRawText("");
                      toast.success("Đã chuyển đổi sang Markdown");
                    }
                  }}
                  rows={8}
                  className="w-full px-3 py-2.5 text-[12px] bg-transparent text-[#333] dark:text-[#ddd] resize-none leading-relaxed outline-none"
                />
              </div>
            )}

            {form.type === "markdown" ? (
              <textarea placeholder={"# Tiêu đề\n\n## Giai đoạn 1\n- [ ] Bước 1\n- [ ] Bước 2"}
                value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={pasteMode ? 6 : 14}
                className="w-full px-3 py-2.5 text-[13px] font-mono rounded-[7px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] resize-none leading-relaxed"
                style={{ boxShadow: "var(--shadow-border)" }} />
            ) : (
              <input type="url" placeholder="https://..."
                value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                className="w-full h-10 px-3 text-[13px] rounded-[7px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
                style={{ boxShadow: "var(--shadow-border)" }} />
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 px-5 pb-5 pt-2 shrink-0">
          <button onClick={onClose} className="h-10 rounded-[7px] text-[14px] font-medium text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer" style={{ boxShadow: "var(--shadow-border)" }}>Hủy</button>
          <button onClick={handleSave} disabled={saving}
            className="h-10 rounded-[7px] text-[14px] font-medium flex items-center justify-center gap-1.5 bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Annotations ───────────────────────────────────── */
interface Annotation {
  id: string;
  selectedText: string;
  note: string;
  createdAt: string;
}

function annotationKey(itemId: string) { return `ph_ann_${itemId}`; }

function loadAnnotations(itemId: string): Annotation[] {
  try { return JSON.parse(localStorage.getItem(annotationKey(itemId)) ?? "[]"); }
  catch { return []; }
}

function saveAnnotations(itemId: string, list: Annotation[]) {
  localStorage.setItem(annotationKey(itemId), JSON.stringify(list));
}

/* ── Selection toolbar (mini floating button) ───── */
function SelectionToolbar({ x, y, onNote }: {
  x: number; y: number; onNote: () => void;
}) {
  const clampedX = Math.max(60, Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 800) - 60));
  if (typeof window === "undefined") return null;
  return createPortal(
    <div
      style={{
        position: "fixed",
        top: y - 10,
        left: clampedX,
        transform: "translate(-50%, -100%)",
        zIndex: 600,
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Arrow */}
      <div style={{
        position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "5px solid transparent",
        borderRight: "5px solid transparent",
        borderTop: "5px solid #f59e0b",
      }} />
      <button
        onClick={onNote}
        className="flex items-center gap-1.5 h-7 px-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-[12px] font-semibold shadow-lg transition-colors cursor-pointer"
      >
        <Bookmark className="w-3 h-3" />
        Ghi chú
      </button>
    </div>,
    document.body,
  );
}

/* ── Annotation floating popup ────────────────────── */
function AnnotationPopup({ text, x, y, onSave, onClose }: {
  text: string;
  x: number;
  y: number;
  onSave: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  // Keep popup within viewport bounds
  const clampedX = Math.max(160, Math.min(x, (typeof window !== "undefined" ? window.innerWidth : 800) - 160));

  if (typeof window === "undefined") return null;
  return createPortal(
    <div
      style={{
        position: "fixed",
        top: y - 12,
        left: clampedX,
        transform: "translate(-50%, -100%)",
        zIndex: 600,
        minWidth: 280,
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Arrow */}
      <div style={{
        position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "6px solid transparent",
        borderRight: "6px solid transparent",
        borderTop: "6px solid white",
        filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.1))",
      }} className="dark:![border-top-color:#1f1f1f]" />
      <div className="rounded-[12px] bg-white dark:bg-[#1f1f1f] overflow-hidden"
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.16), 0 1px 4px rgba(0,0,0,0.08)" }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#f0f0f0] dark:border-[#2a2a2a]">
          <Bookmark className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#999] flex-1">Ghi chú</span>
          <button onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded text-[#bbb] hover:text-[#555] dark:hover:text-[#ccc] transition-colors cursor-pointer">
            <X className="w-3 h-3" />
          </button>
        </div>
        {/* Quoted selection */}
        <div className="px-3 pt-2.5">
          <p className="text-[11px] italic text-[#888] dark:text-[#777] bg-amber-50 dark:bg-amber-950/20 rounded-[6px] px-2 py-1.5 border-l-2 border-amber-400 line-clamp-2">
            &ldquo;{text}&rdquo;
          </p>
        </div>
        {/* Note input */}
        <div className="px-3 pt-2 pb-3 space-y-2">
          <textarea
            ref={inputRef}
            placeholder="Nhập ghi chú… (Enter để lưu)"
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Escape") { onClose(); return; }
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (note.trim()) onSave(note.trim()); }
            }}
            rows={2}
            className="w-full px-2.5 py-2 text-[12px] rounded-[7px] bg-[#fafafa] dark:bg-[#111] text-[#171717] dark:text-[#f5f5f5] resize-none leading-relaxed"
            style={{ boxShadow: "var(--shadow-border)" }}
          />
          <div className="flex gap-1.5">
            <button onClick={onClose}
              className="flex-1 h-7 text-[12px] font-medium text-[#666] dark:text-[#888] rounded-[6px] hover:bg-[#f5f5f5] dark:hover:bg-[#2a2a2a] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>Hủy</button>
            <button onClick={() => note.trim() && onSave(note.trim())} disabled={!note.trim()}
              className="flex-1 h-7 text-[12px] font-medium bg-amber-500 hover:bg-amber-600 text-white rounded-[6px] transition-colors cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1">
              <Bookmark className="w-3 h-3" />Lưu
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Annotation inline highlight (hover/tap tooltip) ── */
function AnnotationHighlight({ text, note }: { text: string; note: string }) {
  const [open, setOpen] = useState(false);
  return createElement(
    "mark",
    {
      className: "relative bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 rounded-[3px] px-0.5 cursor-help",
      onMouseEnter: () => setOpen(true),
      onMouseLeave: () => setOpen(false),
      onClick: (e: React.MouseEvent) => { e.stopPropagation(); setOpen(v => !v); },
    },
    text,
    open && createElement(
      "span",
      {
        className: "absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 block pointer-events-none",
        style: { minWidth: 180, maxWidth: 240 },
      },
      // Downward arrow
      createElement("span", {
        style: {
          position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%)",
          width: 0, height: 0,
          borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
          borderTop: "5px solid white",
        },
        className: "dark:![border-top-color:#1f1f1f]",
      }),
      createElement(
        "span",
        {
          className: "block rounded-[10px] bg-white dark:bg-[#1f1f1f] px-3 py-2.5",
          style: { boxShadow: "0 4px 24px rgba(0,0,0,0.16)" },
        },
        createElement("span", { className: "flex items-center gap-1.5 mb-1.5" },
          createElement(Bookmark, { className: "w-3 h-3 text-amber-500 shrink-0" }),
          createElement("span", { className: "text-[10px] font-semibold uppercase tracking-widest text-[#999]" }, "Ghi chú"),
        ),
        createElement("span", { className: "text-[12px] text-[#333] dark:text-[#ccc] leading-relaxed block" }, note),
      ),
    ),
  );
}

// Find the earliest annotation match in a string and return highlighted nodes
function processTextNode(text: string, anns: Annotation[]): React.ReactNode {
  if (!anns.length || !text) return text;
  let earliest: { ann: Annotation; idx: number } | null = null;
  for (const ann of anns) {
    const idx = text.indexOf(ann.selectedText);
    if (idx !== -1 && (!earliest || idx < earliest.idx)) earliest = { ann, idx };
  }
  if (!earliest) return text;
  const { ann, idx } = earliest;
  const before = text.slice(0, idx);
  const after  = text.slice(idx + ann.selectedText.length);
  return createElement(Fragment, {},
    before,
    createElement(AnnotationHighlight, { key: ann.id, text: ann.selectedText, note: ann.note }),
    processTextNode(after, anns),
  );
}

// Recursively walk React nodes, injecting highlights into text nodes
function injectHighlights(node: React.ReactNode, anns: Annotation[]): React.ReactNode {
  if (!anns.length) return node;
  if (typeof node === "string") return processTextNode(node, anns);
  if (Array.isArray(node)) {
    return (node as React.ReactNode[]).map((child, i) =>
      createElement(Fragment, { key: i }, injectHighlights(child, anns))
    );
  }
  if (isValidElement(node)) {
    // Don't process code blocks — preserve exact whitespace/content
    const t = (node as React.ReactElement).type;
    if (t === "code" || t === "pre") return node;
    const el = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (!el.props?.children) return node;
    return cloneElement(el, {}, injectHighlights(el.props.children, anns));
  }
  return node;
}

/* ── Detail view ───────────────────────────────────── */
function DetailView({ item, onBack, onEdit, onDelete }: {
  item: Roadmap; onBack: () => void; onEdit: () => void; onDelete: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>(() =>
    typeof window !== "undefined" ? loadAnnotations(item.id) : []
  );
  const [annPanel, setAnnPanel] = useState(false);
  // selection = position of current text selection; notePopupOpen = full popup is open
  const [selectionData, setSelectionData] = useState<{ text: string; x: number; y: number } | null>(null);
  const [notePopupOpen, setNotePopupOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Persist annotations whenever they change
  useEffect(() => { saveAnnotations(item.id, annotations); }, [item.id, annotations]);

  // Deduplicate by selectedText (keep most-recent per unique text for highlight)
  const uniqueAnns = useMemo(() => {
    const seen = new Set<string>();
    return annotations.filter(a => { if (seen.has(a.selectedText)) return false; seen.add(a.selectedText); return true; });
  }, [annotations]);

  // ReactMarkdown component overrides — inject annotation highlights into text nodes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mdComponents = useMemo((): Record<string, any> => {
    if (!uniqueAnns.length) return {};
    const wrap = (children: React.ReactNode) => injectHighlights(children, uniqueAnns);
    // Factory: wrap any HTML tag's children with highlight injection (strip `node` prop)
    const W = (tag: string) => ({ children, node: _node, ...p }: Record<string, unknown>) =>
      createElement(tag, p, wrap(children as React.ReactNode));
    return {
      p: W("p"), li: W("li"),
      h1: W("h1"), h2: W("h2"), h3: W("h3"), h4: W("h4"), h5: W("h5"), h6: W("h6"),
      strong: W("strong"), em: W("em"),
      td: W("td"), th: W("th"), blockquote: W("blockquote"),
    };
  }, [uniqueAnns]);

  function handleDelete() {
    toast.warning(`Xóa "${item.title}"?`, {
      action: { label: "Xóa", onClick: async () => { setDeleting(true); await onDelete(); } },
      cancel: { label: "Hủy", onClick: () => {} },
    });
  }

  function handleMouseUp() {
    // Small delay lets the browser finalise the selection
    setTimeout(() => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) { setSelectionData(null); return; }
      const text = sel.toString().trim();
      if (!text) { setSelectionData(null); return; }
      const range = sel.getRangeAt(0);
      const rect  = range.getBoundingClientRect();
      setSelectionData({ text, x: rect.left + rect.width / 2, y: rect.top });
    }, 10);
  }

  function dismissAll() {
    setSelectionData(null);
    setNotePopupOpen(false);
    window.getSelection()?.removeAllRanges();
  }

  function handleSaveAnnotation(note: string) {
    const ann: Annotation = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      selectedText: selectionData!.text,
      note,
      createdAt: new Date().toISOString(),
    };
    setAnnotations(prev => [ann, ...prev]);
    dismissAll();
    toast.success("Đã lưu ghi chú");
    setAnnPanel(true);
  }

  function deleteAnnotation(id: string) {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  }

  const annCount = annotations.length;

  return (
    <div className="flex flex-col" style={{ height: "100vh" }}
      onMouseDown={() => (selectionData || notePopupOpen) && dismissAll()}>
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-[#111] shrink-0"
        style={{ boxShadow: "rgba(0,0,0,0.06) 0 1px 0 0" }}>
        <Tip label="Quay lại">
          <button onClick={onBack}
            className="flex items-center justify-center h-8 w-8 rounded-[6px] text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
            style={{ boxShadow: "var(--shadow-border)" }}>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </Tip>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <TypeBadge type={item.type} url={item.content} />
          <span className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5] truncate">{item.title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Annotation panel toggle */}
          {item.type === "markdown" && (
            <Tip label={annPanel ? "Ẩn ghi chú" : `Ghi chú (${annCount})`}>
              <button onClick={() => setAnnPanel(p => !p)}
                className={`relative flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors cursor-pointer ${
                  annPanel
                    ? "bg-amber-500 text-white"
                    : "text-[#999] hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                }`}
                style={annPanel ? undefined : { boxShadow: "var(--shadow-border)" }}>
                <StickyNote className="w-3.5 h-3.5" />
                {annCount > 0 && !annPanel && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[9px] font-bold px-0.5">
                    {annCount}
                  </span>
                )}
              </button>
            </Tip>
          )}
          {item.type === "embed" && (
            <Tip label="Mở tab mới">
              <a href={item.content} target="_blank" rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#666] dark:text-[#888] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors"
                style={{ boxShadow: "var(--shadow-border)" }}>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </Tip>
          )}
          <Tip label="Chỉnh sửa">
            <button onClick={onEdit}
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </Tip>
          <Tip label="Xóa">
            <button onClick={handleDelete} disabled={deleting}
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:text-red-500 transition-colors cursor-pointer disabled:opacity-40"
              style={{ boxShadow: "var(--shadow-border)" }}>
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </Tip>
        </div>
      </div>

      {/* Mini note button — shown on text selection, before popup */}
      {selectionData && !notePopupOpen && (
        <SelectionToolbar
          x={selectionData.x}
          y={selectionData.y}
          onNote={() => setNotePopupOpen(true)}
        />
      )}

      {/* Full annotation popup — shown after clicking the toolbar button */}
      {selectionData && notePopupOpen && (
        <AnnotationPopup
          text={selectionData.text}
          x={selectionData.x}
          y={selectionData.y}
          onSave={handleSaveAnnotation}
          onClose={dismissAll}
        />
      )}

      {/* Body: content + optional annotation panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main content */}
        {item.type === "embed" ? (
          <iframe src={toEmbedUrl(item.content)} className="flex-1 w-full border-0" title={item.title} allowFullScreen />
        ) : (
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto"
            onMouseUp={handleMouseUp}
            onMouseDown={e => e.stopPropagation()}
          >
            {/* Hint bar */}
            <div className="flex items-center justify-center gap-1.5 pt-3 pb-0 text-[11px] text-[#bbb] select-none">
              <MessageSquarePlus className="w-3 h-3" />
              Bôi đen văn bản để ghi chú
            </div>
            <div className="max-w-3xl mx-auto px-8 py-6
              prose prose-sm dark:prose-invert
              prose-headings:font-semibold prose-headings:text-[#171717] dark:prose-headings:text-[#f5f5f5]
              prose-p:text-[#444] dark:prose-p:text-[#bbb] prose-p:leading-relaxed
              prose-a:text-blue-500 prose-code:text-purple-600 dark:prose-code:text-purple-400
              prose-pre:bg-[#f5f5f5] dark:prose-pre:bg-[#1a1a1a]
              prose-li:text-[#444] dark:prose-li:text-[#bbb]
              prose-strong:text-[#171717] dark:prose-strong:text-[#f5f5f5]">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{item.content || "_Chưa có nội dung_"}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Annotations panel (right sidebar) */}
        {annPanel && item.type === "markdown" && (
          <div className="w-72 shrink-0 flex flex-col bg-[#fafafa] dark:bg-[#0d0d0d] border-l border-[#f0f0f0] dark:border-[#1f1f1f] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ boxShadow: "rgba(0,0,0,0.04) 0 1px 0 0" }}>
              <div className="flex items-center gap-2">
                <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[12px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Ghi chú ({annCount})</span>
              </div>
              <Tip label="Ẩn panel">
                <button onClick={() => setAnnPanel(false)}
                  className="flex h-6 w-6 items-center justify-center rounded text-[#bbb] hover:text-[#555] dark:hover:text-[#ccc] transition-colors cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </Tip>
            </div>

            {annotations.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <MessageSquarePlus className="w-8 h-8 text-[#ddd] dark:text-[#333]" />
                <p className="text-[12px] text-[#999]">Bôi đen văn bản trong nội dung để thêm ghi chú</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
                {annotations.map(ann => (
                  <div key={ann.id} className="group rounded-[8px] bg-white dark:bg-[#111] overflow-hidden"
                    style={{ boxShadow: "var(--shadow-card)" }}>
                    <div className="px-3 pt-2.5 pb-1.5 border-l-2 border-amber-400">
                      <p className="text-[11px] italic text-[#888] dark:text-[#666] line-clamp-2">
                        &ldquo;{ann.selectedText}&rdquo;
                      </p>
                    </div>
                    <div className="px-3 pb-2.5">
                      <p className="text-[12px] text-[#333] dark:text-[#ccc] leading-relaxed">{ann.note}</p>
                    </div>
                    <div className="flex items-center justify-between px-3 pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-[#bbb] tabular-nums">
                        {new Date(ann.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                      </span>
                      <Tip label="Xóa ghi chú">
                        <button onClick={() => deleteAnnotation(ann.id)}
                          className="flex h-5 w-5 items-center justify-center rounded text-[#bbb] hover:text-red-500 transition-colors cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Tip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Item row ───────────────────────────────────────────────── */
function ItemRow({ item, onView, onEdit, onDelete }: {
  item: Roadmap;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  function handleDelete() {
    toast.warning(`Xóa "${item.title}"?`, {
      action: { label: "Xóa", onClick: async () => { setDeleting(true); await onDelete(); } },
      cancel: { label: "Hủy", onClick: () => {} },
      duration: 5000,
    });
  }

  const preview = item.type === "embed"
    ? item.content
    : item.content.replace(/^#+\s*/gm, "").replace(/\*\*|__|_|\*|`/g, "").slice(0, 120);

  const date = new Date(item.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="group flex items-center gap-3 px-4 py-2.5 rounded-[7px] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors">
      <div className="shrink-0 w-6 h-6 rounded-[5px] flex items-center justify-center bg-[#f0f0f0] dark:bg-[#222]">
        {item.type === "embed" ? <Link2 className="w-3 h-3 text-[#999]" /> : <FileText className="w-3 h-3 text-[#999]" />}
      </div>
      <button onClick={onView} className="flex-1 min-w-0 text-left cursor-pointer">
        <span className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5] truncate block group-hover:text-blue-500 transition-colors">
          {item.title}
        </span>
        <div className="flex items-center gap-2 mt-0.5 md:hidden">
          <TypeBadge type={item.type} url={item.content} />
          <span className="text-[10px] text-[#bbb] tabular-nums">{date}</span>
        </div>
      </button>
      <div className="hidden md:flex items-center gap-3 shrink-0">
        <TypeBadge type={item.type} url={item.content} />
        <span className="text-[11px] text-[#bbb] truncate max-w-[200px]">{preview}</span>
        <span className="text-[11px] text-[#bbb] tabular-nums w-[72px] text-right">{date}</span>
      </div>
      {/* Actions — visible on row hover */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tip label="Xem chi tiết">
          <button onClick={onView}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#bbb] hover:text-blue-500 transition-colors cursor-pointer"
            style={{ boxShadow: "var(--shadow-border)" }}>
            <Eye className="w-3 h-3" />
          </button>
        </Tip>
        <Tip label="Chỉnh sửa">
          <button onClick={onEdit}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#bbb] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
            style={{ boxShadow: "var(--shadow-border)" }}>
            <Pencil className="w-3 h-3" />
          </button>
        </Tip>
        <Tip label="Xóa">
          <button onClick={handleDelete} disabled={deleting}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#bbb] hover:text-red-500 transition-colors cursor-pointer disabled:opacity-40"
            style={{ boxShadow: "var(--shadow-border)" }}>
            {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        </Tip>
      </div>
    </div>
  );
}

/* ── Folder section (accordion, max ITEMS_PER_FOLDER shown) ── */
function FolderSection({ folder, items, onAddItem, onRenameFolder, onDeleteFolder, onViewFolder, onView, onEdit, onDelete }: {
  folder: StrategyFolder;
  items: Roadmap[];
  onAddItem: () => void;
  onRenameFolder: () => void;
  onDeleteFolder: () => void;
  onViewFolder: () => void;
  onView: (item: Roadmap) => void;
  onEdit: (item: Roadmap) => void;
  onDelete: (item: Roadmap) => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const visibleItems  = items.slice(0, ITEMS_PER_FOLDER);
  const hiddenCount   = Math.max(0, items.length - ITEMS_PER_FOLDER);

  function handleDeleteFolder() {
    toast.warning(`Xóa folder "${folder.name}"? Các items bên trong sẽ được chuyển về gốc.`, {
      action: {
        label: "Xóa", onClick: async () => {
          setDeleting(true);
          try {
            await fetch(`/api/strategy/folders/${folder.id}`, { method: "DELETE" });
            toast.success("Đã xóa folder");
            onDeleteFolder();
          } catch { toast.error("Lỗi kết nối"); }
          finally { setDeleting(false); }
        },
      },
      cancel: { label: "Hủy", onClick: () => {} },
      duration: 6000,
    });
  }

  return (
    <div className="rounded-[10px] bg-white dark:bg-[#111] overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}>
      {/* Folder header */}
      <div className="flex items-center gap-1.5 px-3 py-2.5 group/header">
        {/* Chevron toggle — collapse/expand ONLY */}
        <Tip label={open ? "Thu gọn" : "Mở rộng"}>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#bbb] hover:text-[#555] dark:hover:text-[#ccc] transition-colors cursor-pointer shrink-0"
          >
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

        {/* Folder name — click = drill into folder */}
        <button onClick={onViewFolder} className="flex-1 min-w-0 text-left cursor-pointer group/name">
          <span className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] truncate block group-hover/name:text-amber-500 transition-colors">
            {folder.name}
          </span>
        </button>

        <span className="text-[10px] text-[#bbb] tabular-nums shrink-0">{items.length}</span>

        {/* Action buttons — icon-only, visible on hover */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/header:opacity-100 transition-opacity">
          <Tip label="Mở folder">
            <button onClick={onViewFolder}
              className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#bbb] hover:text-amber-500 transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <Eye className="w-3 h-3" />
            </button>
          </Tip>
          <Tip label="Thêm item">
            <button onClick={onAddItem}
              className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#bbb] hover:text-blue-500 transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <Plus className="w-3 h-3" />
            </button>
          </Tip>
          <Tip label="Đổi tên">
            <button onClick={onRenameFolder}
              className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#bbb] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <Pencil className="w-3 h-3" />
            </button>
          </Tip>
          <Tip label="Xóa folder">
            <button onClick={handleDeleteFolder} disabled={deleting}
              className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#bbb] hover:text-red-500 transition-colors cursor-pointer disabled:opacity-40"
              style={{ boxShadow: "var(--shadow-border)" }}>
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            </button>
          </Tip>
        </div>
      </div>

      {/* Items list — capped at ITEMS_PER_FOLDER */}
      {open && (
        <div className="border-t border-[#f0f0f0] dark:border-[#1f1f1f] px-2 py-1">
          {items.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-[12px] text-[#bbb]">Folder trống — <button onClick={onAddItem} className="text-blue-500 hover:underline cursor-pointer">thêm item</button></p>
            </div>
          ) : (
            <>
              {visibleItems.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onView={() => onView(item)}
                  onEdit={() => onEdit(item)}
                  onDelete={() => onDelete(item)}
                />
              ))}
              {/* "View more" row if items exceed cap */}
              {hiddenCount > 0 && (
                <button
                  onClick={onViewFolder}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-[#bbb] hover:text-amber-500 transition-colors cursor-pointer rounded-[6px] hover:bg-amber-50 dark:hover:bg-amber-950/20"
                >
                  <MoreHorizontal className="w-3.5 h-3.5" />
                  +{hiddenCount} item khác — bấm để xem tất cả
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Folder detail view (drill-down) ───────────────────────── */
function FolderView({ folder, items, folders, onBack, onReload, onView, onEdit, onDelete }: {
  folder: StrategyFolder;
  items: Roadmap[];
  folders: StrategyFolder[];
  onBack: () => void;
  onReload: () => void;
  onView: (item: Roadmap) => void;
  onEdit: (item: Roadmap) => void;
  onDelete: (item: Roadmap) => Promise<void>;
}) {
  const [addOpen, setAddOpen]       = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);

  return (
    <div className="px-6 py-5 space-y-4">
      {typeof window !== "undefined" && addOpen && (
        <FormDialog
          folders={folders}
          defaultFolderId={folder.id}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); onReload(); }}
        />
      )}
      {typeof window !== "undefined" && renameOpen && (
        <FolderDialog
          initial={folder}
          onClose={() => setRenameOpen(false)}
          onSaved={() => { setRenameOpen(false); onReload(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2">
        <Tip label="Quay lại">
          <button onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
            style={{ boxShadow: "var(--shadow-border)" }}>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </Tip>
        <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
        <h1 className="flex-1 text-[20px] font-bold tracking-tight text-[#171717] dark:text-[#f5f5f5] truncate">{folder.name}</h1>
        <span className="text-[12px] text-[#bbb] shrink-0">{items.length} items</span>
        <Tip label="Đổi tên folder">
          <button onClick={() => setRenameOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#666] dark:text-[#888] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
            style={{ boxShadow: "var(--shadow-border)" }}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </Tip>
        <Tip label="Thêm item vào folder">
          <button onClick={() => setAddOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-[7px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </Tip>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="py-16 text-center">
          <FolderOpen className="w-10 h-10 text-[#ddd] dark:text-[#333] mx-auto mb-3" />
          <p className="text-[15px] font-medium text-[#999]">Folder trống</p>
          <p className="text-[13px] text-[#bbb] mt-1">
            <button onClick={() => setAddOpen(true)} className="text-blue-500 hover:underline cursor-pointer">Thêm item đầu tiên</button>
          </p>
        </div>
      ) : (
        <div className="rounded-[10px] bg-white dark:bg-[#111] overflow-hidden"
          style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="hidden md:grid items-center gap-3 px-5 py-2 border-b border-[#f0f0f0] dark:border-[#1f1f1f]"
            style={{ gridTemplateColumns: "24px 1fr 130px auto 80px 76px" }}>
            <div />
            <span className="text-[10px] font-medium uppercase tracking-widest text-[#bbb]">Tiêu đề</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-[#bbb]">Loại</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-[#bbb]">Nội dung</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-[#bbb]">Ngày tạo</span>
            <div />
          </div>
          <div className="px-2 py-1">
            {items.map(item => (
              <ItemRow
                key={item.id}
                item={item}
                onView={() => onView(item)}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Pagination control ─────────────────────────────────────── */
function Pagination({ page, total, perPage, onChange }: {
  page: number; total: number; perPage: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 pt-1">
      <Tip label="Trang trước">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ boxShadow: "var(--shadow-border)" }}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </Tip>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[12px] font-medium transition-all cursor-pointer"
          style={p === page
            ? { background: "#171717", color: "#fff", boxShadow: "none" }
            : { color: "#999", boxShadow: "var(--shadow-border)" }
          }
        >
          {p}
        </button>
      ))}

      <Tip label="Trang sau">
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ boxShadow: "var(--shadow-border)" }}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </Tip>

      <span className="text-[11px] text-[#bbb] ml-1">
        {page}/{totalPages}
      </span>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────── */
export default function StrategyPage() {
  const [items,   setItems]   = useState<Roadmap[]>([]);
  const [folders, setFolders] = useState<StrategyFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected]               = useState<Roadmap | null>(null);
  const [selectedFolder, setSelectedFolder]   = useState<StrategyFolder | null>(null);
  const [editItem, setEditItem]               = useState<Roadmap | null>(null);
  const [editFolder, setEditFolder]           = useState<StrategyFolder | null>(null);
  const [addItemFolderId, setAddItemFolderId] = useState<string | null | undefined>(undefined);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderPage, setFolderPage]           = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rItems, rFolders] = await Promise.all([
        fetch("/api/strategy").then(r => r.json()),
        fetch("/api/strategy/folders").then(r => r.json()),
      ]);
      const data: Roadmap[]              = rItems.data   ?? [];
      const folderData: StrategyFolder[] = rFolders.data ?? [];
      setItems(data);
      setFolders(folderData);
      setSelected(sel => sel ? (data.find(d => d.id === sel.id) ?? null) : null);
      // Sync selectedFolder name in case it was renamed
      setSelectedFolder(sf => sf ? (folderData.find(f => f.id === sf.id) ?? null) : null);
    } catch { toast.error("Không thể tải dữ liệu"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when folders change
  useEffect(() => { setFolderPage(1); }, [folders.length]);

  async function handleDelete(item: Roadmap) {
    await fetch(`/api/strategy/${item.id}`, { method: "DELETE" });
    toast.success("Đã xóa");
    setSelected(null);
    load();
  }

  const rootItems     = items.filter(i => !i.folderId);
  const pagedFolders  = folders.slice((folderPage - 1) * FOLDERS_PER_PAGE, folderPage * FOLDERS_PER_PAGE);

  /* ── Drill-down: item detail ─────────────────────────────── */
  if (selected) {
    return (
      <>
        {typeof window !== "undefined" && editItem && (
          <FormDialog initial={editItem} folders={folders} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); load(); }} />
        )}
        <DetailView
          item={selected}
          onBack={() => setSelected(null)}
          onEdit={() => setEditItem(selected)}
          onDelete={() => handleDelete(selected)}
        />
      </>
    );
  }

  /* ── Drill-down: folder detail ───────────────────────────── */
  if (selectedFolder) {
    const folderItems = items.filter(i => i.folderId === selectedFolder.id);
    return (
      <>
        {typeof window !== "undefined" && editItem && (
          <FormDialog initial={editItem} folders={folders} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); load(); }} />
        )}
        <FolderView
          folder={selectedFolder}
          items={folderItems}
          folders={folders}
          onBack={() => setSelectedFolder(null)}
          onReload={load}
          onView={item => setSelected(item)}
          onEdit={item => setEditItem(item)}
          onDelete={item => handleDelete(item)}
        />
      </>
    );
  }

  /* ── List view ───────────────────────────────────────────── */
  return (
    <div className="px-6 py-5 space-y-4">
      {/* Dialogs */}
      {typeof window !== "undefined" && addItemFolderId !== undefined && (
        <FormDialog
          folders={folders}
          defaultFolderId={addItemFolderId}
          onClose={() => setAddItemFolderId(undefined)}
          onSaved={() => { setAddItemFolderId(undefined); load(); }}
        />
      )}
      {typeof window !== "undefined" && editItem && (
        <FormDialog initial={editItem} folders={folders} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); load(); }} />
      )}
      {typeof window !== "undefined" && (folderDialogOpen || editFolder) && (
        <FolderDialog
          initial={editFolder ?? undefined}
          onClose={() => { setFolderDialogOpen(false); setEditFolder(null); }}
          onSaved={() => { setFolderDialogOpen(false); setEditFolder(null); load(); }}
        />
      )}

      {/* Header — icon-only action buttons */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold tracking-tight text-[#171717] dark:text-[#f5f5f5]">Strategy</h1>
        <div className="flex items-center gap-1.5">
          <Tip label="Tạo folder mới">
            <button onClick={() => setFolderDialogOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-[7px] text-[#666] dark:text-[#888] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <FolderPlus className="w-4 h-4" />
            </button>
          </Tip>
          <Tip label="Thêm item mới">
            <button onClick={() => setAddItemFolderId(null)}
              className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer">
              <Plus className="w-4 h-4" />
            </button>
          </Tip>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 rounded-[10px] bg-[#f5f5f5] dark:bg-[#1a1a1a] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Paginated folders */}
          {pagedFolders.map(folder => {
            const folderItems = items.filter(i => i.folderId === folder.id);
            return (
              <FolderSection
                key={folder.id}
                folder={folder}
                items={folderItems}
                onAddItem={() => setAddItemFolderId(folder.id)}
                onRenameFolder={() => setEditFolder(folder)}
                onDeleteFolder={() => load()}
                onViewFolder={() => setSelectedFolder(folder)}
                onView={item => setSelected(item)}
                onEdit={item => setEditItem(item)}
                onDelete={item => handleDelete(item)}
              />
            );
          })}

          {/* Folder pagination */}
          <Pagination
            page={folderPage}
            total={folders.length}
            perPage={FOLDERS_PER_PAGE}
            onChange={setFolderPage}
          />

          {/* Root items — no folder */}
          {rootItems.length > 0 && (
            <div className="rounded-[10px] bg-white dark:bg-[#111] overflow-hidden"
              style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#f0f0f0] dark:border-[#1f1f1f]">
                <ChevronRight className="w-3.5 h-3.5 text-[#ccc]" />
                <span className="text-[11px] font-medium uppercase tracking-widest text-[#bbb]">Chưa phân loại</span>
                <span className="text-[10px] text-[#bbb] tabular-nums">{rootItems.length}</span>
              </div>
              <div className="px-2 py-1">
                {rootItems.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onView={() => setSelected(item)}
                    onEdit={() => setEditItem(item)}
                    onDelete={() => handleDelete(item)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {folders.length === 0 && items.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-[15px] font-medium text-[#999]">Chưa có mục nào</p>
              <p className="text-[13px] text-[#bbb] mt-1">Tạo folder để phân loại, hoặc thêm item trực tiếp</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
