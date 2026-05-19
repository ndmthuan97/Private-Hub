"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { CategoryManager } from "./CategoryManager";
import { EntryManager } from "./EntryManager";

export interface Category {
  id: string; key: string; label: string; emoji: string;
  color: string; percentage: string; sortOrder: number;
}

export default function BudgetPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<"entries" | "categories">("entries");

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/budget/categories");
      const json = await res.json();
      setCategories(json.data?.categories ?? []);
    } catch { toast.error("Không thể tải danh mục"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-[20px] font-semibold tracking-tight text-[#171717] dark:text-[#f5f5f5]">
          Phân Bổ Ngân Sách
        </h1>
        <div className="flex gap-1 p-1 rounded-[6px] bg-[#f5f5f5] dark:bg-[#1a1a1a]"
          style={{ boxShadow: "var(--shadow-border)" }}>
          {(["entries", "categories"] as const).map(t => (
            <button key={t} id={`tab-${t}`} onClick={() => setTab(t)}
              className="px-3.5 py-1.5 rounded-[4px] text-[12px] font-medium transition-all duration-150 cursor-pointer"
              style={tab === t
                ? { background: "#fff", color: "#171717", boxShadow: "var(--shadow-border)" }
                : { background: "transparent", color: "#999" }}>
              {t === "entries" ? "📊 Phân bổ" : "⚙️ Hạng mục"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(n => (
            <div key={n} className="h-20 rounded-[8px] bg-[#f5f5f5] dark:bg-[#1a1a1a] animate-pulse" />
          ))}
        </div>
      ) : tab === "entries" ? (
        <EntryManager categories={categories} />
      ) : (
        <CategoryManager categories={categories} onRefresh={fetchCategories} />
      )}
    </div>
  );
}
