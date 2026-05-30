"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ALL_MENU_ITEMS } from "@/lib/nav-items";

type GridSize = 3 | 4 | 5;
const CELL_SIZE = 68;

/* ─── Component ──────────────────────────────────────────────── */
export function FloatingMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [cols, setCols] = useState<GridSize>(4);

  // Fetch grid size from API + listen for changes from Settings
  const loadSize = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/menu");
      const json = await res.json();
      if (json.data?.gridSize) setCols(json.data.gridSize as GridSize);
    } catch { /* use default */ }
  }, []);

  useEffect(() => {
    loadSize();
    window.addEventListener("ph_menu_grid_change", loadSize);
    return () => window.removeEventListener("ph_menu_grid_change", loadSize);
  }, [loadSize]);

  // Listen for toggle event from MobileHeader
  useEffect(() => {
    function handleToggle() { setOpen(v => !v); }
    window.addEventListener("ph_menu_toggle", handleToggle);
    return () => window.removeEventListener("ph_menu_toggle", handleToggle);
  }, []);

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  // Prevent body scroll
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const navigate = useCallback((href: string) => {
    router.push(href);
    setOpen(false);
  }, [router]);

  const close = useCallback(() => setOpen(false), []);

  const popupWidth = cols * CELL_SIZE + 24;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center md:hidden" onClick={close}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 rounded-[22px] overflow-hidden animate-in fade-in zoom-in-90 duration-200"
        style={{
          background: "rgba(36,36,36,0.95)",
          backdropFilter: "blur(40px) saturate(1.8)",
          WebkitBackdropFilter: "blur(40px) saturate(1.8)",
          boxShadow: "0 16px 64px rgba(0,0,0,0.5), inset 0 0 0 0.5px rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="grid gap-1 p-3"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${CELL_SIZE}px)`,
            width: popupWidth,
          }}
        >
          {ALL_MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === pathname;
            return (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-[14px] transition-all duration-150 cursor-pointer aspect-square",
                  isActive ? "bg-white/[0.12]" : "hover:bg-white/[0.08]"
                )}
              >
                <Icon
                  className={cn(
                    "w-[22px] h-[22px]",
                    isActive ? "text-white" : "text-white/60"
                  )}
                  strokeWidth={1.5}
                />
                <span className={cn(
                  "text-[9px] font-medium leading-tight text-center px-0.5",
                  isActive ? "text-white/90" : "text-white/40"
                )}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
