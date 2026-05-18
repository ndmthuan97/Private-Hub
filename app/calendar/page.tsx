"use client";
import { ExternalLink } from "lucide-react";

const EMBED_URL = "https://calendar.google.com/calendar/embed?src=ndmthuan.97%40gmail.com&ctz=Asia%2FHo_Chi_Minh";
const OPEN_URL  = "https://calendar.google.com/calendar/u/0/r";

export default function CalendarPage() {
  return (
    <div className="flex flex-col" style={{ height: "100vh" }}>
      <div className="flex items-center justify-between px-5 py-2.5 bg-white dark:bg-[#111] shrink-0"
        style={{ boxShadow: "rgba(0,0,0,0.06) 0px 1px 0px 0px" }}>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-[#999]">Google</p>
          <p className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5] mt-0.5">Calendar</p>
        </div>
        <a href={OPEN_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[12px] font-medium text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors"
          style={{ boxShadow: "var(--shadow-border)" }}>
          <ExternalLink className="w-3.5 h-3.5" />
          Mở để thêm sự kiện
        </a>
      </div>
      <iframe src={EMBED_URL} className="flex-1 w-full border-0" title="Google Calendar" />
    </div>
  );
}
