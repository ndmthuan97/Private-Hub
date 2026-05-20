"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle, Wallet, LayoutDashboard, LogOut, Sun, Moon, Map, Plus, Globe, X, Check, CalendarDays, PanelLeftClose, PanelLeftOpen, Menu, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";

const NAV_ITEMS = [
  { href: "/",             label: "Tổng quan",         icon: LayoutDashboard, color: "#666" },
  { href: "/conversation", label: "Luyện Giao Tiếp",   icon: MessageCircle,   color: "hsl(160,84%,42%)" },
  { href: "/budget",       label: "Phân Bổ Ngân Sách", icon: Wallet,          color: "hsl(38,92%,52%)" },
  { href: "/strategy",     label: "Strategy",           icon: Map,             color: "hsl(262,83%,58%)" },
  { href: "/calendar",     label: "Calendar",           icon: CalendarDays,    color: "hsl(217,91%,60%)" },
  { href: "/notebooklm",   label: "NotebookLM",         icon: BookOpen,        color: "hsl(217,91%,60%)" },
];

const DEFAULT_EXTERNAL = [
  { href: "https://dailydictation.com/exercises", label: "Daily Dictation", color: "hsl(160,84%,42%)" },
];

type ExternalItem = { href: string; label: string; color: string };

const STORAGE_KEY = "ph_external_links";

