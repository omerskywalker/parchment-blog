"use client";

import * as React from "react";
import { type Heading } from "@/lib/headings";

interface TableOfContentsProps {
  headings: Heading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = React.useState<string>("");

  React.useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-10% 0% -80% 0%", threshold: 0 },
    );

    for (const { id } of headings) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <nav aria-label="Table of contents" className="hidden xl:block">
      <div className="sticky top-24 w-52 shrink-0">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/30">
          On this page
        </p>
        <ol className="space-y-1.5">
          {headings.map(({ id, text, level }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(id);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                    setTimeout(() => window.scrollBy(0, -80), 10);
                    setActiveId(id);
                  }
                }}
                className={[
                  "block truncate text-sm leading-snug transition-colors duration-150",
                  level === 3 ? "pl-3" : "",
                  activeId === id
                    ? "font-medium text-white"
                    : "text-white/40 hover:text-white/70",
                ].join(" ")}
              >
                {text}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
