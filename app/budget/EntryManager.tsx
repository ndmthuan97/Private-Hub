"use client";
import { useState, useCallback, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import type { Category } from "./page";
import { formatVND } from "@/lib/utils";
import { Plus, Search, X, Check, Loader2 } from "lucide-react";
import { DetailDialog, EditDialog, type Entry, type Allocation } from "./DetailDialog";
import { Tip } from "@/components/ui/tip";

const MONTHS = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6",
                "Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];

export function EntryManager({ categories }: { categories: Category[] }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [month, setMonth]     = useState(() => new Date().getMonth() + 1);
  const [year, setYear]       = useState(() => new Date().getFullYear());
  const [amount, setAmount]   = useState("");
  const [saving, setSaving]   = useState(false);

  const [addOpen, setAddOpen] = useState(false);

  const [detail, setDetail] = useState<Entry | null>(null);
  const [edit, setEdit]     = useState<Entry | null>(null);

  // Named fetch$ to avoid shadowing the global fetch inside the callback
  const fetch$ = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/budget");
      const j = await r.json();
      setEntries(j.data?.entries ?? []);
    } catch { toast.error("Không thể tải lịch sử"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch$(); }, [fetch$]);

  async function handleSave() {
    const num = parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (!num) { toast.error("Nhập số tiền hợp lệ"); return; }
    if (year < 2000 || year > 2100) { toast.error("Năm không hợp lệ"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/budget", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, totalAmount: num }),
      });
      const j = await r.json();
      if (j.statusCode === 201) { toast.success("✅ Đã lưu phân bổ"); setAmount(""); setAddOpen(false); fetch$(); }
      else toast.error(j.message);
    } catch { toast.error("Lỗi kết nối"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    const r = await fetch(`/api/budget/${id}`, { method: "DELETE" });
    const j = await r.json();
    if (j.statusCode === 200) { toast.success("🗑️ Đã xóa"); setDetail(null); fetch$(); }
    else toast.error(j.message);
  }

  const filtered = entries
    .filter(e => {
      if (!search) return true;
      return `${MONTHS[e.month-1]} ${e.year}`.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month);

  return (
    <div className="space-y-3">
      {detail && !edit && (
        <DetailDialog
          entry={detail}
          onClose={() => setDetail(null)}
          onEdit={() => setEdit(detail)}
          onDelete={() => handleDelete(detail.id)}
          onSaved={() => { fetch$(); setDetail(null); }}
        />
      )}
      {edit && (
        <EditDialog
          entry={edit}
          onClose={() => setEdit(null)}
          onSaved={() => { fetch$(); setEdit(null); setDetail(null); }}
        />
      )}

      {addOpen && typeof window !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={() => setAddOpen(false)}>
          <div className="w-full max-w-sm rounded-[12px] bg-white dark:bg-[#111] overflow-hidden"
            style={{ boxShadow: "var(--shadow-card)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-[#999]">Ngân sách</p>
                <p className="text-[18px] font-semibold text-[#171717] dark:text-[#f5f5f5] mt-0.5">Thêm phân bổ mới</p>
              </div>
              <button onClick={() => setAddOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
                style={{ boxShadow: "var(--shadow-border)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-widest text-[#999] mb-1.5 block">Tháng / Năm</label>
                <div className="flex gap-2">
                  <select value={month} onChange={e => setMonth(+e.target.value)}
                    className="flex-1 h-10 px-3 text-[14px] font-medium rounded-[7px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] cursor-pointer"
                    style={{ boxShadow: "var(--shadow-border)" }}>
                    {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                  </select>
                  <input type="number" value={year} onChange={e => setYear(+e.target.value)}
                    min={2000} max={2100}
                    className="w-24 h-10 px-3 text-[14px] font-medium rounded-[7px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
                    style={{ boxShadow: "var(--shadow-border)" }} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-widest text-[#999] mb-1.5 block">Tổng thu nhập</label>
                <input type="text" inputMode="numeric" autoFocus
                  placeholder="VD: 10,000,000"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSave()}
                  className="w-full h-10 px-3 text-[14px] rounded-[7px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
                  style={{ boxShadow: "var(--shadow-border)" }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 px-5 pb-5">
              <button onClick={() => setAddOpen(false)}
                className="h-10 rounded-[7px] text-[14px] font-medium text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                style={{ boxShadow: "var(--shadow-border)" }}>Hủy</button>
              <button onClick={handleSave} disabled={saving}
                className="h-10 rounded-[7px] text-[14px] font-medium flex items-center justify-center gap-1.5 bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="rounded-[8px] bg-white dark:bg-[#111] overflow-hidden"
        style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3"
          style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">
            Lịch sử phân bổ
          </p>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-2 top-1.5 w-3.5 h-3.5 text-[#bbb] pointer-events-none" />
              <input type="text" placeholder="Tìm tháng/năm..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="h-7 pl-7 pr-3 w-full sm:w-36 text-[12px] rounded-[5px] bg-[#fafafa] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
                style={{ boxShadow: "var(--shadow-border)" }} />
            </div>
            <Tip label="Thêm phân bổ mới">
              <button onClick={() => setAddOpen(true)}
                className="h-7 w-7 flex items-center justify-center rounded-[5px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer shrink-0">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </Tip>
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-center text-[13px] text-[#999]">Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-[#999]">
            {search ? "Không tìm thấy." : "Chưa có bản ghi. Thêm phân bổ ở trên."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead>
                <tr style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
                  <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-[#171717] dark:text-[#f5f5f5]">
                    Tháng / Năm
                  </th>
                  {categories.map(c => (
                    <th key={c.id} className="px-3 py-3 text-right text-[11px] font-semibold uppercase tracking-widest whitespace-nowrap"
                      style={{ color: c.color }}>
                      {c.label}
                    </th>
                  ))}
                  <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-widest text-[#171717] dark:text-[#f5f5f5]">
                    Tổng
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => {
                  const allocs     = entry.allocations as Allocation[];
                  const total      = parseFloat(entry.totalAmount);
                  const totalSpent = allocs.reduce((s, a) => s + (a.spent ?? 0), 0);
                  const hasSpent   = totalSpent > 0;
                  return (
                    <Fragment key={entry.id}>
                      <tr onClick={() => setDetail(entry)}
                        className="hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                        style={{ boxShadow: "rgba(0,0,0,0.04) 0px -1px 0px 0px inset" }}>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-medium text-[#171717] dark:text-[#f5f5f5]">
                              {MONTHS[entry.month-1]} {entry.year}
                            </span>
                            {hasSpent && (
                              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#f0fdf4] dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-medium">
                                {Math.round((totalSpent/total)*100)}% dùng
                              </span>
                            )}
                          </div>
                        </td>
                        {categories.map(c => {
                          const a = allocs.find(x => x.key === c.key);
                          return (
                            <td key={c.id} className="px-3 py-3.5 text-right whitespace-nowrap text-[14px] text-[#999] tabular-nums">
                              {a ? formatVND(a.amount) : "–"}
                            </td>
                          );
                        })}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <span className="text-[15px] font-semibold tabular-nums text-[#171717] dark:text-[#f5f5f5]">
                            {formatVND(total)}
                          </span>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
