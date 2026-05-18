"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Check, Pencil, Trash2, X, AlertTriangle, Loader2 } from "lucide-react";
import { formatVND } from "@/lib/utils";

export interface Allocation {
  key: string; label: string; emoji: string; color: string;
  percentage: number; amount: number; spent?: number;
}
export interface Entry {
  id: string; month: number; year: number;
  totalAmount: string; allocations: Allocation[];
}

const MONTHS = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
                "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

/* ── SVG Cycle Arrow Chart ── */
function HexChart({ allocs }: { allocs: Allocation[] }) {
  const cx = 185, cy = 148, R = 68, r = 42, cr = 26, gap = 2.5, tipExt = 13;
  const midR  = (R + r) / 2;
  let angle   = -90;

  const equalSpan = 360 / allocs.length;
  const segments = allocs.map(a => {
    const span     = equalSpan;
    const arrowDeg = Math.min(10, span * 0.35);
    const sa  = (angle + gap)             * (Math.PI / 180);
    const ea  = (angle + span - arrowDeg) * (Math.PI / 180);
    const ta  = (angle + span)            * (Math.PI / 180);
    const la  = (angle + span / 2)        * (Math.PI / 180);
    const lg  = span > 180 ? 1 : 0;
    const d   =
      `M ${cx + r * Math.cos(sa)} ${cy + r * Math.sin(sa)} ` +
      `L ${cx + R * Math.cos(sa)} ${cy + R * Math.sin(sa)} ` +
      `A ${R} ${R} 0 ${lg} 1 ${cx + R * Math.cos(ea)} ${cy + R * Math.sin(ea)} ` +
      `L ${cx + (R + tipExt) * Math.cos(ta)} ${cy + (R + tipExt) * Math.sin(ta)} ` +
      `L ${cx + r * Math.cos(ea)} ${cy + r * Math.sin(ea)} ` +
      `A ${r} ${r} 0 ${lg} 0 ${cx + r * Math.cos(sa)} ${cy + r * Math.sin(sa)} Z`;
    const isRight = Math.cos(la) >= 0;
    const p1x = cx + (R + tipExt + 3)  * Math.cos(la);
    const p1y = cy + (R + tipExt + 3)  * Math.sin(la);
    const p2x = cx + (R + tipExt + 28) * Math.cos(la);
    const p2y = cy + (R + tipExt + 28) * Math.sin(la);
    const tx  = p2x + (isRight ? 4 : -4);
    angle += span;
    return {
      key: a.key, color: a.color, d, pct: a.percentage, label: a.label, amount: a.amount,
      lx: cx + midR * Math.cos(la), ly: cy + midR * Math.sin(la),
      p1x, p1y, p2x, p2y, tx, isRight,
    };
  });

  return (
    <svg viewBox="0 0 370 296" className="w-full">
      {segments.map(s => (
        <path key={s.key} d={s.d}
          fill={s.color} fillOpacity="0.85"
          stroke="white" strokeWidth="2.5" strokeLinejoin="round"
          className="dark:stroke-[#111]" />
      ))}
      {segments.map(s => (
        <text key={`pct-${s.key}`} x={s.lx} y={s.ly}
          textAnchor="middle" dominantBaseline="middle"
          fill="white" fontSize="12" fontWeight="800">
          {s.pct}%
        </text>
      ))}
      {segments.map(s => (
        <g key={`ll-${s.key}`}>
          <line x1={s.p1x} y1={s.p1y} x2={s.p2x} y2={s.p2y}
            stroke={s.color} strokeWidth="1" strokeOpacity="0.65" />
          <circle cx={s.p1x} cy={s.p1y} r="2.5" fill={s.color} />
          <text x={s.tx} y={s.p2y - 6}
            textAnchor={s.isRight ? "start" : "end"} dominantBaseline="middle"
            fontSize="9" fontWeight="600" fill={s.color}>
            {s.label}
          </text>
          <text x={s.tx} y={s.p2y + 7}
            textAnchor={s.isRight ? "start" : "end"} dominantBaseline="middle"
            fontSize="10.5" fontWeight="700" fill={s.color}>
            {formatVND(s.amount)}
          </text>
        </g>
      ))}
      <circle cx={cx} cy={cy} r={cr} fill="white" stroke="#e5e5e5" strokeWidth="1.5"
        className="dark:fill-[#111] dark:stroke-[#333]" />
    </svg>
  );
}

