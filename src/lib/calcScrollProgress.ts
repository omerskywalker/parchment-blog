/**
 * Returns scroll progress as a percentage [0, 100].
 * @param scrolled - pixels scrolled from the top
 * @param total    - total scrollable distance (scrollHeight - clientHeight)
 */
export function calcScrollProgress(scrolled: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (scrolled / total) * 100));
}
