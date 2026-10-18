"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("mashahir_theme") as "dark" | "light" | null;
    const initialTheme = saved || "dark";
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    if (initialTheme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("mashahir_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  };

  if (!mounted) {
    return (
      <div className="h-8 w-8 rounded-lg bg-muted border border-border" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "dark" ? "تغییر به حالت کاملاً روشن (Light Mode)" : "تغییر به حالت تاریک (Dark Mode)"}
      className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center shadow-xs"
      aria-label="تغییر تم"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-600" />
      )}
    </button>
  );
}
