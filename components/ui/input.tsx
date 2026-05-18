// components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/** Vercel KI: shadow-as-border, radius 6px (btn scale), focus ring blue */
const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-9 w-full px-3 py-1",
        "bg-[var(--bg-elevated)] text-[var(--fg-primary)]",
        "text-[14px] font-[400] leading-[1.43]",
        "rounded-[6px]",                            // btn radius scale
        "[box-shadow:var(--shadow-border)]",         // shadow-as-border
        "placeholder:text-[var(--fg-muted)]",
        "focus-visible:outline-none focus-visible:[box-shadow:0_0_0_2px_hsla(212,100%,48%,1)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-[box-shadow] duration-[150ms] ease",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
