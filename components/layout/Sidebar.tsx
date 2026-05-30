"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut, Globe, ChevronLeft, ChevronRight,
  Code, Music, Video, Image, FileText, Database, Cloud, ShoppingBag, Gamepad2,
  GraduationCap, Heart, Star, Rocket, Zap, Coffee, Briefcase, Palette, Newspaper,
  Link as LinkIcon, BookOpen, Camera, MessageCircle, Mail, Map, Calculator, Headphones,
  Shield, Terminal, Search, Home, Settings, Users, TrendingUp, BarChart3, Wrench, Cpu,
  Smartphone, Monitor, Wifi, Lock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_GROUPS } from "@/lib/nav-items";
import { useState, useEffect, useCallback } from "react";

/* ─── Icon map ──────────────────────────────────────────────────── */
const ICON_MAP: Record<string, LucideIcon> = {
  Globe, Code, Music, Video, Image, FileText, Database, Cloud, ShoppingBag, Gamepad2,
  GraduationCap, Heart, Star, Rocket, Zap, Coffee, Briefcase, Palette, Newspaper,
  Link: LinkIcon, BookOpen, Camera, MessageCircle, Mail, Map, Calculator, Headphones,
  Shield, Terminal, Search, Home, Settings, Users, TrendingUp, BarChart3, Wrench, Cpu,
  Smartphone, Monitor, Wifi, Lock,
};

type ExternalItem = { href: string; label: string; color: string; icon: string; groupId?: string };
type CustomGroup = { id: string; label: string };
type GroupOverride = { customLabel?: string; hidden?: boolean };
type GroupOverrides = Record<string, GroupOverride>;

const BUILTIN_PREFIX = "__builtin:";

function resolveIcon(iconName?: string): LucideIcon {
  return (iconName && ICON_MAP[iconName]) || Globe;
}

