"use client";
// components/layout/Sidebar.tsx
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Newspaper, MessageCircle, Wallet, LayoutDashboard, LogOut, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Tổng quan",
    icon: LayoutDashboard,
    accent: "text-[var(--fg-primary)]",
    activeAccent: "text-[var(--brand)]",
  },
  {
    href: "/tech-digest",
    label: "Tech Digest",
    icon: Newspaper,
    accent: "text-[var(--digest-color)]",
    activeAccent: "text-[var(--digest-color)]",
    dotClass: "bg-[var(--digest-color)]",
  },
  {
    href: "/conversation",
    label: "Luyện Giao Tiếp",
    icon: MessageCircle,
    accent: "text-[var(--convo-color)]",
    activeAccent: "text-[var(--convo-color)]",
    dotClass: "bg-[var(--convo-color)]",
  },
  {
    href: "/budget",
    label: "Phân Bổ Ngân Sách",
    icon: Wallet,
    accent: "text-[var(--budget-color)]",
    activeAccent: "text-[var(--budget-color)]",
    dotClass: "bg-[var(--budget-color)]",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved  = localStorage.getItem("ph_theme") as "dark" | "light" | null;
    const system = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    const t = saved ?? system;
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  function toggleTheme() {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("ph_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "flex flex-col w-60 min-h-screen shrink-0",
        "bg-[var(--bg-surface)]",
        "sticky top-0 h-screen",
        "[box-shadow:1px_0_0_0_rgba(255,255,255,0.06)]",
      )}
    >
      {/* Logo */}
      <div className="px-6 py-5 [box-shadow:0_1px_0_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[6px] gradient-brand flex items-center justify-center">
            <span className="text-white text-[12px] font-[700]">P</span>
          </div>
          <span className="text-[15px] font-[600] tracking-[-0.02em] text-[var(--fg-primary)]">
            Private Hub
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.href.replace("/", "") || "home"}`}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-[6px]",
                "text-[14px] font-[500] leading-[1.43]",
                "transition-all duration-[150ms] ease",
                "cursor-pointer",
                isActive
                  ? "bg-[var(--bg-hover)] text-[var(--fg-primary)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg-secondary)]"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors duration-[150ms]",
                  isActive ? item.activeAccent : "text-current"
                )}
                aria-hidden="true"
              />
              <span>{item.label}</span>
              {isActive && item.dotClass && (
                <span
                  className={cn(
                    "ml-auto w-1.5 h-1.5 rounded-full",
                    item.dotClass
                  )}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: theme toggle + logout */}
      <div className="px-3 py-4 [box-shadow:0_-1px_0_0_rgba(255,255,255,0.06)] space-y-1">
        {/* Theme toggle */}
        <button
          id="btn-sidebar-theme"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-[13px] font-[500] text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg-secondary)] transition-all duration-150 cursor-pointer"
        >
          {theme === "dark"
            ? <Sun  className="w-4 h-4 shrink-0" aria-hidden="true" />
            : <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />}
          <span>{theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}</span>
        </button>

        {/* Logout */}
        <button
          id="btn-logout"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-[6px] text-[13px] font-[500] text-[var(--fg-muted)] hover:bg-[var(--bg-elevated)] hover:text-[hsl(0,84%,65%)] transition-all duration-150 cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Đăng xuất</span>
        </button>

        <p className="text-[10px] text-[var(--fg-muted)] px-3 pt-1">Private Hub v1.0</p>
      </div>
    </aside>
  );
}
