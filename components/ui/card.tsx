// components/ui/card.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Vercel KI:
 * - NO CSS border. Use shadow-as-border only.
 * - radius: 8px (card), 12px (card-lg/featured)
 * - forced-colors fallback via data-card attribute
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { featured?: boolean }
>(({ className, featured, ...props }, ref) => (
  <div
    ref={ref}
    data-card
    className={cn(
      "bg-[var(--bg-surface)] text-[var(--fg-primary)]",
      "[box-shadow:var(--shadow-card)]",
      featured ? "rounded-[12px]" : "rounded-[8px]",
      // forced-colors fallback (Vercel KI RISK-2)
      "forced-colors:border forced-colors:border-[ButtonBorder] forced-colors:shadow-none",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      // Vercel KI: Card Title = 24px, weight 600, letter-spacing -0.04em
      "text-[24px] font-[600] leading-[1.33] tracking-[-0.04em] text-[var(--fg-primary)]",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-[14px] text-[var(--fg-secondary)] leading-[1.5]", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
));
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