/* ─── Sidebar Component ─────────────────────────────────────────── */
export function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [expanded, setExpanded] = useState(true);
  const [customs, setCustoms]   = useState<ExternalItem[]>([]);
  const [groups, setGroups]     = useState<CustomGroup[]>([]);
  const [hiddenItems, setHiddenItems] = useState<string[]>([]);
  const [groupOverrides, setGroupOverrides] = useState<GroupOverrides>({});

  // Fetch sidebar config from API
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/sidebar");
      const json = await res.json();
      if (json.data) {
        setCustoms((json.data.links as ExternalItem[])?.map(i => ({ ...i, icon: i.icon || "Globe" })) ?? []);
        setGroups((json.data.groups as CustomGroup[]) ?? []);
        setHiddenItems((json.data.hidden as string[]) ?? []);
        setGroupOverrides((json.data.overrides as GroupOverrides) ?? {});
      }
    } catch { /* silent fail on fetch error */ }
  }, []);

  /* ── Init ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const savedSidebar = localStorage.getItem("ph_sidebar");
    if (savedSidebar !== null) setExpanded(savedSidebar === "1");
    fetchConfig();
  }, [fetchConfig]);

  // Re-fetch when settings page updates DB (same-tab event)
  useEffect(() => {
    function onSync() { fetchConfig(); }
    window.addEventListener("ph_sidebar_sync", onSync);
    return () => window.removeEventListener("ph_sidebar_sync", onSync);
  }, [fetchConfig]);


  /* ── Actions ───────────────────────────────────────────────────── */
  function toggleSidebar() {
    setExpanded(v => { const next = !v; localStorage.setItem("ph_sidebar", next ? "1" : "0"); return next; });
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  /* ── Computed ──────────────────────────────────────────────────── */
  // Custom links assigned to a built-in group (not hidden)
  const builtinGroupLinks = (groupLabel: string) =>
    customs.filter(c => c.groupId === BUILTIN_PREFIX + groupLabel && !hiddenItems.includes(c.href));
  // Custom links in a user-created group (not hidden)
  const customGroupLinks = (gid: string) =>
    customs.filter(c => c.groupId === gid && !hiddenItems.includes(c.href));
  // Custom links with no group (not hidden)
  const ungroupedItems = customs.filter(c =>
    !c.groupId && !hiddenItems.includes(c.href)
  );

  function renderExternalItem(item: ExternalItem) {
    const Icon = resolveIcon(item.icon);
    const embedHref = `/embed?url=${encodeURIComponent(item.href)}&label=${encodeURIComponent(item.label)}`;
    const isActive = pathname.startsWith('/embed') && typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('url') === item.href;
    return (
      <Link key={item.href} href={embedHref}
        className={cn(
          'flex items-center gap-2.5 px-[10px] py-2 rounded-[6px] text-[13px] font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap',
          isActive
            ? 'bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]'
            : 'text-[#999] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#666] dark:hover:text-[#bbb]'
        )}>
        <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? item.color : undefined }} />
        <span style={{ opacity: expanded ? 1 : 0, transition: "opacity 150ms ease" }}>{item.label}</span>
        {isActive && expanded && (
          <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
        )}
      </Link>
    );
  }

  return (
    <>
      {/* ── Sidebar (desktop only) ── */}
      <aside
        className={cn(
          "hidden md:flex relative flex-col shrink-0 h-screen bg-white dark:bg-[#111] overflow-visible z-50",
          "sticky top-0",
          "[transition:width_200ms_ease]",
        )}
        style={{ width: expanded ? 224 : 52, boxShadow: "rgba(0,0,0,0.06) 1px 0 0 0" }}
      >
        <button onClick={toggleSidebar}
          className="hidden md:flex absolute top-1/2 -translate-y-1/2 -right-3.5 z-10 h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-[#111] text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
          style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.10)' }}
          title={expanded ? 'Thu gọn sidebar' : 'Mở rộng sidebar'}>
          {expanded ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Logo header */}
          <div className="px-[13px] py-4 shrink-0" style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0" style={{ background: "hsl(25,95%,53%)" }}>
                <span className="text-white text-[12px] font-bold">T</span>
              </div>
              <span className="flex-1 text-[14px] font-semibold tracking-tight text-[#171717] dark:text-[#f5f5f5] whitespace-nowrap"
                style={{ opacity: expanded ? 1 : 0, transition: "opacity 150ms ease" }}>
                Private Hub
              </span>
            </div>
          </div>

          <nav className="flex-1 px-[10px] py-3 space-y-3 overflow-y-auto overflow-x-hidden">
            {/* ── Built-in nav groups ── */}
            {NAV_GROUPS.map((group, gi) => {
              const override = group.label ? groupOverrides[group.label] : undefined;
              if (override?.hidden) return null;
              const visibleBuiltIn = group.items.filter(item => !hiddenItems.includes(item.href));
              const visibleCustom = group.label ? builtinGroupLinks(group.label) : [];
              if (visibleBuiltIn.length === 0 && visibleCustom.length === 0) return null;
              const displayLabel = override?.customLabel || group.label;
              return (
                <div key={gi} className={cn(gi > 0 && 'pt-2')}>
                  {displayLabel && expanded && (
                    <p className="px-[10px] pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#bbb] dark:text-[#555] whitespace-nowrap">{displayLabel}</p>
                  )}
                  <div className="space-y-0.5">
                    {visibleBuiltIn.map(item => {
                      const Icon = item.icon;
                      const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                      return (
                        <Link key={item.href} href={item.href}
                          className={cn(
                            'flex items-center gap-2.5 px-[10px] py-2 rounded-[6px]',
                            'text-[13px] font-medium leading-[1.43] whitespace-nowrap',
                            'transition-colors duration-150 cursor-pointer',
                            isActive
                              ? 'bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]'
                              : 'text-[#999] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#666] dark:hover:text-[#bbb]'
                          )}>
                          <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? item.color : undefined }} />
                          <span style={{ opacity: expanded ? 1 : 0, transition: 'opacity 150ms ease' }}>{item.label}</span>
                          {isActive && expanded && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
                          )}
                        </Link>
                      );
                    })}
                    {/* Custom links assigned to this built-in group */}
                    {visibleCustom.map(item => renderExternalItem(item))}
                  </div>
                </div>
              );
            })}

            {/* ── Custom groups ── */}
            {groups.map(group => {
              const items = customGroupLinks(group.id);
              if (items.length === 0 && !expanded) return null;
              return (
                <div key={group.id} className="pt-2">
                  {expanded && (
                    <p className="px-[10px] pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#bbb] dark:text-[#555] whitespace-nowrap">{group.label}</p>
                  )}
                  <div className="space-y-0.5">
                    {items.map(item => renderExternalItem(item))}
                  </div>
                </div>
              );
            })}

            {/* ── Ungrouped custom links ── */}
            {ungroupedItems.length > 0 && (
              <div className="pt-2">
                {groups.length > 0 && expanded && (
                  <p className="px-[10px] pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#bbb] dark:text-[#555] whitespace-nowrap">Khác</p>
                )}
                <div className="space-y-0.5">
                  {ungroupedItems.map(item => renderExternalItem(item))}
                </div>
              </div>
            )}
          </nav>

          {/* ── Footer ── */}
          <div className="px-[10px] py-3 space-y-0.5 shrink-0" style={{ boxShadow: "rgba(0,0,0,0.06) 0px -1px 0px 0px" }}>
            <Link href="/settings"
              className={cn(
                "w-full flex items-center gap-2.5 px-[10px] py-2 rounded-[6px] text-[13px] font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap",
                pathname === "/settings"
                  ? "bg-[#f5f5f5] dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5]"
                  : "text-[#999] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-[#666] dark:hover:text-[#bbb]"
              )}>
              <Settings className="w-4 h-4 shrink-0" />
              <span style={{ opacity: expanded ? 1 : 0, transition: "opacity 150ms ease" }}>Cài đặt</span>
            </Link>
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-[10px] py-2 rounded-[6px] text-[13px] font-medium text-[#999] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] hover:text-red-500 transition-colors duration-150 cursor-pointer whitespace-nowrap">
              <LogOut className="w-4 h-4 shrink-0" />
              <span style={{ opacity: expanded ? 1 : 0, transition: "opacity 150ms ease" }}>Đăng xuất</span>
            </button>
            {expanded && <p className="text-[10px] text-[#bbb] px-[10px] pt-1 whitespace-nowrap">Private Hub v1.1</p>}
          </div>
        </div>
      </aside>
    </>
  );
}
