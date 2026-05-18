"use client";
// app/budget/page.tsx — Budget allocator với CRUD + setup %

import { useState, useEffect, useCallback, useRef } from "react";
import { Settings, Plus, Trash2, Pencil, Check, X, ChevronDown, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatVND } from "@/lib/utils";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────
interface Category {
  id: string; key: string; label: string; emoji: string;
  color: string; percentage: string; sortOrder: number;
}
interface Allocation {
  key: string; label: string; emoji: string; color: string;
  percentage: number; amount: number;
}
interface Entry {
  id: string; month: number; year: number;
  totalAmount: string; allocations: Allocation[];
  note: string; createdAt: string; updatedAt: string;
}

// ─── Donut Chart ──────────────────────────────────────────────
function DonutChart({ allocations }: { allocations: Allocation[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !allocations.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const size = 160;
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = `${size}px`; canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);
    const cx = size / 2, cy = size / 2, r = 66, inner = 40;
    let startAngle = -Math.PI / 2;
    const total = allocations.reduce((s, a) => s + a.percentage, 0);
    for (const a of allocations) {
      const slice = (a.percentage / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = a.color;
      ctx.fill();
      startAngle += slice;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, 2 * Math.PI);
    ctx.fillStyle = "var(--bg-page)";
    ctx.fill();
  }, [allocations]);
  return <canvas ref={canvasRef} aria-hidden="true" />;
}

