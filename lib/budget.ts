export interface BudgetCategory {
  key: string;
  label: string;
  emoji: string;
  percentage: number;
  color: string;
  description: string;
}

export const BUDGET_CATEGORIES: BudgetCategory[] = [
  {
    key: "essential",
    label: "Cần Thiết",
    emoji: "🏠",
    percentage: 50,
    color: "#22c55e",
    description: "Ăn uống, thuê nhà, điện nước, đi lại",
  },
  {
    key: "investment",
    label: "Đầu Tư",
    emoji: "📈",
    percentage: 15,
    color: "#3b82f6",
    description: "Chứng khoán, crypto, bất động sản",
  },
  {
    key: "enjoyment",
    label: "Hưởng Thụ",
    emoji: "🎉",
    percentage: 14.5,
    color: "#f97316",
    description: "Du lịch, giải trí, sở thích cá nhân",
  },
  {
    key: "savings",
    label: "Tiết Kiệm",
    emoji: "💰",
    percentage: 10,
    color: "#06b6d4",
    description: "Quỹ khẩn cấp, tiết kiệm dài hạn",
  },
  {
    key: "education",
    label: "Giáo Dục",
    emoji: "📚",
    percentage: 10,
    color: "#a855f7",
    description: "Khóa học, sách, phát triển bản thân",
  },
  {
    key: "charity",
    label: "Từ Thiện",
    emoji: "❤️",
    percentage: 0.5,
    color: "#ec4899",
    description: "Đóng góp xã hội, giúp đỡ người khác",
  },
];

export interface BudgetAllocation {
  category: BudgetCategory;
  amount: number;
}

export function calculateBudget(totalIncome: number): BudgetAllocation[] {
  return BUDGET_CATEGORIES.map((cat) => ({
    category: cat,
    amount: Math.round((totalIncome * cat.percentage) / 100),
  }));
}

export interface BudgetHistory {
  id: string;
  totalIncome: number;
  allocations: BudgetAllocation[];
  note: string;
  createdAt: string;
}

export function saveBudgetHistory(
  totalIncome: number,
  allocations: BudgetAllocation[],
  note = ""
): void {
  if (typeof window === "undefined") return;
  const key = "private_hub_budget_history";
  const existing: BudgetHistory[] = JSON.parse(localStorage.getItem(key) || "[]");
  const entry: BudgetHistory = {
    id: crypto.randomUUID(),
    totalIncome,
    allocations,
    note,
    createdAt: new Date().toISOString(),
  };
  const updated = [entry, ...existing].slice(0, 10); // keep last 10
  localStorage.setItem(key, JSON.stringify(updated));
}

export function getBudgetHistory(): BudgetHistory[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem("private_hub_budget_history") || "[]");
}
