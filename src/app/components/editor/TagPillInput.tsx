"use client";

import * as React from "react";
import { parseTagsInput } from "@/lib/tags";

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  maxTags?: number;
};

export default function TagPillInput({ tags, onChange, maxTags = 20 }: Props) {
  const [inputValue, setInputValue] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  function addTag(raw: string) {
    const parsed = parseTagsInput(raw);
    if (!parsed.length) return;
    const next = Array.from(new Set([...tags, ...parsed])).slice(0, maxTags);
    onChange(next);
    setInputValue("");
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  function onBlur() {
    if (inputValue.trim()) addTag(inputValue);
  }

  return (
    <div
      className="mt-2 flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-md border border-white/10 bg-black/30 px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-white/20 cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2.5 py-0.5 text-xs text-white/80"
        >
          #{tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
            className="ml-0.5 text-white/40 hover:text-white/80 transition-colors leading-none"
            aria-label={`Remove ${tag}`}
          >
            ×
          </button>
        </span>
      ))}

      {tags.length < maxTags && (
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          className="min-w-[120px] flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          placeholder={tags.length === 0 ? "e.g. bitcoin, dev, islam" : "Add tag…"}
        />
      )}
    </div>
  );
}
