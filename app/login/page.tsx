"use client";
// app/login/page.tsx — Passkey gate (light / dark)

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Sun, Moon, Lock } from "lucide-react";
import { Suspense } from "react";

// ─── Theme toggle (persisted in localStorage) ─────────────────
function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("ph_theme") as "dark" | "light" | null;
    const system = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    const initial = saved ?? system;
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggle() {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("ph_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }

  return { theme, toggle };
}

// ─── Animated background dots ─────────────────────────────────
function GridBackground() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, var(--fg-muted) 1px, transparent 0)",
        backgroundSize: "32px 32px",
        opacity: 0.15,
      }}
    />
  );
}

// ─── Inner form (needs useSearchParams) ───────────────────────
function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const from         = searchParams.get("from") ?? "/";
  const { theme, toggle } = useTheme();

  const [passkey, setPasskey]   = useState("");
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [shake, setShake]       = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passkey }),
      });
      const json = await res.json();
      if (json.statusCode === 200) {
        router.replace(from);
        router.refresh();
      } else {
        setError("Passkey không đúng. Thử lại.");
        setPasskey("");
        setShake(true);
        setTimeout(() => setShake(false), 600);
        inputRef.current?.focus();
      }
    } catch {
      setError("Lỗi kết nối. Thử lại.");
    } finally {
      setLoading(false);
    }
  }

  const isDark = theme === "dark";

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-6 transition-colors duration-300"
      style={{ background: "var(--bg-base)" }}
    >
      <GridBackground />

      {/* Theme toggle */}
      <button
        id="btn-theme-toggle"
        onClick={toggle}
        aria-label={isDark ? "Chuyển sang sáng" : "Chuyển sang tối"}
        className="absolute top-5 right-5 p-2 rounded-[8px] transition-colors duration-200"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-border)",
          color: "var(--fg-secondary)",
        }}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Card */}
      <div
        className={`relative w-full max-w-[380px] rounded-[16px] p-8 transition-all duration-300 ${shake ? "animate-shake" : ""}`}
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="w-14 h-14 rounded-[14px] flex items-center justify-center text-2xl"
            style={{
              background: "var(--brand-bg)",
              boxShadow: "var(--shadow-border)",
            }}
          >
            🔐
          </div>
          <div className="text-center">
            <h1
              className="text-[22px] font-[700] tracking-[-0.03em]"
              style={{ color: "var(--fg-primary)" }}
            >
              Private Hub
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--fg-secondary)" }}>
              Nhập passkey để truy cập
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Passkey input */}
          <div className="relative">
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "var(--fg-muted)" }}
            >
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="input-passkey"
              ref={inputRef}
              type={show ? "text" : "password"}
              value={passkey}
              onChange={(e) => { setPasskey(e.target.value); setError(""); }}
              placeholder="Nhập passkey..."
              autoComplete="current-password"
              required
              className="w-full h-11 pl-9 pr-10 rounded-[8px] text-[14px] outline-none transition-all duration-150"
              style={{
                background: "var(--bg-elevated)",
                color: "var(--fg-primary)",
                boxShadow: error
                  ? "0 0 0 2px hsl(0,84%,60%), var(--shadow-border)"
                  : "var(--shadow-border)",
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = error
                  ? "0 0 0 2px hsl(0,84%,60%)"
                  : `0 0 0 2px var(--brand), var(--shadow-border)`;
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = error
                  ? "0 0 0 2px hsl(0,84%,60%), var(--shadow-border)"
                  : "var(--shadow-border)";
              }}
            />
            <button
              type="button"
              id="btn-toggle-show"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              aria-label={show ? "Ẩn passkey" : "Hiện passkey"}
              style={{ color: "var(--fg-muted)" }}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-[13px] text-center" style={{ color: "hsl(0,84%,62%)" }}>
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            id="btn-login"
            type="submit"
            disabled={loading || !passkey}
            className="w-full h-11 rounded-[8px] text-[14px] font-[600] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: loading || !passkey ? "var(--bg-elevated)" : "var(--brand)",
              color: loading || !passkey ? "var(--fg-secondary)" : "#fff",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Đang xác thực...
              </span>
            ) : "Vào Hub →"}
          </button>
        </form>

        {/* Footer */}
        <p
          className="text-center text-[12px] mt-6"
          style={{ color: "var(--fg-muted)" }}
        >
          Private Hub v1 · Chỉ dành cho bạn
        </p>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          15%,45%,75% { transform: translateX(-6px); }
          30%,60%,90% { transform: translateX(6px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}

// ─── Page (wrap in Suspense for useSearchParams) ──────────────
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
