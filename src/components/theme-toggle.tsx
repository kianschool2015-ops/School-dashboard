"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("mashahir_theme") as "dark" | "light" | null;
    const initialTheme = saved === "dark" ? "dark" : "light";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    if (initialTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const selectTheme = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    localStorage.setItem("mashahir_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  };

  if (!mounted) {
    return (
      <div className="rounded-full p-1 bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center gap-1 w-[72px] h-[34px] animate-pulse" />
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="تغییر پوسته کاربری"
      className="rounded-full p-1 bg-slate-800 text-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center gap-1 shadow-xs shrink-0"
    >
      {/* Light Mode Button (Sun) */}
      <button
        type="button"
        role="radio"
        aria-checked={theme === "light"}
        onClick={() => selectTheme("light")}
        title="پوسته روشن (حالت روز)"
        className={`transition-all duration-150 flex items-center justify-center ${
          theme === "light"
            ? "bg-amber-400 text-slate-900 rounded-full p-1.5 shadow-sm"
            : "text-slate-400 hover:text-white p-1.5 rounded-full"
        }`}
      >
        <Sun className="h-3.5 w-3.5" />
        <span className="sr-only">حالت روشن</span>
      </button>

      {/* Dark Mode Button (Moon) */}
      <button
        type="button"
        role="radio"
        aria-checked={theme === "dark"}
        onClick={() => selectTheme("dark")}
        title="پوسته تاریک (حالت شب)"
        className={`transition-all duration-150 flex items-center justify-center ${
          theme === "dark"
            ? "bg-indigo-600 text-white rounded-full p-1.5 shadow-sm"
            : "text-slate-400 hover:text-white p-1.5 rounded-full"
        }`}
      >
        <Moon className="h-3.5 w-3.5" />
        <span className="sr-only">حالت تاریک</span>
      </button>
    </div>
  );
}
