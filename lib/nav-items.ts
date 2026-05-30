import {
  MessageCircle, Wallet, LayoutDashboard, Map,
  CalendarDays, BookOpen, BookA, Headphones, PenLine, Languages,
  TrendingUp, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; color: string };
export type NavGroup = { label?: string; items: NavItem[] };

/** Single source of truth for all navigation groups & items. */
export const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard, color: "#666" }] },
  { label: "Học tập", items: [
    { href: "/conversation", label: "Luyện Giao Tiếp", icon: MessageCircle, color: "hsl(160,84%,42%)" },
    { href: "/vocab",        label: "Từ Vựng",         icon: BookA,         color: "hsl(239,84%,67%)" },
    { href: "/dictation",    label: "Daily Dictation",  icon: Headphones,    color: "hsl(160,84%,42%)" },
    { href: "/writing",      label: "Luyện Viết",       icon: PenLine,       color: "hsl(24,95%,53%)" },
    { href: "/translation",  label: "Luyện Dịch",       icon: Languages,     color: "hsl(24,95%,53%)" },
  ]},
  { label: "Quản lý", items: [
    { href: "/budget",    label: "Ngân Sách", icon: Wallet,      color: "hsl(38,92%,52%)" },
    { href: "/strategy",  label: "Strategy",  icon: Map,         color: "hsl(262,83%,58%)" },
    { href: "/calendar",  label: "Calendar",  icon: CalendarDays, color: "hsl(217,91%,60%)" },
  ]},
  { label: "Công cụ", items: [
    { href: "/notebooklm", label: "NotebookLM", icon: BookOpen,    color: "hsl(217,91%,60%)" },
    { href: "/trending",   label: "Trending",   icon: TrendingUp,  color: "hsl(340,75%,55%)" },
  ]},
];

/** Flat list of all nav items (excluding settings). */
export const ALL_NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);

/** Flat list + settings for mobile floating menu. */
export const ALL_MENU_ITEMS: NavItem[] = [
  ...ALL_NAV_ITEMS,
  { href: "/settings", label: "Cài đặt", icon: Settings, color: "#888" },
];

/** Route → title mapping (for mobile header). */
export const TITLE_MAP: Record<string, string> = Object.fromEntries(
  ALL_MENU_ITEMS.map(i => [i.href, i.label])
);
TITLE_MAP["/embed"] = "Xem trang";

/** Routes with back-button parent mapping for mobile header. */
export const PARENT_MAP: Record<string, string> = {
  "/vocab": "/vocab",
  "/strategy": "/strategy",
};
