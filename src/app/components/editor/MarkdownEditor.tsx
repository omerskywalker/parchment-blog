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

/*
 * Editor palette is driven by CSS variables so the theme system can repaint
 * it without re-mounting CodeMirror. Defaults match the original dark-mode
 * editor (black surface, near-white text). Sepia overrides are defined in
 * globals.css under `[data-theme="sepia"]` and turn the editor into a darker
 * parchment surface with ink-and-rust syntax accents — keeps the editor
 * visually distinct from the page background while staying inside the
 * parchment palette.
 */
const cssVar = (name: string, fallback: string) => `var(${name}, ${fallback})`;

const markdownHighlightStyle = HighlightStyle.define([
  // headings — three accent slots so the user can re-skin from CSS
  { tag: tags.heading1, color: cssVar("--cm-accent-primary", "#b8d4c0"), fontWeight: "700" },
  { tag: tags.heading2, color: cssVar("--cm-accent-alternate", "#d4bfa8"), fontWeight: "700" },
  { tag: tags.heading3, color: cssVar("--cm-accent-secondary", "#d4c8e2"), fontWeight: "600" },

  // markdown punctuation / symbols
  { tag: tags.processingInstruction, color: cssVar("--cm-meta", "rgba(255,255,255,0.22)") },
  { tag: tags.meta, color: cssVar("--cm-meta", "rgba(255,255,255,0.22)") },

  // emphasis / strong
  { tag: tags.strong, color: cssVar("--cm-strong", "#ffffff"), fontWeight: "700" },
  {
    tag: tags.emphasis,
    color: cssVar("--cm-emphasis", "rgba(255,255,255,0.70)"),
    fontStyle: "italic",
  },

  // inline code
  { tag: tags.monospace, color: cssVar("--cm-monospace", "rgba(255,255,255,0.55)") },

  // links
  {
    tag: tags.link,
    color: cssVar("--cm-accent-alternate", "#d4bfa8"),
    textDecoration: "underline",
  },

  // lists / quotes / separators
  { tag: tags.list, color: cssVar("--cm-accent-secondary", "#d4c8e2") },
  { tag: tags.quote, color: cssVar("--cm-accent-primary", "#b8d4c0") },
  { tag: tags.separator, color: cssVar("--cm-separator", "rgba(255,255,255,0.18)") },

  // labels / inserted
  { tag: tags.labelName, color: cssVar("--cm-accent-alternate", "#d4bfa8") },
  { tag: tags.inserted, color: cssVar("--cm-accent-primary", "#b8d4c0") },

  // plain text fallback
  { tag: tags.content, color: cssVar("--cm-fg", "rgba(255,255,255,0.92)") },
]);

const parchmentTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: cssVar("--cm-bg", "#000000"),
      color: cssVar("--cm-fg", "rgba(255,255,255,0.92)"),
      fontSize: "15px",
      fontFamily:
        'var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    },
    ".cm-editor": { backgroundColor: cssVar("--cm-bg", "#000000") },
    ".cm-scroller": {
      backgroundColor: cssVar("--cm-bg", "#000000"),
      color: cssVar("--cm-fg", "rgba(255,255,255,0.92)"),
      fontFamily:
        'var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      lineHeight: "1.8",
      overflow: "auto",
    },
    ".cm-content": {
      backgroundColor: cssVar("--cm-bg", "#000000"),
      color: cssVar("--cm-fg", "rgba(255,255,255,0.92)"),
      padding: "14px 16px",
      caretColor: cssVar("--cm-caret", "#ffffff"),
      minHeight: "100%",
    },
    ".cm-line": { padding: "0", backgroundColor: "transparent" },
    ".cm-focused": { outline: "none" },
    ".cm-editor.cm-focused": { outline: "none" },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: cssVar("--cm-caret", "#ffffff"),
      borderLeftWidth: "2px",
    },
    ".cm-selectionBackground": {
      backgroundColor: `${cssVar("--cm-selection", "rgba(255,255,255,0.14)")} !important`,
    },
    ".cm-content ::selection": {
      backgroundColor: cssVar("--cm-selection", "rgba(255,255,255,0.14)"),
    },
    ".cm-activeLine": { backgroundColor: cssVar("--cm-active-line", "rgba(255,255,255,0.03)") },
    ".cm-activeLineGutter": { backgroundColor: "transparent" },
    ".cm-gutters": {
      display: "none",
      backgroundColor: cssVar("--cm-bg", "#000000"),
      border: "none",
    },
    ".cm-foldGutter": { display: "none" },
    ".cm-tooltip": {
      backgroundColor: cssVar("--cm-tooltip-bg", "#0a0a0a"),
      border: `1px solid ${cssVar("--cm-tooltip-border", "rgba(255,255,255,0.08)")}`,
      color: cssVar("--cm-fg", "#ffffff"),
    },
    ".cm-panels": {
      backgroundColor: cssVar("--cm-bg", "#000000"),
      color: cssVar("--cm-fg", "#ffffff"),
    },
    ".cm-placeholder": { color: cssVar("--cm-placeholder", "rgba(255,255,255,0.28)") },
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
    <div className="cm-parchment-shell mt-2 overflow-hidden rounded-md border border-white/10 bg-black shadow-sm">
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
