import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "sonner";
import "./globals.css";

const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Private Hub", template: "%s | Private Hub" },
  description: "Không gian cá nhân: tổng hợp công nghệ, luyện giao tiếp, quản lý tài chính.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={geistMono.variable} suppressHydrationWarning>
      <head>
        {/* Anti-flash: raw blocking script — runs before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('ph_theme');if(!t)t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased min-h-screen flex bg-[var(--bg-base)]" suppressHydrationWarning>
        <AppShell>{children}</AppShell>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          toastOptions={{
            style: {
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}

