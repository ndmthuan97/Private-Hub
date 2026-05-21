"use client";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

/**
 * Tip — lightweight tooltip wrapper using Radix UI.
 * Usage: <Tip label="Xóa"><button>...</button></Tip>
 */
export function Tip({ label, children, side = "top" }: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className="z-[999] px-2 py-1 rounded-[5px] text-[11px] font-medium text-white bg-[#171717] dark:bg-[#f5f5f5] dark:text-[#171717] select-none pointer-events-none"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.18)" }}
          >
            {label}
            <TooltipPrimitive.Arrow className="fill-[#171717] dark:fill-[#f5f5f5]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
