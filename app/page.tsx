import { MessageCircle, Wallet, ArrowRight } from "lucide-react";
import Link from "next/link";

const MODULES = [
  {
    href: "/conversation",
    icon: MessageCircle,
    emoji: "💬",
    title: "Luyện Giao Tiếp",
    description: "Chat với AI để luyện tiếng Anh và tiếng Nhật theo tình huống thực tế.",
    badge: "EN · JP",
    color: "hsl(160,84%,42%)",
    id: "module-conversation",
  },
  {
    href: "/budget",
    icon: Wallet,
    emoji: "💰",
    title: "Phân Bổ Ngân Sách",
    description: "Tính toán và phân bổ thu nhập theo các hạng mục tùy chỉnh.",
    badge: "CRUD",
    color: "hsl(38,92%,52%)",
    id: "module-budget",
  },
];

export default function DashboardPage() {
  return (
    <div className="px-6 py-8 space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888] mb-1">
          Private Hub
        </p>
        <h1 className="text-[20px] font-semibold tracking-tight text-[#171717] dark:text-[#f5f5f5]">
          Xin chào 👋
        </h1>
        <p className="text-[13px] text-[#999] mt-0.5">
          Không gian cá nhân để học, phát triển và quản lý cuộc sống hiệu quả hơn.
        </p>
      </div>

      <div className="space-y-3">
        {MODULES.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href} id={mod.id} className="block group">
              <div
                className="rounded-[8px] bg-white dark:bg-[#111] px-5 py-4 flex items-center gap-4 transition-all duration-150 hover:translate-y-[-1px]"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div
                  className="w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0 text-white"
                  style={{ background: mod.color }}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] tracking-tight">
                      {mod.title}
                    </span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        background: `${mod.color}1a`,
                        color: mod.color,
                      }}
                    >
                      {mod.badge}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#999] leading-[1.5]">{mod.description}</p>
                </div>

                <ArrowRight
                  className="w-4 h-4 text-[#ccc] shrink-0 transition-transform duration-150 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
