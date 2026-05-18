// app/tech-digest/error.tsx
// Next.js skill: Use error.tsx as error boundary for routes
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function TechDigestError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error without exposing stack trace to UI
    console.error("[tech-digest] page error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="px-8 py-20 max-w-4xl mx-auto flex flex-col items-center gap-4 text-center">
      <div className="w-12 h-12 rounded-[8px] bg-[hsl(0,84%,60%,0.10)] flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-[hsl(0,84%,65%)]" aria-hidden="true" />
      </div>
      <div>
        <p className="text-[18px] font-[600] tracking-[-0.02em] text-[var(--fg-primary)] mb-1">
          Đã xảy ra lỗi
        </p>
        <p className="text-[14px] text-[var(--fg-secondary)]">
          Không thể tải trang Tech Digest. Vui lòng thử lại.
        </p>
      </div>
      <Button id="btn-retry-digest" variant="secondary" onClick={reset}>
        Thử lại
      </Button>
    </div>
  );
}
