"use client";
// components/layout/Sidebar.tsx — Dace style
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, Wallet, LayoutDashboard, LogOut, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { href: "/",            label: "Tổng quan",        icon: LayoutDashboard, color: "#666" },
  { href: "/conversation",label: "Luyện Giao Tiếp",  icon: MessageCircle,   color: "hsl(160,84%,42%)" },
  { href: "/budget",      label: "Phân Bổ Ngân Sách",icon: Wallet,          color: "hsl(38,92%,52%)" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const saved  = localStorage.getItem("ph_theme") as "dark" | "light" | null;
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const t = saved ?? system;
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  function toggleTheme() {
    setTheme(t => {
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
    <aside className="flex flex-col w-56 min-h-screen shrink-0 sticky top-0 h-screen bg-white dark:bg-[#111]"
      style={{ boxShadow: "rgba(0,0,0,0.06) 1px 0px 0px 0px" }}>

      {/* Logo */}
      <div className="px-5 py-4" style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0"
            style={{ background: "hsl(239,84%,67%)" }}>
            <span className="text-white text-[12px] font-bold">P</span>
          </div>
          <span className="text-[14px] font-semibold tracking-tight text-[#171717] dark:text-[#f5f5f5]">
            Private Hub
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const Icon     = item.icon;
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              id={`nav-${item.href.replace("/", "") || "home"}`}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-[6px]",
                "text-[13px] font-medium leading-[1.43]",
                "transition-all duration-150 cursor-pointer",
                isActive
                  ? "bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
                  : "text-[#999] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#666] dark:hover:text-[#bbb]"
              )}
            >
              <Icon
                className="w-4 h-4 shrink-0"
                style={{ color: isActive ? item.color : undefined }}
                aria-hidden="true"
              />
              <span>{item.label}</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: item.color }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 space-y-0.5" style={{ boxShadow: "rgba(0,0,0,0.06) 0px -1px 0px 0px" }}>
        <button id="btn-sidebar-theme" onClick={toggleTheme}
          aria-label={theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-[13px] font-medium text-[#999] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#666] dark:hover:text-[#bbb] transition-all duration-150 cursor-pointer">
          {theme === "dark"
            ? <Sun  className="w-4 h-4 shrink-0" aria-hidden="true" />
            : <Moon className="w-4 h-4 shrink-0" aria-hidden="true" />}
          <span>{theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}</span>
        </button>

        <button id="btn-logout" onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[6px] text-[13px] font-medium text-[#999] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-red-500 transition-all duration-150 cursor-pointer">
          <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Đăng xuất</span>
        </button>

        <p className="text-[10px] text-[#bbb] px-3 pt-1">Private Hub v1.0</p>
      </div>
    </aside>
  );
}
