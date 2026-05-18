// app/page.tsx — Dashboard Homepage
import { Newspaper, MessageCircle, Wallet, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MODULES = [
  {
    href: "/tech-digest",
    icon: Newspaper,
    title: "Tech Digest",
    description: "Tổng hợp công nghệ nổi bật 2 lần/tuần do AI tự phân tích và viết.",
    badge: "AI · 2x/tuần",
    badgeVariant: "digest" as const,
    accent: "var(--digest-color)",
    gradientClass: "gradient-digest",
    id: "module-tech-digest",
  },
  {
    href: "/conversation",
    icon: MessageCircle,
    title: "Luyện Giao Tiếp",
    description: "Chat với AI để luyện tiếng Anh và tiếng Nhật theo tình huống thực tế.",
    badge: "EN · JP",
    badgeVariant: "conversation" as const,
    accent: "var(--convo-color)",
    gradientClass: "gradient-convo",
    id: "module-conversation",
  },
  {
    href: "/budget",
    icon: Wallet,
    title: "Phân Bổ Ngân Sách",
    description: "Tính toán và phân bổ thu nhập theo 6 hạng mục theo tỷ lệ cố định.",
    badge: "6 hạng mục",
    badgeVariant: "budget" as const,
    accent: "var(--budget-color)",
    gradientClass: "gradient-budget",
    id: "module-budget",
  },
];

export default function DashboardPage() {
  const now = new Date();
  const dateStr = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <div className="px-8 py-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-10 animate-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-[var(--brand)]" aria-hidden="true" />
          <span className="text-[12px] font-[500] text-[var(--fg-muted)] uppercase tracking-[0.08em]">
            {dateStr}
          </span>
        </div>
        <h1
          className="text-[40px] font-[600] leading-[1.20] tracking-[-0.05em] text-[var(--fg-primary)] mb-3"
        >
          Xin chào 👋
        </h1>
        <p className="text-[18px] font-[400] leading-[1.56] text-[var(--fg-secondary)] max-w-xl">
          Không gian cá nhân để học, phát triển và quản lý cuộc sống hiệu quả hơn.
        </p>
      </div>

      {/* Module cards */}
      <div className="space-y-4">
        {MODULES.map((mod, i) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href} id={mod.id} className="block group">
              <Card
                featured
                className={`
                  p-0 overflow-hidden
                  transition-[box-shadow,transform] duration-[150ms] ease
                  hover:translate-y-[-1px]
                  animate-fade-up
                `}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <CardContent className="p-6 flex items-center gap-5">
                  {/* Icon accent box */}
                  <div
                    className={`
                      w-12 h-12 rounded-[8px] flex items-center justify-center shrink-0
                      ${mod.gradientClass}
                    `}
                  >
                    <Icon className="w-6 h-6 text-white" aria-hidden="true" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-[18px] font-[600] leading-[1.33] tracking-[-0.02em] text-[var(--fg-primary)]">
                        {mod.title}
                      </h2>
                      <Badge variant={mod.badgeVariant}>{mod.badge}</Badge>
                    </div>
                    <p className="text-[14px] font-[400] leading-[1.5] text-[var(--fg-secondary)]">
                      {mod.description}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight
                    className="w-5 h-5 text-[var(--fg-muted)] shrink-0 transition-transform duration-[150ms] group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
