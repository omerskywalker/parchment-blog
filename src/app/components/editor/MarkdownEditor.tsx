"use client";

import CodeMirror from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

type Props = {
  value: string;
  onChange: (value: string) => void;
  minHeight?: number;
  placeholder?: string;
};

// ─── Accent palette ──────────────────────────────────────────────
// Swap these three to retheme the entire editor highlight scheme.
const accentPrimary = "#d4c8e2"; // cream    — H1, blockquote, inserted
const accentSecondary = "#a8a8b0"; // silver   — H3, list markers
const accentAlternate = "#f0ece4"; // lavender — H2, links, labels
// ─────────────────────────────────────────────────────────────────

const markdownHighlightStyle = HighlightStyle.define([
  // headings
  { tag: tags.heading1, color: accentPrimary, fontWeight: "700" },
  { tag: tags.heading2, color: accentAlternate, fontWeight: "700" },
  { tag: tags.heading3, color: accentSecondary, fontWeight: "600" },

  // markdown punctuation / symbols
  { tag: tags.processingInstruction, color: "rgba(255,255,255,0.22)" },
  { tag: tags.meta, color: "rgba(255,255,255,0.22)" },

  // emphasis / strong
  { tag: tags.strong, color: "#ffffff", fontWeight: "700" },
  { tag: tags.emphasis, color: "rgba(255,255,255,0.70)", fontStyle: "italic" },

  // inline code
  { tag: tags.monospace, color: "rgba(255,255,255,0.55)" },

  // links
  { tag: tags.link, color: accentAlternate, textDecoration: "underline" },

  // lists / quotes / separators
  { tag: tags.list, color: accentSecondary },
  { tag: tags.quote, color: accentPrimary },
  { tag: tags.separator, color: "rgba(255,255,255,0.18)" },

  // labels / inserted
  { tag: tags.labelName, color: accentAlternate },
  { tag: tags.inserted, color: accentPrimary },

  // plain text fallback
  { tag: tags.content, color: "rgba(255,255,255,0.92)" },
]);

const parchmentTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#000000",
      color: "rgba(255,255,255,0.92)",
      fontSize: "15px",
      fontFamily:
        'var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    ".cm-editor": { backgroundColor: "#000000" },
    ".cm-scroller": {
      backgroundColor: "#000000",
      color: "rgba(255,255,255,0.92)",
      fontFamily:
        'var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      lineHeight: "1.8",
      overflow: "auto",
    },
    ".cm-content": {
      backgroundColor: "#000000",
      color: "rgba(255,255,255,0.92)",
      padding: "14px 16px",
      caretColor: "#ffffff",
      minHeight: "100%",
    },
    ".cm-line": { padding: "0", backgroundColor: "transparent" },
    ".cm-focused": { outline: "none" },
    ".cm-editor.cm-focused": { outline: "none" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#ffffff", borderLeftWidth: "2px" },
    ".cm-selectionBackground": { backgroundColor: "rgba(255,255,255,0.14) !important" },
    ".cm-content ::selection": { backgroundColor: "rgba(255,255,255,0.14)" },
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.03)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent" },
    ".cm-gutters": { display: "none", backgroundColor: "#000000", border: "none" },
    ".cm-foldGutter": { display: "none" },
    ".cm-tooltip": {
      backgroundColor: "#0a0a0a",
      border: "1px solid rgba(255,255,255,0.08)",
      color: "#ffffff",
    },
    ".cm-panels": { backgroundColor: "#000000", color: "#ffffff" },
    ".cm-placeholder": { color: "rgba(255,255,255,0.28)" },
  },
  { dark: true },
);

export default function MarkdownEditor({
  value,
  onChange,
  minHeight = 360,
  placeholder = "Write in Markdown...",
}: Props) {
  return (
    <div className="mt-2 overflow-hidden rounded-md border border-white/10 bg-black shadow-sm">
      <CodeMirror
        value={value}
        height={`${minHeight}px`}
        theme={parchmentTheme}
        extensions={[
          markdown(),
          syntaxHighlighting(markdownHighlightStyle),
          EditorView.lineWrapping,
        ]}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          dropCursor: false,
          allowMultipleSelections: false,
          highlightActiveLine: true,
          highlightActiveLineGutter: false,
        }}
        placeholder={placeholder}
        onChange={(nextValue) => onChange(nextValue)}
      />
    </div>
  );
}