function getFavicon(url: string) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=16`; }
  catch { return null; }
}

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const [theme, setTheme]         = useState<"dark" | "light">("light");
  const [expanded, setExpanded]   = useState(true);
  const [customs, setCustoms]     = useState<ExternalItem[]>([]);
  const [addOpen, setAddOpen]     = useState(false);
  const [newUrl, setNewUrl]       = useState("");
  const [newLabel, setNewLabel]   = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("ph_theme") as "dark" | "light" | null;
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const t = saved ?? system;
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);

    const savedSidebar = localStorage.getItem("ph_sidebar");
    if (savedSidebar !== null) setExpanded(savedSidebar === "1");
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCustoms(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (addOpen) setTimeout(() => urlRef.current?.focus(), 50);
  }, [addOpen]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function toggleSidebar() {
    setExpanded(v => {
      const next = !v;
      localStorage.setItem("ph_sidebar", next ? "1" : "0");
      if (!next) setAddOpen(false);
      return next;
    });
  }

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

  function handleAddSave() {
    const url = newUrl.trim();
    const label = newLabel.trim();
    if (!url) return;
    const full = url.startsWith("http") ? url : `https://${url}`;
    const item: ExternalItem = {
      href: full,
      label: label || new URL(full).hostname.replace("www.", ""),
      color: "hsl(217,91%,60%)",
    };
    const next = [...customs, item];
    setCustoms(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setNewUrl("");
    setNewLabel("");
    setAddOpen(false);
  }

  function handleRemove(href: string) {
    const next = customs.filter(c => c.href !== href);
    setCustoms(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  const allExternal = [...DEFAULT_EXTERNAL, ...customs];

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 flex items-center px-4 bg-white dark:bg-[#111] shrink-0"
        style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
        <button onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#666] dark:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer">
          <Menu className="w-5 h-5" />
        </button>
        <span className="ml-2.5 text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Private Hub</span>
      </div>

      {/* ── Mobile backdrop ────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────── */}
      <aside
        className={cn(
          "flex flex-col shrink-0 h-screen bg-white dark:bg-[#111] overflow-hidden z-50",
          // Mobile: fixed drawer, slides in/out
          "fixed inset-y-0 left-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: sticky, always visible, no translate
          "md:sticky md:top-0 md:translate-x-0",
          // Transitions: transform on mobile, width on desktop
          "[transition:transform_200ms_ease] md:[transition:width_200ms_ease]",
        )}
        style={{ width: expanded ? 224 : 52, boxShadow: "rgba(0,0,0,0.06) 1px 0 0 0" }}
      >
        <div className="px-[13px] py-4 shrink-0" style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0" style={{ background: "hsl(25,95%,53%)" }}>
              <span className="text-white text-[12px] font-bold">T</span>
            </div>
            <span className="flex-1 text-[14px] font-semibold tracking-tight text-[#171717] dark:text-[#f5f5f5] whitespace-nowrap"
              style={{ opacity: expanded ? 1 : 0, transition: "opacity 150ms ease" }}>
              Private Hub
            </span>
            <button onClick={() => { toggleSidebar(); }}
              className="flex h-6 w-6 items-center justify-center rounded-[5px] text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer shrink-0"
              style={{ opacity: expanded ? 1 : 0, transition: "opacity 150ms ease" }}>
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setMobileOpen(false)}
              className="md:hidden flex h-6 w-6 items-center justify-center rounded-[5px] text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 px-[10px] py-3 space-y-0.5 overflow-hidden">
          {!expanded && (
            <button onClick={toggleSidebar}
              className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#999] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#666] dark:hover:text-[#bbb] transition-colors cursor-pointer mb-1">
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
          {NAV_ITEMS.map(item => {
            const Icon     = item.icon;
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-[10px] py-2 rounded-[6px]",
                  "text-[13px] font-medium leading-[1.43] whitespace-nowrap",
                  "transition-colors duration-150 cursor-pointer",
                  isActive
                    ? "bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
                    : "text-[#999] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#666] dark:hover:text-[#bbb]"
                )}>
                <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? item.color : undefined }} />
                <span style={{ opacity: expanded ? 1 : 0, transition: "opacity 150ms ease" }}>{item.label}</span>
                {isActive && expanded && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
                )}
              </Link>
            );
          })}

          <div className="pt-2 mt-2" style={{ boxShadow: "rgba(0,0,0,0.06) 0px -1px 0px 0px inset" }}>
            {allExternal.map(item => {
              const favicon = getFavicon(item.href);
              return (
                <div key={item.href} className="group/ext flex items-center">
                  <a href={item.href} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center gap-2.5 px-[10px] py-2 rounded-[6px] text-[13px] font-medium text-[#999] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#666] dark:hover:text-[#bbb] transition-colors duration-150 cursor-pointer whitespace-nowrap">
                    {favicon
                      ? <img src={favicon} alt="" className="w-4 h-4 shrink-0 rounded-sm" />
                      : <Globe className="w-4 h-4 shrink-0" style={{ color: item.color }} />}
                    <span style={{ opacity: expanded ? 1 : 0, transition: "opacity 150ms ease" }}>{item.label}</span>
                  </a>
                  {expanded && customs.some(c => c.href === item.href) && (
                    <button onClick={() => handleRemove(item.href)}
                      className="opacity-0 group-hover/ext:opacity-100 flex h-5 w-5 items-center justify-center rounded text-[#bbb] hover:text-red-400 transition-all mr-1 cursor-pointer shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {!addOpen ? (
              <button onClick={() => setAddOpen(true)}
                className="flex items-center gap-2.5 px-[10px] py-2 rounded-[6px] text-[13px] font-medium text-[#bbb] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#999] transition-colors cursor-pointer whitespace-nowrap w-full">
                <Plus className="w-4 h-4 shrink-0" />
                <span style={{ opacity: expanded ? 1 : 0, transition: "opacity 150ms ease" }}>Thêm trang</span>
              </button>
            ) : (
              <div className="px-[10px] py-2 space-y-1.5" style={{ opacity: expanded ? 1 : 0 }}>
                <input ref={urlRef} type="text" placeholder="https://..." value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddSave()}
                  className="w-full h-7 px-2 text-[12px] rounded-[5px] bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none"
                  style={{ boxShadow: "var(--shadow-border)" }} />
                <input type="text" placeholder="Tên hiển thị" value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddSave()}
                  className="w-full h-7 px-2 text-[12px] rounded-[5px] bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] outline-none"
                  style={{ boxShadow: "var(--shadow-border)" }} />
                <div className="flex gap-1">
                  <button onClick={() => { setAddOpen(false); setNewUrl(""); setNewLabel(""); }}
                    className="flex-1 h-6 rounded-[4px] text-[11px] text-[#999] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer">
                    Hủy
                  </button>
                  <button onClick={handleAddSave}
                    className="flex-1 h-6 rounded-[4px] text-[11px] font-medium bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-1">
                    <Check className="w-3 h-3" />Lưu
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="px-[10px] py-3 space-y-0.5 shrink-0" style={{ boxShadow: "rgba(0,0,0,0.06) 0px -1px 0px 0px" }}>
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-[10px] py-2 rounded-[6px] text-[13px] font-medium text-[#999] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#666] dark:hover:text-[#bbb] transition-colors duration-150 cursor-pointer whitespace-nowrap">
            {theme === "dark" ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
            <span style={{ opacity: expanded ? 1 : 0, transition: "opacity 150ms ease" }}>
              {theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
            </span>
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-[10px] py-2 rounded-[6px] text-[13px] font-medium text-[#999] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-red-500 transition-colors duration-150 cursor-pointer whitespace-nowrap">
            <LogOut className="w-4 h-4 shrink-0" />
            <span style={{ opacity: expanded ? 1 : 0, transition: "opacity 150ms ease" }}>Đăng xuất</span>
          </button>
          {expanded && <p className="text-[10px] text-[#bbb] px-[10px] pt-1 whitespace-nowrap">Private Hub v1.0</p>}
        </div>
      </aside>
    </>
  );
}
