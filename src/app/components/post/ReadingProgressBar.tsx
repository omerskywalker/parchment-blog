"use client";

import * as React from "react";
import { calcScrollProgress } from "@/lib/calcScrollProgress";

export function ReadingProgressBar() {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    function onScroll() {
      const el = document.documentElement;
      const scrolled = el.scrollTop || document.body.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(calcScrollProgress(scrolled, total));
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // set initial value
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60] h-[3px] bg-amber-400/75 transition-[width] duration-75 ease-out"
      style={{ width: `${progress}%` }}
    />
  );
}
