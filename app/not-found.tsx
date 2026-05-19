import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-6">
      <p className="text-[72px] font-[600] leading-none tracking-[-0.05em] text-[var(--fg-primary)]">
        404
      </p>
      <p className="text-[18px] text-[var(--fg-secondary)]">
        Trang bạn tìm không tồn tại.
      </p>
      <Button asChild variant="secondary" id="btn-go-home">
        <Link href="/">
          <Home className="w-4 h-4" aria-hidden="true" />
          Về trang chủ
        </Link>
      </Button>
    </div>
  );
}
