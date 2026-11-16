"use client";

import { useEffect, useState } from "react";

export type ListViewMode = "list" | "grid";

export function useListViewMode(
  storageKey: string,
  defaultMode: ListViewMode = "list"
): [ListViewMode, (mode: ListViewMode) => void] {
  const [mode, setMode] = useState<ListViewMode>(defaultMode);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "list" || stored === "grid") {
        setMode(stored);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  function setViewMode(next: ListViewMode) {
    setMode(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      /* ignore */
    }
  }

  return [mode, setViewMode];
}
