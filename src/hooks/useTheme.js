import { useState, useEffect } from "react";

export function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("oa-theme");
    if (stored) return stored === "dark";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("oa-theme", dark ? "dark" : "light");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#0D1B2A" : "#F3F0E9");
  }, [dark]);

  return [dark, () => setDark(d => !d)];
}
