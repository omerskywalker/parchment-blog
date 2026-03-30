"use client";

import * as React from "react";

type Props = {
  onSearch: (q: string) => void;
  initialValue?: string;
};

export default function SearchBar({ onSearch, initialValue = "" }: Props) {
  const [value, setValue] = React.useState(initialValue);

  // Debounce: fire onSearch 400ms after last keystroke
  React.useEffect(() => {
    const id = setTimeout(() => onSearch(value), 400);
    return () => clearTimeout(id);
  }, [value, onSearch]);

  return (
    <div className="relative w-full sm:w-72">
      <span className="absolute inset-y-0 left-3 flex items-center text-white/30 pointer-events-none">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search posts…"
        className="w-full rounded-md border border-white/10 bg-black/30 py-1.5 pl-8 pr-3 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-white/20"
      />
    </div>
  );
}
