"use client";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  Plus, X, Check, Loader2, Pencil, Trash2, FileText, Link2,
  ExternalLink, ArrowLeft, Eye, Wand2, ClipboardPaste,
  FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown,
  ChevronLeft, MoreHorizontal,
} from "lucide-react";
import TurndownService from "turndown";
import type { Roadmap, StrategyFolder } from "@/db/schema";
import { Tip } from "@/components/ui/tip";
import { ActionMenu } from "@/components/ui/action-menu";

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



/* ── Detail view ───────────────────────────────────── */
function DetailView({ item, onBack, onEdit, onDelete }: {
  item: Roadmap; onBack: () => void; onEdit: () => void; onDelete: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  function handleDelete() {
    toast.warning(`Xóa "${item.title}"?`, {
      action: { label: "Xóa", onClick: async () => { setDeleting(true); await onDelete(); } },
      cancel: { label: "Hủy", onClick: () => {} },
    });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
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
              className="hidden md:flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </Tip>
          <Tip label="Xóa">
            <button onClick={handleDelete} disabled={deleting}
              className="hidden md:flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:text-red-500 transition-colors cursor-pointer disabled:opacity-40"
              style={{ boxShadow: "var(--shadow-border)" }}>
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </Tip>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {item.type === "embed" ? (
          <iframe src={toEmbedUrl(item.content)} className="flex-1 w-full border-0 min-h-0" title={item.title} allowFullScreen />
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-8 py-6
              prose prose-sm dark:prose-invert
              prose-headings:font-semibold prose-headings:text-[#171717] dark:prose-headings:text-[#f5f5f5]
              prose-p:text-[#444] dark:prose-p:text-[#bbb] prose-p:leading-relaxed
              prose-a:text-blue-500 prose-code:text-purple-600 dark:prose-code:text-purple-400
              prose-pre:bg-[#f5f5f5] dark:prose-pre:bg-[#1a1a1a]
              prose-li:text-[#444] dark:prose-li:text-[#bbb]
              prose-strong:text-[#171717] dark:prose-strong:text-[#f5f5f5]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content || "_Chưa có nội dung_"}</ReactMarkdown>
            </div>
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
    <div className="group flex items-center gap-2.5 px-2.5 py-2.5 rounded-[7px] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors">
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
      {/* Mobile: ⋯ dropdown */}
      <ActionMenu items={[
        { label: "Xem chi tiết", icon: <Eye className="w-3.5 h-3.5" />, onClick: onView },
        { label: "Chỉnh sửa", icon: <Pencil className="w-3.5 h-3.5" />, onClick: onEdit },
        { label: "Xóa", icon: <Trash2 className="w-3.5 h-3.5" />, onClick: handleDelete, danger: true, disabled: deleting },
      ]} />

      {/* Desktop: inline hover buttons */}
      <div className="hidden md:flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
      <div className="flex items-center gap-2.5 px-4 py-2.5 group/header">
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



        {/* Mobile: ⋯ dropdown */}
        <ActionMenu items={[
          { label: "Mở folder", icon: <Eye className="w-3.5 h-3.5" />, onClick: onViewFolder },
          { label: "Thêm item", icon: <Plus className="w-3.5 h-3.5" />, onClick: onAddItem },
          { label: "Đổi tên", icon: <Pencil className="w-3.5 h-3.5" />, onClick: onRenameFolder },
          { label: "Xóa folder", icon: <Trash2 className="w-3.5 h-3.5" />, onClick: handleDeleteFolder, danger: true, disabled: deleting },
        ]} />

        {/* Desktop: inline hover buttons */}
        <div className="hidden md:flex items-center gap-1 shrink-0 opacity-0 group-hover/header:opacity-100 transition-opacity">
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
        <div className="border-t border-[#f0f0f0] dark:border-[#1f1f1f] px-1.5 py-1">
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
            className="hidden md:flex h-8 w-8 items-center justify-center rounded-[6px] text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
            style={{ boxShadow: "var(--shadow-border)" }}>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </Tip>
        <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
        <h1 className="flex-1 text-[20px] font-bold tracking-tight text-[#171717] dark:text-[#f5f5f5] truncate">{folder.name}</h1>

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

      {/* Header — action buttons only */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-1.5 ml-auto">
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
