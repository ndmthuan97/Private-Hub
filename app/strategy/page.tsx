"use client";
import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Plus, X, Check, Loader2, Pencil, Trash2, FileText, Link2, ExternalLink, ArrowLeft, Eye, Wand2, ClipboardPaste } from "lucide-react";
import TurndownService from "turndown";
import type { Roadmap } from "@/db/schema";

type FormState = { title: string; type: "markdown" | "embed"; content: string };
const EMPTY: FormState = { title: "", type: "markdown", content: "" };

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
      // "**N. Title**" or "**Title**" as standalone lines → ## heading
      const headingMatch = line.match(/^\*\*(\d+\.\s+.+?)\*\*\s*$/) || line.match(/^\*\*(.+?)\*\*\s*$/);
      if (headingMatch) return `## ${headingMatch[1].replace(/:$/, "").trim()}`;
      // nested bullet "    *   text" → "    - text"
      if (/^    \*   /.test(line)) return line.replace(/^    \*   /, "    - ");
      // top-level bullet "*   text" → "- text"
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
      // Strip trailing slash then last path segment, replace with embed keyword
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

/* ── Form dialog ───────────────────────────────────────────── */
function FormDialog({ initial, onClose, onSaved }: {
  initial?: Roadmap; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    initial ? { title: initial.title, type: initial.type as "markdown" | "embed", content: initial.content } : EMPTY,
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
      const url    = isEdit ? `/api/strategy/${initial!.id}` : "/api/strategy";
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
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer" style={{ boxShadow: "var(--shadow-border)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-[11px] font-medium uppercase tracking-widest text-[#999] mb-1.5 block">Tiêu đề</label>
            <input autoFocus type="text" placeholder="VD: Lộ trình học TOEIC"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full h-10 px-3 text-[14px] rounded-[7px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
              style={{ boxShadow: "var(--shadow-border)" }} />
          </div>
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
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium uppercase tracking-widest text-[#999]">
                {form.type === "markdown" ? "Nội dung (Markdown)" : "URL nhúng"}
              </label>
              {form.type === "markdown" && (
                <button type="button" onClick={() => { setPasteMode(p => !p); setRawText(""); }}
                  className={`flex items-center gap-1.5 h-6 px-2.5 rounded-[5px] text-[11px] font-medium transition-all cursor-pointer ${pasteMode ? "bg-amber-500 text-white" : "text-[#888] hover:text-[#171717] dark:hover:text-[#f5f5f5]"}`}
                  style={pasteMode ? undefined : { boxShadow: "var(--shadow-border)" }}>
                  <ClipboardPaste className="w-3 h-3" />
                  {pasteMode ? "Huỷ dán" : "Dán văn bản"}
                </button>
              )}
            </div>

            {form.type === "markdown" && pasteMode && (
              <div className="mb-3 rounded-[8px] border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200 dark:border-amber-800">
                  <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">Dán từ Google Docs / Word / web — tự giữ style. Dán plain text → nhấn Chuyển đổi</span>
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

/* ── Detail view ───────────────────────────────────────────── */
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
    <div className="flex flex-col" style={{ height: "100vh" }}>
      <div className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-[#111] shrink-0"
        style={{ boxShadow: "rgba(0,0,0,0.06) 0 1px 0 0" }}>
        <button onClick={onBack}
          className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[13px] font-medium text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
          style={{ boxShadow: "var(--shadow-border)" }}>
          <ArrowLeft className="w-3.5 h-3.5" />Quay lại
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <TypeBadge type={item.type} url={item.content} />
          <span className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5] truncate">{item.title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {item.type === "embed" && (
            <a href={item.content} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium text-[#666] dark:text-[#888] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <ExternalLink className="w-3.5 h-3.5" />Mở tab mới
            </a>
          )}
          <button onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
            style={{ boxShadow: "var(--shadow-border)" }}>
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:text-red-500 transition-colors cursor-pointer disabled:opacity-40"
            style={{ boxShadow: "var(--shadow-border)" }}>
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {item.type === "embed" ? (
        <iframe src={toEmbedUrl(item.content)} className="flex-1 w-full border-0" title={item.title} allowFullScreen />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-8 py-8
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
  );
}

/* ── Table row ─────────────────────────────────────────────── */
function StrategyRow({ item, onView, onEdit, onDelete }: {
  item: Roadmap;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);

  function handleDelete() {
    toast.warning(`Xóa "${item.title}"?`, {
      action: {
        label: "Xóa",
        onClick: async () => {
          setDeleting(true);
          await onDelete();
        },
      },
      cancel: { label: "Hủy", onClick: () => {} },
      duration: 5000,
    });
  }

  const preview = item.type === "embed"
    ? item.content
    : item.content.replace(/^#+\s*/gm, "").replace(/\*\*|__|\*|_|`/g, "").slice(0, 120);

  const date = new Date(item.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  const actions = (
    <div className="flex items-center gap-1 shrink-0">
      <button onClick={onView}
        className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-blue-500 transition-colors cursor-pointer"
        style={{ boxShadow: "var(--shadow-border)" }}>
        <Eye className="w-3.5 h-3.5" />
      </button>
      <button onClick={onEdit}
        className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
        style={{ boxShadow: "var(--shadow-border)" }}>
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={handleDelete} disabled={deleting}
        className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-red-500 transition-colors cursor-pointer disabled:opacity-40"
        style={{ boxShadow: "var(--shadow-border)" }}>
        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );

  return (
    <div className="rounded-[8px] bg-white dark:bg-[#111] overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}>

      <div className="flex items-center gap-3 px-4 py-3 md:hidden">
        <div className="shrink-0 w-7 h-7 rounded-[6px] flex items-center justify-center bg-[#f5f5f5] dark:bg-[#1a1a1a]">
          {item.type === "embed" ? <Link2 className="w-3.5 h-3.5 text-[#999]" /> : <FileText className="w-3.5 h-3.5 text-[#999]" />}
        </div>
        <button onClick={onView} className="flex-1 min-w-0 text-left cursor-pointer group">
          <span className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5] truncate block group-hover:text-blue-500 transition-colors">
            {item.title}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <TypeBadge type={item.type} url={item.content} />
            <span className="text-[11px] text-[#bbb] tabular-nums">{date}</span>
          </div>
        </button>
        {actions}
      </div>

      <div className="hidden md:grid items-center gap-3 px-5 py-3"
        style={{ gridTemplateColumns: "28px 2fr 120px 3fr 90px 88px" }}>
        <div className="w-7 h-7 rounded-[6px] flex items-center justify-center bg-[#f5f5f5] dark:bg-[#1a1a1a]">
          {item.type === "embed" ? <Link2 className="w-3.5 h-3.5 text-[#999]" /> : <FileText className="w-3.5 h-3.5 text-[#999]" />}
        </div>
        <button onClick={onView} className="text-left min-w-0 cursor-pointer group">
          <span className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5] truncate block group-hover:text-blue-500 transition-colors">
            {item.title}
          </span>
        </button>
        <div className="min-w-0"><TypeBadge type={item.type} url={item.content} /></div>
        <span className="text-[12px] text-[#999] truncate min-w-0">{preview}</span>
        <span className="text-[11px] text-[#bbb] tabular-nums">{date}</span>
        <div className="flex items-center gap-1 justify-end">{actions}</div>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────── */
export default function StrategyPage() {
  const [items, setItems]       = useState<Roadmap[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Roadmap | null>(null);
  const [edit, setEdit]         = useState<Roadmap | null>(null);
  const [addOpen, setAddOpen]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/strategy");
      const j = await r.json();
      const data: Roadmap[] = j.data ?? [];
      setItems(data);
      setSelected(sel => sel ? (data.find(d => d.id === sel.id) ?? null) : null);
    } catch { toast.error("Không thể tải dữ liệu"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(item: Roadmap) {
    await fetch(`/api/strategy/${item.id}`, { method: "DELETE" });
    toast.success("Đã xóa");
    setSelected(null);
    load();
  }

  if (selected) {
    return (
      <>
        {typeof window !== "undefined" && edit && (
          <FormDialog initial={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
        )}
        <DetailView
          item={selected}
          onBack={() => setSelected(null)}
          onEdit={() => setEdit(selected)}
          onDelete={() => handleDelete(selected)}
        />
      </>
    );
  }

  return (
    <div className="px-6 py-5 space-y-5">
      {typeof window !== "undefined" && addOpen && (
        <FormDialog onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); load(); }} />
      )}
      {typeof window !== "undefined" && edit && (
        <FormDialog initial={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />
      )}

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#171717] dark:text-[#f5f5f5] mt-0.5">Strategy</h1>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-[7px] text-[13px] font-medium bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer">
          <Plus className="w-3.5 h-3.5" />Thêm mới
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-14 rounded-[8px] bg-[#f5f5f5] dark:bg-[#1a1a1a] animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[15px] font-medium text-[#999]">Chưa có mục nào</p>
          <p className="text-[13px] text-[#bbb] mt-1">Bấm "+ Thêm mới" để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden md:grid items-center gap-3 px-5 py-1"
            style={{ gridTemplateColumns: "28px 2fr 120px 3fr 90px 88px" }}>
            <div />
            <span className="text-[11px] font-medium uppercase tracking-widest text-[#999]">Tiêu đề</span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-[#999]">Loại</span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-[#999]">Nội dung</span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-[#999]">Ngày tạo</span>
            <div />
          </div>

          {items.map(item => (
            <StrategyRow
              key={item.id}
              item={item}
              onView={() => setSelected(item)}
              onEdit={() => setEdit(item)}
              onDelete={() => handleDelete(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
