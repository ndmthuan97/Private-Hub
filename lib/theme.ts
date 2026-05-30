"use client";
import { useState, useEffect, useCallback } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "ph_theme";
const ATTR = "data-theme";

/** Shared theme hook — reads/writes ph_theme in localStorage + data-theme on <html>. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initial = saved ?? system;
    setTheme(initial);
    document.documentElement.setAttribute(ATTR, initial);
  }, []);

  const applyTheme = useCallback((t: Theme) => {
    setTheme(t);
    localStorage.setItem(STORAGE_KEY, t);
    document.documentElement.setAttribute(ATTR, t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.setAttribute(ATTR, next);
      return next;
    });
  }, []);

  return { theme, applyTheme, toggle } as const;
}
