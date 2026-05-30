"use client";
import { ExternalLink } from "lucide-react";
import { Tip } from "@/components/ui/tip";

const EMBED_URL = "https://calendar.google.com/calendar/embed?src=ndmthuan.97%40gmail.com&ctz=Asia%2FHo_Chi_Minh";
const OPEN_URL  = "https://calendar.google.com/calendar/u/0/r";

export default function CalendarPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="hidden md:flex items-center justify-end px-5 py-2 bg-white dark:bg-[#111] shrink-0"
        style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
        <Tip label="Mở Google Calendar">
          <a href={OPEN_URL} target="_blank" rel="noopener noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-[6px] text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors"
            style={{ boxShadow: "var(--shadow-border)" }}>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Tip>
      </div>
      {/* flex-col + pb-20 ensures iframe stops above floating menu on mobile */}
      <div className="flex-1 flex flex-col">
        <iframe src={EMBED_URL} className="flex-1 w-full border-0 min-h-0" title="Google Calendar" />
      </div>
    </div>
  );
}
