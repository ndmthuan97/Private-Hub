import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Pill shape only (9999px). No CSS border — shadow-as-border pattern.
const badgeVariants = cva(
  "inline-flex items-center rounded-[9999px] px-2.5 py-0.5 text-[12px] font-[500] leading-[1.33] transition-colors duration-[150ms]",
  {
    variants: {
      variant: {
        default:      "bg-[var(--brand-bg)] text-[var(--brand)] [box-shadow:inset_0_0_0_1px_rgba(99,102,241,0.25)]",
        secondary:    "bg-[var(--bg-elevated)] text-[var(--fg-secondary)]",
        destructive:  "bg-[hsl(0,84%,60%,0.12)] text-[hsl(0,84%,70%)] [box-shadow:inset_0_0_0_1px_hsl(0,84%,60%,0.25)]",
        outline:      "[box-shadow:var(--shadow-border)] text-[var(--fg-secondary)]",
        digest:       "bg-[hsl(271,91%,65%,0.12)] text-[hsl(271,91%,72%)] [box-shadow:inset_0_0_0_1px_hsl(271,91%,65%,0.25)]",
        conversation: "bg-[hsl(160,84%,42%,0.12)] text-[hsl(160,84%,55%)] [box-shadow:inset_0_0_0_1px_hsl(160,84%,42%,0.25)]",
        budget:       "bg-[hsl(38,92%,52%,0.12)] text-[hsl(38,92%,65%)] [box-shadow:inset_0_0_0_1px_hsl(38,92%,52%,0.25)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
