"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { FloatingMenu } from "@/components/layout/FloatingMenu";

// Routes that render without the app shell (sidebar, header, floating menu)
const BARE_ROUTES = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBare = BARE_ROUTES.some((r) => pathname.startsWith(r));

  if (isBare) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
        <MobileHeader />
        {children}
      </main>
      <FloatingMenu />
    </>
  );
}
