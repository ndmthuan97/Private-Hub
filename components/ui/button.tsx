import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Shadow-as-border only — no CSS border. Badge pill radius (9999px) is for Badge, not buttons.
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "text-[14px] font-[500] leading-[1.43]",  // Vercel KI: UI size
    "rounded-[6px]",                            // Vercel KI: btn radius
    "transition-all duration-[150ms] ease",     // Vercel KI: 150ms micro
    "focus-visible:outline-none focus-visible-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "cursor-pointer select-none",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-[#6366f1] text-white hover:bg-[#5558e8] active:scale-[0.98]",
        dark:
          "bg-[var(--fg-primary)] text-[var(--bg-base)] hover:opacity-90 active:scale-[0.98]",
        secondary:
          "bg-[var(--bg-elevated)] text-[var(--fg-primary)] [box-shadow:var(--shadow-border)] hover:bg-[var(--bg-hover)]",
        ghost:
          "bg-transparent text-[var(--fg-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--fg-primary)]",
        destructive:
          "bg-[hsl(0,84%,60%)] text-white hover:bg-[hsl(0,84%,55%)]",
        gradient:
          "gradient-brand text-white hover:opacity-90 active:scale-[0.98]",
      },
      size: {
        sm:      "h-8 px-3 text-[12px]",
        default: "h-9 px-4",
        lg:      "h-10 px-6 text-[15px]",
        icon:    "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
