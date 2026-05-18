"use client";
import { useState } from "react";
import { toast } from "sonner";
import type { Category } from "./page";
import { Plus, Trash2, Save, X, Pencil, Check } from "lucide-react";

const PRESET_COLORS = ["#22c55e","#06b6d4","#a855f7","#f97316","#3b82f6","#ec4899","#eab308","#ef4444","#6366f1","#14b8a6"];
const PRESET_EMOJIS = ["🏠","💰","📚","🎉","📈","❤️","🍔","✈️","💊","🎮","👗","🚗","💡","🎓","🏋️"];

interface EditState { label: string; emoji: string; color: string; percentage: string; }

function PctBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-[#f0f0f0] dark:bg-[#2a2a2a] overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(value, 100)}%`, background: color }} />
    </div>
  );
}

export function CategoryManager({ categories, onRefresh }: { categories: Category[]; onRefresh: () => void }) {
  const [editId, setEditId]     = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ label: "", emoji: "", color: "", percentage: "" });
  const [adding, setAdding]     = useState(false);
  const [newCat, setNewCat]     = useState<EditState>({ label: "", emoji: "💡", color: "#6366f1", percentage: "0" });
  const [saving, setSaving]     = useState(false);

  const totalPct = categories.reduce((s, c) => s + parseFloat(c.percentage), 0);
  const pctOk    = Math.abs(totalPct - 100) < 0.01;

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
      label:      c.id === cat.id ? editState.label      : c.label,
      emoji:      c.id === cat.id ? editState.emoji      : c.emoji,
      color:      c.id === cat.id ? editState.color      : c.color,
      percentage: c.id === cat.id ? pct                  : parseFloat(c.percentage),
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
      j.statusCode === 200 ? (toast.success("✅ Đã cập nhật"), setEditId(null), onRefresh()) : toast.error(j.message);
    } catch { toast.error("Lỗi kết nối"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string, label: string) {
    if (!confirm(`Xóa "${label}"?`)) return;
    const r = await fetch(`/api/budget/categories/${id}`, { method: "DELETE" });
    const j = await r.json();
    j.statusCode === 200 ? (toast.success("🗑️ Đã xóa"), onRefresh()) : toast.error(j.message);
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
        toast.success("✅ Đã thêm hạng mục");
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
        {categories.map((cat) => {
          const isEditing = editId === cat.id;
          const pct       = parseFloat(cat.percentage);
          return (
            <div key={cat.id}
              className="rounded-[8px] bg-white dark:bg-[#111] overflow-hidden"
              style={{ borderLeft: `3px solid ${cat.color}`, boxShadow: "var(--shadow-card)" }}>
              <div className="px-5 py-3 space-y-2">
                {/* Top row */}
                <div className="flex items-center gap-3">
                  {/* Emoji */}
                  {isEditing ? (
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {PRESET_EMOJIS.map(e => (
                        <button key={e} onClick={() => setEditState(s => ({ ...s, emoji: e }))}
                          className={`text-base leading-none p-0.5 rounded cursor-pointer hover:scale-125 transition-transform ${editState.emoji === e ? "ring-2 ring-[#0072f5] rounded" : ""}`}>
                          {e}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xl shrink-0">{cat.emoji}</span>
                  )}

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input value={editState.label} onChange={e => setEditState(s => ({ ...s, label: e.target.value }))}
                        className="h-7 w-full px-2 text-[13px] font-medium rounded-[5px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
                        style={{ boxShadow: "var(--shadow-border)" }} />
                    ) : (
                      <span className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5] truncate block">{cat.label}</span>
                    )}
                  </div>

                  {/* Percentage */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <input type="number" value={editState.percentage}
                        onChange={e => setEditState(s => ({ ...s, percentage: e.target.value }))}
                        min="0" max="100" step="0.5"
                        className="w-16 h-7 px-2 text-[13px] font-bold text-right rounded-[5px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
                        style={{ boxShadow: "var(--shadow-border)" }} />
                    ) : (
                      <span className="text-[15px] font-bold tabular-nums tracking-tight" style={{ color: cat.color }}>
                        {pct}%
                      </span>
                    )}
                  </div>

                  {/* Color picker (edit only) */}
                  {isEditing && (
                    <div className="flex gap-1 flex-wrap max-w-[110px] shrink-0">
                      {PRESET_COLORS.map(c => (
                        <button key={c} onClick={() => setEditState(s => ({ ...s, color: c }))}
                          className={`w-5 h-5 rounded-full cursor-pointer hover:scale-110 transition-transform ${editState.color === c ? "ring-2 ring-offset-1 ring-[#171717] dark:ring-[#f5f5f5]" : ""}`}
                          style={{ background: c }} />
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={() => saveEdit(cat)} disabled={saving}
                          className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] cursor-pointer hover:opacity-80 disabled:opacity-40">
                          <Check className="w-3.5 h-3.5" />
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
                          className="flex h-7 w-7 items-center justify-center rounded-[4px] text-[#999] hover:text-red-500 transition-colors cursor-pointer"
                          style={{ boxShadow: "var(--shadow-border)" }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
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
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">
            Hạng mục mới
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex flex-wrap gap-1">
              {PRESET_EMOJIS.slice(0, 10).map(e => (
                <button key={e} onClick={() => setNewCat(s => ({ ...s, emoji: e }))}
                  className={`text-base p-0.5 rounded cursor-pointer hover:scale-125 transition-transform ${newCat.emoji === e ? "ring-2 ring-[#0072f5]" : ""}`}>
                  {e}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Tên hạng mục" value={newCat.label}
              onChange={e => setNewCat(s => ({ ...s, label: e.target.value }))}
              className="flex-1 min-w-[120px] h-8 px-3 text-[13px] rounded-[6px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
              style={{ boxShadow: "var(--shadow-border)" }} />
            <div className="flex items-center gap-1">
              <input type="number" value={newCat.percentage}
                onChange={e => setNewCat(s => ({ ...s, percentage: e.target.value }))}
                min="0" max="100" step="0.5" placeholder="%"
                className="w-14 h-8 px-2 text-right text-[13px] rounded-[6px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
                style={{ boxShadow: "var(--shadow-border)" }} />
              <span className="text-[12px] text-[#999]">%</span>
            </div>
            <div className="flex gap-1.5">
              {PRESET_COLORS.slice(0, 6).map(c => (
                <button key={c} onClick={() => setNewCat(s => ({ ...s, color: c }))}
                  className={`w-6 h-6 rounded-full cursor-pointer hover:scale-110 transition-transform ${newCat.color === c ? "ring-2 ring-offset-1 ring-[#171717] dark:ring-[#f5f5f5]" : ""}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setAdding(false)}
              className="h-7 px-3 rounded-[5px] text-[12px] font-medium text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] cursor-pointer transition-colors"
              style={{ boxShadow: "var(--shadow-border)" }}>
              Hủy
            </button>
            <button onClick={handleAdd} disabled={saving}
              className="h-7 px-3 rounded-[5px] text-[12px] font-medium flex items-center gap-1 bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 cursor-pointer disabled:opacity-40">
              <Save className="w-3.5 h-3.5" />{saving ? "Đang lưu..." : "Thêm"}
            </button>
          </div>
        </div>
      ) : (
        <button id="btn-add-category" onClick={() => setAdding(true)}
          className="w-full h-9 rounded-[6px] text-[12px] font-medium flex items-center justify-center gap-2 border-2 border-dashed border-[#e2e2e2] dark:border-[#2d2d2d] text-[#999] hover:border-[#0072f5] hover:text-[#0072f5] cursor-pointer transition-colors">
          <Plus className="w-3.5 h-3.5" /> Thêm hạng mục
        </button>
      )}
    </div>
  );
}
