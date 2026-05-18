"use client";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import type { Category } from "./page";
import { Plus, Trash2, Save, X, Pencil, Check, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const BASIC_COLORS = [
  "#ef4444","#f97316","#eab308","#22c55e",
  "#06b6d4","#3b82f6","#8b5cf6","#ec4899",
  "#14b8a6","#6366f1","#f59e0b","#84cc16",
];

interface EditState { label: string; emoji: string; color: string; percentage: string; }

/* ── Inline Color Picker ──────────────────────────────────────── */
function ColorDot({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hex, setHex]   = useState(value);
  const ref             = useRef<HTMLDivElement>(null);

  useEffect(() => { setHex(value); }, [value]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(c: string) { onChange(c); setHex(c); }

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-7 h-7 rounded-full border-2 border-white dark:border-[#222] shadow cursor-pointer hover:scale-110 transition-transform"
        style={{ background: value }} />

      {open && (
        <div className="absolute z-50 top-9 right-0 rounded-[10px] bg-white dark:bg-[#1a1a1a] p-3 space-y-2.5 w-[176px]"
          style={{ boxShadow: "var(--shadow-card)" }}>
          {/* Swatches */}
          <div className="grid grid-cols-6 gap-1.5">
            {BASIC_COLORS.map(c => (
              <button key={c} type="button" onClick={() => pick(c)}
                className={cn(
                  "w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform",
                  value === c && "ring-2 ring-offset-1 ring-[#171717] dark:ring-[#f5f5f5]"
                )}
                style={{ background: c }} />
            ))}
          </div>
          {/* Hex input */}
          <div className="flex items-center gap-2 pt-1 border-t border-[#f0f0f0] dark:border-[#333]">
            <div className="w-5 h-5 rounded-full shrink-0" style={{ background: value }} />
            <input value={hex}
              onChange={e => {
                const v = e.target.value;
                setHex(v);
                if (/^#[0-9a-f]{6}$/i.test(v)) pick(v);
              }}
              placeholder="#6366f1" maxLength={7}
              className="flex-1 h-6 px-2 text-[11px] font-mono rounded-[4px] bg-[#f5f5f5] dark:bg-[#111] text-[#171717] dark:text-[#f5f5f5]"
              style={{ boxShadow: "var(--shadow-border)" }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── AI Suggest hook ──────────────────────────────────────────── */
function useSuggestCategory(name: string, onSuggest: (emoji: string, color: string) => void) {
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!name.trim() || name.trim().length < 2) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/budget/suggest-category", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        const j = await r.json();
        if (j.emoji && j.color) onSuggest(j.emoji, j.color);
      } catch {}
      finally { setLoading(false); }
    }, 700);
    return () => clearTimeout(timer);
  }, [name]);
  return loading;
}

/* ── Progress bar ─────────────────────────────────────────────── */
function PctBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-[#f0f0f0] dark:bg-[#2a2a2a] overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </div>
  );
}

export function CategoryManager({ categories, onRefresh }: { categories: Category[]; onRefresh: () => void }) {
  const [editId, setEditId]         = useState<string | null>(null);
  const [editState, setEditState]   = useState<EditState>({ label: "", emoji: "", color: "", percentage: "" });
  const [adding, setAdding]         = useState(false);
  const [newCat, setNewCat]         = useState<EditState>({ label: "", emoji: "💡", color: "#6366f1", percentage: "0" });
  const [saving, setSaving]         = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalPct = categories.reduce((s, c) => s + parseFloat(c.percentage), 0);
  const pctOk    = Math.abs(totalPct - 100) < 0.01;

  const suggestingNew  = useSuggestCategory(newCat.label,   (emoji, color) => setNewCat(s  => ({ ...s, emoji, color })));
  const suggestingEdit = useSuggestCategory(editState.label,(emoji, color) => setEditState(s => ({ ...s, emoji, color })));

  function startEdit(cat: Category) {
    setEditId(cat.id);
    setEditState({ label: cat.label, emoji: cat.emoji, color: cat.color, percentage: cat.percentage });
  }

  async function saveEdit(cat: Category) {
    const pct = parseFloat(editState.percentage);
    if (isNaN(pct) || pct < 0) { toast.error("Tỷ lệ không hợp lệ"); return; }
    setSaving(true);
    const body = categories.map(c => ({
      id: c.id,
      label:      c.id === cat.id ? editState.label  : c.label,
      emoji:      c.id === cat.id ? editState.emoji  : c.emoji,
      color:      c.id === cat.id ? editState.color  : c.color,
      percentage: c.id === cat.id ? pct              : parseFloat(c.percentage),
    }));
    const total = body.reduce((s, c) => s + c.percentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`Tổng = ${total.toFixed(1)}% — phải = 100%`); setSaving(false); return;
    }
    try {
      const r = await fetch("/api/budget/categories", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const j = await r.json();
      j.statusCode === 200
        ? (toast.success("Đã cập nhật hạng mục"), setEditId(null), onRefresh())
        : toast.error(j.message);
    } catch { toast.error("Lỗi kết nối"); }
    finally { setSaving(false); }
  }

  function handleDelete(id: string, label: string) {
    toast.warning(`Xóa hạng mục "${label}"?`, {
      action: {
        label: "Xóa",
        onClick: async () => {
          setDeletingId(id);
          try {
            const r = await fetch(`/api/budget/categories/${id}`, { method: "DELETE" });
            const j = await r.json();
            j.statusCode === 200
              ? (toast.success("Đã xóa hạng mục"), onRefresh())
              : toast.error(j.message);
          } catch { toast.error("Lỗi kết nối"); }
          finally { setDeletingId(null); }
        },
      },
      cancel: { label: "Hủy" },
      duration: 5000,
    });
  }

  async function handleAdd() {
    if (!newCat.label.trim()) { toast.error("Nhập tên hạng mục"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/budget/categories", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newCat.label, emoji: newCat.emoji, color: newCat.color, percentage: parseFloat(newCat.percentage) || 0 }),
      });
      const j = await r.json();
      if (j.statusCode === 201) {
        toast.success("Đã thêm hạng mục");
        setAdding(false);
        setNewCat({ label: "", emoji: "💡", color: "#6366f1", percentage: "0" });
        onRefresh();
      } else toast.error(j.message);
    } catch { toast.error("Lỗi kết nối"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      {/* Sum indicator */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[12px] text-[#999]">Tổng tỷ lệ phải bằng <strong className="text-[#171717] dark:text-[#f5f5f5]">100%</strong></p>
        <span className={`text-[12px] font-semibold tabular-nums px-2.5 py-0.5 rounded-full ${pctOk
          ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400"
          : "bg-red-50 dark:bg-red-950/30 text-red-500"}`}>
          {totalPct.toFixed(1)}% {pctOk ? "✓" : "≠ 100%"}
        </span>
      </div>

      {/* Category rows */}
      <div className="space-y-2">
        {categories.map(cat => {
          const isEditing = editId === cat.id;
          const pct       = parseFloat(cat.percentage);
          return (
            <div key={cat.id} className="rounded-[8px] bg-white dark:bg-[#111] overflow-hidden"
              style={{ borderLeft: `3px solid ${isEditing ? editState.color : cat.color}`, boxShadow: "var(--shadow-card)" }}>
              <div className="px-5 py-3 space-y-3">
                <div className="flex items-center gap-3">
                  {/* Emoji with AI spinner */}
                  <div className="relative shrink-0">
                    <span className="text-xl">{isEditing ? editState.emoji : cat.emoji}</span>
                    {isEditing && suggestingEdit && (
                      <Loader2 className="w-3 h-3 animate-spin absolute -top-1 -right-1 text-[hsl(160,84%,42%)]" />
                    )}
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input value={editState.label}
                        onChange={e => setEditState(s => ({ ...s, label: e.target.value }))}
                        className="h-7 w-full px-2 text-[13px] font-medium rounded-[5px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
                        style={{ boxShadow: "var(--shadow-border)" }} />
                    ) : (
                      <span className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5] truncate block">{cat.label}</span>
                    )}
                  </div>

                  {/* Percentage */}
                  {isEditing ? (
                    <input type="number" value={editState.percentage}
                      onChange={e => setEditState(s => ({ ...s, percentage: e.target.value }))}
                      min="0" max="100" step="0.5"
                      className="w-16 h-7 px-2 text-[13px] font-bold text-right rounded-[5px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] shrink-0"
                      style={{ boxShadow: "var(--shadow-border)" }} />
                  ) : (
                    <span className="text-[15px] font-bold tabular-nums tracking-tight shrink-0" style={{ color: cat.color }}>{pct}%</span>
                  )}

                  {/* Color dot (edit only) */}
                  {isEditing && (
                    <ColorDot value={editState.color} onChange={c => setEditState(s => ({ ...s, color: c }))} />
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={() => saveEdit(cat)} disabled={saving}
                          className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] cursor-pointer hover:opacity-80 disabled:opacity-40">
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button onClick={() => setEditId(null)}
                          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] cursor-pointer transition-colors"
                          style={{ boxShadow: "var(--shadow-border)" }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(cat)}
                          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
                          style={{ boxShadow: "var(--shadow-border)" }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(cat.id, cat.label)}
                          disabled={deletingId === cat.id}
                          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-red-500 transition-colors cursor-pointer disabled:opacity-40"
                          style={{ boxShadow: "var(--shadow-border)" }}>
                          {deletingId === cat.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <PctBar value={pct} color={cat.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Add form */}
      {adding ? (
        <div className="rounded-[8px] bg-white dark:bg-[#111] px-5 py-4 space-y-3"
          style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888] flex-1">
              Hạng mục mới
            </p>
            {suggestingNew && (
              <span className="flex items-center gap-1 text-[10px] text-[hsl(160,84%,42%)]">
                <Sparkles className="w-3 h-3 animate-pulse" />AI đang gợi ý...
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Emoji preview with AI spinner */}
            <div className="relative w-9 h-9 rounded-[6px] flex items-center justify-center shrink-0 text-xl select-none"
              style={{ background: newCat.color + "22", border: `1.5px solid ${newCat.color}55` }}>
              {newCat.emoji}
              {suggestingNew && (
                <Loader2 className="w-3 h-3 animate-spin absolute -top-1 -right-1 text-[hsl(160,84%,42%)]" />
              )}
            </div>

            <input type="text" autoFocus placeholder="Tên hạng mục" value={newCat.label}
              onChange={e => setNewCat(s => ({ ...s, label: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              className="flex-1 h-9 px-3 text-[13px] rounded-[6px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
              style={{ boxShadow: "var(--shadow-border)" }} />

            <div className="flex items-center gap-1 shrink-0">
              <input type="number" value={newCat.percentage}
                onChange={e => setNewCat(s => ({ ...s, percentage: e.target.value }))}
                min="0" max="100" step="0.5" placeholder="0"
                className="w-14 h-9 px-2 text-right text-[13px] rounded-[6px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
                style={{ boxShadow: "var(--shadow-border)" }} />
              <span className="text-[12px] text-[#999]">%</span>
            </div>

            <ColorDot value={newCat.color} onChange={c => setNewCat(s => ({ ...s, color: c }))} />
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setAdding(false); setNewCat({ label: "", emoji: "💡", color: "#6366f1", percentage: "0" }); }}
              className="h-7 px-3 rounded-[5px] text-[12px] font-medium text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] cursor-pointer transition-colors"
              style={{ boxShadow: "var(--shadow-border)" }}>
              Hủy
            </button>
            <button onClick={handleAdd} disabled={saving}
              className="h-7 px-3 rounded-[5px] text-[12px] font-medium flex items-center gap-1 bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 cursor-pointer disabled:opacity-40">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? "Đang lưu..." : "Thêm"}
            </button>
          </div>
        </div>
      ) : (
        <button id="btn-add-category" onClick={() => setAdding(true)}
          className="w-full h-9 rounded-[6px] text-[12px] font-medium flex items-center justify-center gap-2 border-2 border-dashed border-[#e2e2e2] dark:border-[#2d2d2d] text-[#999] hover:border-[hsl(160,84%,42%)] hover:text-[hsl(160,84%,42%)] cursor-pointer transition-colors">
          <Plus className="w-3.5 h-3.5" /> Thêm hạng mục
        </button>
      )}
    </div>
  );
}
