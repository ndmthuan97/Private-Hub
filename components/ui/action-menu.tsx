"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/**
 * Mobile: renders a ⋯ button that opens a dropdown menu via portal.
 * Desktop: hidden (parent uses inline hover buttons).
 */
export function ActionMenu({ items }: { items: ActionItem[] }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Calculate dropdown position from button rect
  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({
      top: r.bottom + 4,
      left: r.right,
    });
  }, []);

  // Open handler
  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open) updatePos();
    setOpen(o => !o);
  }

  // Close on outside click/touch
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent | TouchEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [open]);

  return (
    <>
      {/* Mobile: ⋯ toggle */}
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="flex md:hidden h-7 w-7 items-center justify-center rounded-[5px] bg-[#f0f0f0] dark:bg-[#252525] text-[#888] dark:text-[#999] active:bg-[#e0e0e0] dark:active:bg-[#333] transition-colors cursor-pointer shrink-0"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {/* Dropdown via portal — escapes overflow:hidden */}
      {open && pos && typeof window !== "undefined" && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[200] min-w-[150px] rounded-[8px] bg-white dark:bg-[#1a1a1a] py-1 md:hidden animate-in fade-in-0 zoom-in-95 duration-100"
          style={{
            top: pos.top,
            left: pos.left,
            transform: "translateX(-100%)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
          }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setOpen(false); item.onClick(); }}
              disabled={item.disabled}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2 text-[13px] font-medium transition-colors cursor-pointer disabled:opacity-40",
                item.danger
                  ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                  : "text-[#444] dark:text-[#ccc] hover:bg-[#f5f5f5] dark:hover:bg-[#252525]"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
