// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "sonner";
import "./globals.css";

// Vercel KI: Mona Sans loaded via @font-face in globals.css
// Geist Mono still needed for code blocks
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Private Hub",
    template: "%s | Private Hub",
  },
  description: "Không gian cá nhân: tổng hợp công nghệ, luyện giao tiếp, quản lý tài chính.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={geistMono.variable} suppressHydrationWarning>
      {/* Vercel KI: font-sans antialiased */}
      <body className="font-sans antialiased min-h-screen flex bg-[var(--bg-base)]">
        <Sidebar />
        {/* Main content area - padded from sticky sidebar */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
        {/* Vercel KI: z-toast = 300 */}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--bg-elevated)",
              border: "none",
              boxShadow: "var(--shadow-card)",
              color: "var(--fg-primary)",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