/* ── Detail Dialog ── */
export function DetailDialog({
  entry, onClose, onEdit, onDelete, onSaved,
}: {
  entry: Entry; onClose: () => void;
  onEdit: () => void; onDelete: () => void; onSaved: () => void;
}) {
  const allocs = entry.allocations as Allocation[];
  const total  = parseFloat(entry.totalAmount);
  const [spent, setSpent] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    allocs.forEach(a => { m[a.key] = a.spent ? String(a.spent) : ""; });
    return m;
  });
  const [saving, setSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  function parseAmt(v: string): number {
    return parseFloat(v.replace(/\./g, "").replace(/,/g, ".")) || 0;
  }

  const totalSpent = Object.values(spent).reduce((s, v) => s + parseAmt(v), 0);

  async function save() {
    setSaving(true);
    const spentAmounts: Record<string, number> = {};
    Object.entries(spent).forEach(([k,v]) => { spentAmounts[k] = parseAmt(v); });
    try {
      const r = await fetch(`/api/budget/${entry.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spentAmounts }),
      });
      const j = await r.json();
      if (j.statusCode === 200) { toast.success("✅ Đã lưu chi tiêu"); onSaved(); }
      else toast.error(j.message);
    } catch { toast.error("Lỗi kết nối"); }
    finally { setSaving(false); }
  }

  if (typeof window === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}>
      <div className="w-full sm:max-w-4xl rounded-t-[16px] sm:rounded-[12px] bg-white dark:bg-[#111] overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
          <p className="text-[18px] font-semibold text-[#171717] dark:text-[#f5f5f5]">
            {MONTHS[entry.month-1]} {entry.year}
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={onEdit} title="Chỉnh sửa"
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#666] dark:text-[#888] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <Pencil className="w-4 h-4" />
            </button>
            <button onClick={() => setDelOpen(true)} title="Xóa"
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
              style={{ boxShadow: "var(--shadow-border)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chart + Tracker: stacked on mobile, side-by-side on desktop */}
        <div className="flex flex-col md:flex-row md:items-stretch" style={{ boxShadow: "rgba(0,0,0,0.04) 0px 1px 0px 0px" }}>
          {/* Chart */}
          <div className="w-full md:w-[420px] md:shrink-0 p-2 flex items-center justify-center md:border-r border-b md:border-b-0 border-[#f0f0f0] dark:border-[#222]">
            <HexChart allocs={allocs} />
          </div>

          {/* Tracker */}
          <div className="flex-1 px-4 py-3 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#999] mb-2.5">Theo dõi chi tiêu</p>
            <div className="space-y-3">
              {allocs.map(a => {
                const spentVal  = parseAmt(spent[a.key] || "0");
                const remaining = a.amount - spentVal;
                const done      = spentVal >= a.amount && a.amount > 0;
                const pct       = a.amount > 0 ? Math.min(100, (spentVal / a.amount) * 100) : 0;
                return (
                  <div key={a.key}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-semibold flex-1 truncate" style={{ color: a.color }}>{a.label}</span>
                      <input type="text" inputMode="numeric" placeholder="0"
                        value={spent[a.key] ?? ""}
                        onChange={e => setSpent(s => ({ ...s, [a.key]: e.target.value }))}
                        className="w-20 sm:w-28 h-7 px-2 text-[12px] text-right rounded-[5px] tabular-nums bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
                        style={{ boxShadow: "var(--shadow-border)" }} />
                      <div className="w-20 sm:w-28 shrink-0 flex items-center justify-end">
                        {done ? (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-500">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : remaining > 0 ? (
                          <button
                            onClick={() => setSpent(s => ({ ...s, [a.key]: String(a.amount) }))}
                            className="w-full h-7 px-2 text-[11px] text-right rounded-[5px] tabular-nums text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
                            style={{ boxShadow: "var(--shadow-border)" }}>
                            {formatVND(remaining)}
                          </button>
                        ) : <div className="h-7 w-28" />}
                      </div>
                    </div>
                    <div className="h-1 rounded-full bg-[#f0f0f0] dark:bg-[#2a2a2a] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: a.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ boxShadow: "rgba(0,0,0,0.06) 0px -1px 0px 0px" }}>
          <div className="text-[13px] text-[#999]">
            Đã dùng <strong className="text-[#171717] dark:text-[#f5f5f5]">{formatVND(totalSpent)}</strong>
            {" "}/ {formatVND(total)}
            {total > 0 && <span className="ml-1 text-[#bbb]">({Math.round((totalSpent/total)*100)}%)</span>}
          </div>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1.5 h-9 px-4 rounded-[6px] text-[13px] font-medium bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {saving ? "Đang lưu..." : "Lưu chi tiêu"}
          </button>
        </div>
      </div>

      {/* Delete confirm */}
      {delOpen && (
        <div className="absolute inset-0 flex items-center justify-center p-4" onClick={() => setDelOpen(false)}>
          <div className="w-full max-w-xs rounded-[10px] bg-white dark:bg-[#111] overflow-hidden"
            style={{ boxShadow: "var(--shadow-card)" }} onClick={e => e.stopPropagation()}>
            <div className="px-5 py-5 text-center space-y-3">
              <span className="flex h-11 w-11 mx-auto items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30 text-red-500">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] mb-1">Xác nhận xóa</p>
                <p className="text-[12px] text-[#999]">Bản ghi {MONTHS[entry.month-1]} {entry.year} sẽ bị xóa vĩnh viễn.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pb-4">
              <button onClick={() => setDelOpen(false)}
                className="h-9 rounded-[7px] text-[13px] font-medium text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                style={{ boxShadow: "var(--shadow-border)" }}>Hủy</button>
              <button onClick={() => { setDelOpen(false); onDelete(); }}
                className="h-9 rounded-[7px] text-[13px] font-medium bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

/* ── Edit Dialog ── */
export function EditDialog({
  entry, onClose, onSaved,
}: { entry: Entry; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(entry.totalAmount);
  const [saving, setSaving] = useState(false);
  async function save() {
    const num = parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (!num) { toast.error("Số tiền không hợp lệ"); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/budget/${entry.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalAmount: num }),
      });
      const j = await r.json();
      if (j.statusCode === 200) { toast.success("✅ Đã cập nhật"); onSaved(); onClose(); }
      else toast.error(j.message);
    } catch { toast.error("Lỗi kết nối"); }
    finally { setSaving(false); }
  }
  if (typeof window === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-[12px] bg-white dark:bg-[#111] overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)" }} onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4" style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
          <p className="text-[12px] font-medium uppercase tracking-widest text-[#999]">Chỉnh sửa</p>
          <p className="text-[18px] font-semibold text-[#171717] dark:text-[#f5f5f5] mt-0.5">
            {MONTHS[entry.month-1]} {entry.year}
          </p>
        </div>
        <div className="px-5 py-4">
          <label className="text-[12px] font-medium uppercase tracking-widest text-[#999] mb-1.5 block">Tổng thu nhập</label>
          <input type="text" inputMode="numeric" value={amount} autoFocus
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === "Enter" && save()}
            className="w-full h-10 px-3 text-[15px] rounded-[7px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
            style={{ boxShadow: "var(--shadow-border)" }} />
        </div>
        <div className="grid grid-cols-2 gap-2 px-5 pb-5">
          <button onClick={onClose}
            className="h-10 rounded-[7px] text-[14px] font-medium text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
            style={{ boxShadow: "var(--shadow-border)" }}>Hủy</button>
          <button onClick={save} disabled={saving}
            className="h-10 rounded-[7px] text-[14px] font-medium bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40">
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
