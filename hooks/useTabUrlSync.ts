"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

/**
 * Syncs a controlled tab value into the URL as a search param.
 *
 * Industry-standard naming: camelCase param keys (e.g. `tab`, `activeTab`).
 * Values should be camelCase for multi-word (e.g. `directChange`) or lowercase
 * for single-word (e.g. `direct`, `otp`).
 *
 * @param value   - The currently active tab value (e.g. "direct" | "otp")
 * @param paramKey - The URL param key to use (default: "tab")
 * @param enabled  - Only sync when the parent dialog/panel is open
 */
export function useTabUrlSync(
  value: string,
  paramKey: string = "tab",
  enabled: boolean = true
) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const lastWrittenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const current = new URLSearchParams(Array.from(searchParams.entries()));
    const existing = current.get(paramKey);

    if (existing === value) {
      lastWrittenRef.current = null;
      return;
    }

    const writtenKey = `${paramKey}=${value}`;
    if (lastWrittenRef.current === writtenKey) {
      lastWrittenRef.current = null;
      return;
    }

    current.set(paramKey, value);
    const search = current.toString();
    const newUrl = `${pathname}?${search}`;

    lastWrittenRef.current = writtenKey;
    router.replace(newUrl, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, paramKey, enabled, pathname]);

  /** Read the initial tab value from the URL (for deep-link support). */
  const getInitialValue = useCallback(
    (fallback: string): string => {
      return searchParams.get(paramKey) ?? fallback;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return { getInitialValue };
}