// ─── Main Page ────────────────────────────────────────────────
export default function BudgetPage() {
  const [categories, setCategories]   = useState<Category[]>([]);
  const [entries, setEntries]         = useState<Entry[]>([]);
  const [loading, setLoading]         = useState(true);

  // Form state
  const [amount, setAmount]           = useState("");
  const [month, setMonth]             = useState(() => new Date().getMonth() + 1);
  const [year, setYear]               = useState(() => new Date().getFullYear());
  const [note, setNote]               = useState("");
  const [saving, setSaving]           = useState(false);

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [editCats, setEditCats]         = useState<Category[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // Edit entry inline
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editAmount, setEditAmount]   = useState("");
  const [editNote, setEditNote]       = useState("");

  // Filter
  const [filterYear, setFilterYear]   = useState<number | "">("");

  // ─── Fetch ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, entRes] = await Promise.all([
        fetch("/api/budget/categories"),
        fetch(`/api/budget${filterYear ? `?year=${filterYear}` : ""}`),
      ]);
      const catJson = await catRes.json();
      const entJson = await entRes.json();
      setCategories(catJson.data?.categories ?? []);
      setEntries(entJson.data?.entries ?? []);
    } catch {
      toast.error("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [filterYear]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Computed ───────────────────────────────────────────────
  const totalPct = editCats.reduce((s, c) => s + parseFloat(c.percentage || "0"), 0);
  const pctValid  = Math.abs(totalPct - 100) < 0.01;

  const previewAllocations: Allocation[] = categories.map((c) => ({
    key: c.key, label: c.label, emoji: c.emoji, color: c.color,
    percentage: parseFloat(c.percentage),
    amount: Math.round((parseFloat(amount || "0") * parseFloat(c.percentage)) / 100),
  }));

  // ─── Handlers ───────────────────────────────────────────────
  async function handleSaveEntry() {
    const num = parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (!num || num <= 0) { toast.error("Nhập số tiền hợp lệ"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, totalAmount: num, note }),
      });
      const json = await res.json();
      if (json.statusCode === 201) {
        toast.success("Đã lưu phân bổ");
        setAmount(""); setNote("");
        fetchData();
      } else {
        toast.error(json.message);
      }
    } catch { toast.error("Lỗi kết nối"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa bản ghi này?")) return;
    const res = await fetch(`/api/budget/${id}`, { method: "DELETE" });
    const json = await res.json();
    json.statusCode === 200 ? (toast.success("Đã xóa"), fetchData()) : toast.error(json.message);
  }

  async function handleUpdate(id: string) {
    const num = parseFloat(editAmount.replace(/[^0-9.]/g, ""));
    if (!num || num <= 0) { toast.error("Số tiền không hợp lệ"); return; }
    const res = await fetch(`/api/budget/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalAmount: num, note: editNote }),
    });
    const json = await res.json();
    if (json.statusCode === 200) { toast.success("Đã cập nhật"); setEditingId(null); fetchData(); }
    else toast.error(json.message);
  }

  async function handleSaveSettings() {
    if (!pctValid) return;
    setSavingSettings(true);
    try {
      const res = await fetch("/api/budget/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editCats.map((c) => ({ id: c.id, percentage: parseFloat(c.percentage) }))),
      });
      const json = await res.json();
      if (json.statusCode === 200) {
        toast.success("Đã cập nhật tỷ lệ");
        setShowSettings(false);
        fetchData();
      } else { toast.error(json.message); }
    } catch { toast.error("Lỗi kết nối"); }
    finally { setSavingSettings(false); }
  }

  const monthNames = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
                      "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="px-6 py-8 max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[9999px] text-[12px] font-[500] bg-[hsl(280,80%,60%,0.12)] text-[hsl(280,80%,70%)] mb-2">
            💰 Phân Bổ Ngân Sách
          </span>
          <h1 className="text-[28px] font-[600] tracking-[-0.03em] text-[var(--fg-primary)]">
            Phân bổ Thu nhập
          </h1>
          <p className="text-[14px] text-[var(--fg-secondary)] mt-0.5">
            Nhập thu nhập, chọn tháng/năm — tự động tính theo tỷ lệ đã cài.
          </p>
        </div>
        <Button
          id="btn-settings"
          variant="secondary"
          onClick={() => { setEditCats(categories.map(c => ({...c}))); setShowSettings(s => !s); }}
        >
          <Settings className="w-4 h-4" aria-hidden="true" />
          Cài đặt %
        </Button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="rounded-[12px] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card)] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-[600] text-[var(--fg-primary)]">Cài đặt tỷ lệ phân bổ</h2>
            <span className={cn(
              "text-[13px] font-[600] px-2.5 py-0.5 rounded-[9999px]",
              pctValid
                ? "bg-[hsl(142,76%,36%,0.15)] text-[hsl(142,76%,55%)]"
                : "bg-[hsl(0,84%,60%,0.15)] text-[hsl(0,84%,65%)]"
            )}>
              Tổng: {totalPct.toFixed(1)}%
              {pctValid ? " ✓" : " (cần = 100%)"}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {editCats.map((cat, i) => (
              <div key={cat.id} className="flex items-center gap-3 p-3 rounded-[8px] bg-[var(--bg-page)]">
                <span className="text-xl w-8 text-center">{cat.emoji}</span>
                <div className="flex-1">
                  <p className="text-[13px] font-[500] text-[var(--fg-primary)]">{cat.label}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    id={`pct-${cat.key}`}
                    type="number" min="0" max="100" step="0.5"
                    value={editCats[i].percentage}
                    onChange={(e) => {
                      const next = [...editCats];
                      next[i] = { ...next[i], percentage: e.target.value };
                      setEditCats(next);
                    }}
                    className="w-20 text-right text-[13px]"
                    aria-label={`${cat.label} percentage`}
                  />
                  <span className="text-[13px] text-[var(--fg-secondary)]">%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button id="btn-cancel-settings" variant="ghost" onClick={() => setShowSettings(false)}>
              <X className="w-4 h-4" /> Hủy
            </Button>
            <Button id="btn-save-settings" onClick={handleSaveSettings} disabled={!pctValid || savingSettings}>
              <Save className="w-4 h-4" />
              {savingSettings ? "Đang lưu..." : "Lưu tỷ lệ"}
            </Button>
          </div>
        </div>
      )}

      {/* Input Form */}
      <div className="rounded-[12px] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card)] p-6 space-y-4">
        <h2 className="text-[15px] font-[600] text-[var(--fg-primary)]">Thêm phân bổ mới</h2>

        {/* Month/Year + Amount */}
        <div className="flex flex-wrap gap-3">
          {/* Month */}
          <div className="relative">
            <select
              id="select-month"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="appearance-none h-10 pl-3 pr-8 rounded-[6px] bg-[var(--bg-page)] [box-shadow:var(--shadow-border)] text-[14px] text-[var(--fg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
              aria-label="Chọn tháng"
            >
              {monthNames.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-[var(--fg-secondary)] pointer-events-none" />
          </div>

          {/* Year */}
          <div className="relative">
            <select
              id="select-year"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="appearance-none h-10 pl-3 pr-8 rounded-[6px] bg-[var(--bg-page)] [box-shadow:var(--shadow-border)] text-[14px] text-[var(--fg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] cursor-pointer"
              aria-label="Chọn năm"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-3 w-4 h-4 text-[var(--fg-secondary)] pointer-events-none" />
          </div>

          {/* Amount */}
          <Input
            id="input-amount"
            type="text" inputMode="numeric"
            placeholder="Tổng thu nhập (VD: 10,000,000)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 min-w-[200px]"
            aria-label="Tổng thu nhập"
          />

          {/* Note */}
          <Input
            id="input-note"
            type="text" placeholder="Ghi chú (tuỳ chọn)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 min-w-[160px]"
            aria-label="Ghi chú"
          />

          <Button id="btn-save-entry" onClick={handleSaveEntry} disabled={saving}>
            <Plus className="w-4 h-4" />
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>

        {/* Live Preview */}
        {parseFloat(amount.replace(/[^0-9.]/g, "")) > 0 && (
          <div className="pt-2 space-y-3">
            <div className="flex items-center gap-6">
              <DonutChart allocations={previewAllocations} />
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 flex-1">
                {previewAllocations.map((a) => (
                  <div key={a.key} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                      <span className="text-[12px] text-[var(--fg-secondary)]">{a.emoji} {a.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[12px] font-[600] text-[var(--fg-primary)]">{formatVND(a.amount)}</span>
                      <span className="text-[11px] text-[var(--fg-secondary)] ml-1">{a.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-[600] text-[var(--fg-primary)]">Lịch sử phân bổ</h2>
          {/* Filter by year */}
          <div className="relative">
            <select
              id="filter-year"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value) : "")}
              className="appearance-none h-9 pl-3 pr-7 rounded-[6px] bg-[var(--bg-surface)] [box-shadow:var(--shadow-border)] text-[13px] text-[var(--fg-primary)] focus:outline-none cursor-pointer"
              aria-label="Lọc theo năm"
            >
              <option value="">Tất cả năm</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-1.5 top-2.5 w-3.5 h-3.5 text-[var(--fg-secondary)] pointer-events-none" />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="rounded-[10px] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card)] p-5 h-24 skeleton" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-[12px] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card)] p-10 text-center text-[14px] text-[var(--fg-secondary)]">
            Chưa có bản ghi nào. Thêm phân bổ đầu tiên ở trên.
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const isEditing = editingId === entry.id;
              const allocations = entry.allocations as Allocation[];
              const total = parseFloat(entry.totalAmount);

              return (
                <div key={entry.id} className="rounded-[12px] bg-[var(--bg-surface)] [box-shadow:var(--shadow-card)] p-5 space-y-3">
                  {/* Row header */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <span className="text-[15px] font-[600] text-[var(--fg-primary)]">
                        {monthNames[entry.month - 1]} {entry.year}
                      </span>
                      {isEditing ? (
                        <Input
                          id={`edit-amount-${entry.id}`}
                          type="text" inputMode="numeric"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-40 text-right text-[14px]"
                          aria-label="Sửa số tiền"
                        />
                      ) : (
                        <span className="text-[20px] font-[700] tracking-[-0.02em] text-[var(--fg-primary)]">
                          {formatVND(total)}
                        </span>
                      )}
                      {entry.note && !isEditing && (
                        <span className="text-[12px] text-[var(--fg-secondary)]">— {entry.note}</span>
                      )}
                      {isEditing && (
                        <Input
                          id={`edit-note-${entry.id}`}
                          type="text" placeholder="Ghi chú"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="w-36 text-[13px]"
                          aria-label="Sửa ghi chú"
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Button id={`btn-confirm-edit-${entry.id}`} variant="secondary" onClick={() => handleUpdate(entry.id)}>
                            <Check className="w-3.5 h-3.5" /> Lưu
                          </Button>
                          <Button id={`btn-cancel-edit-${entry.id}`} variant="ghost" onClick={() => setEditingId(null)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            id={`btn-edit-${entry.id}`}
                            variant="ghost"
                            onClick={() => { setEditingId(entry.id); setEditAmount(String(total)); setEditNote(entry.note ?? ""); }}
                            aria-label="Sửa"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            id={`btn-delete-${entry.id}`}
                            variant="ghost"
                            onClick={() => handleDelete(entry.id)}
                            aria-label="Xóa"
                            className="text-[hsl(0,84%,65%)] hover:text-[hsl(0,84%,65%)]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Allocations grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allocations.map((a) => (
                      <div
                        key={a.key}
                        className="flex items-center justify-between px-3 py-2 rounded-[8px] bg-[var(--bg-page)]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                          <span className="text-[12px] text-[var(--fg-secondary)]">{a.emoji} {a.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[12px] font-[600] text-[var(--fg-primary)]">{formatVND(a.amount)}</span>
                          <span className="text-[10px] text-[var(--fg-secondary)] ml-1">{a.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
