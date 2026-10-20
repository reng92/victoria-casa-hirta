"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

/** Toggle tema dark/light. Persistenza in localStorage, attributo data-theme su <html>. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (next === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
    // Barra del browser e status bar seguono il tema scelto, non quello del telefono
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "light" ? "#f4f6fb" : "#0b1220");
    try {
      localStorage.setItem("vch-theme", next);
    } catch {}
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Attiva tema chiaro" : "Attiva tema scuro"}
      title={isDark ? "Tema chiaro" : "Tema scuro"}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full glass text-text hover:bg-surface-2 transition ${className}`}
    >
      {isDark ? <Sun className="w-[18px] h-[18px]" aria-hidden /> : <Moon className="w-[18px] h-[18px]" aria-hidden />}
    </button>
  );
}
