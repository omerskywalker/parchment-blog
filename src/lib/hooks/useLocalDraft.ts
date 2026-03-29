import { useEffect, useRef } from "react";

type DraftValue = Record<string, unknown>;

export function useLocalDraft<T extends DraftValue>(
  key: string,
  value: T,
  onRestore: (saved: T) => void,
) {
  const restored = useRef(false);

  // Restore once on mount
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        onRestore(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Save on every value change
  useEffect(() => {
    if (!restored.current) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or unavailable
    }
  }, [key, value]);

  function clear() {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  return { clear };
}
