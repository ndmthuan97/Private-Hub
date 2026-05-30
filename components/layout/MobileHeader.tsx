"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Menu } from "lucide-react";

/* Route → title mapping for mobile header */
const TITLE_MAP: Record<string, string> = {
  "/":             "Dashboard",
  "/conversation": "Luyện Giao Tiếp",
  "/vocab":        "Từ Vựng",
  "/dictation":    "Daily Dictation",
  "/writing":      "Luyện Viết",
  "/translation":  "Luyện Dịch",
  "/budget":       "Ngân Sách",
  "/strategy":     "Strategy",
  "/calendar":     "Calendar",
  "/notebooklm":   "NotebookLM",
  "/settings":     "Cài đặt",
  "/embed":        "Xem trang",
};

/* Routes where child pages should show a back button */
const PARENT_MAP: Record<string, string> = {
  "/vocab": "/vocab",
  "/strategy": "/strategy",
};

/**
 * Mobile-only sticky header — shows page title + menu trigger.
 * Menu trigger dispatches a custom event that FloatingMenu listens to.
 */
export function MobileHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const firstSegment = `/${pathname.split("/")[1]}`;
  const isChildPage = pathname !== firstSegment && pathname.split("/").filter(Boolean).length > 1;

  const title =
    TITLE_MAP[pathname] ??
    TITLE_MAP[firstSegment];

  if (!title) return null;

  const parentRoute = PARENT_MAP[firstSegment];
  const showBack = isChildPage && parentRoute;

  function openMenu() {
    window.dispatchEvent(new CustomEvent("ph_menu_toggle"));
  }

  return (
    <div
      className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white dark:bg-[#111] sticky top-0 z-[20] shrink-0"
      style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {showBack && (
          <button
            onClick={() => router.push(parentRoute)}
            className="flex items-center justify-center shrink-0 text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <p className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5] truncate">
          {title}
        </p>
      </div>
      <button
        onClick={openMenu}
        className="flex items-center justify-center h-8 w-8 rounded-[6px] text-[#666] dark:text-[#888] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer shrink-0"
        aria-label="Quick menu"
      >
        <Menu className="h-4 w-4" />
      </button>
    </div>
  );
}
