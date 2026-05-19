import { useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

/**
 * Syncs a dialog's open state into the URL as a search param.
 * Uses a ref to track the last-written value so we never react to our own
 * router.replace() calls (which would cause an infinite loop).
 */
export function useDialogUrlActive(isOpen: boolean, name: string = "dialog") {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Track the last value we wrote so we never re-trigger on our own push.
  const lastWrittenRef = useRef<string | null>(null);

  useEffect(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    const existing = current.get(name);

    const desired = isOpen ? "open" : null;

    // Skip if the URL already reflects the desired state.
    if (existing === desired) {
      lastWrittenRef.current = null; // reset so external changes are picked up
      return;
    }

    // Skip if we just wrote this exact value (avoid reacting to our own push).
    const writtenKey = `${name}=${desired ?? "deleted"}`;
    if (lastWrittenRef.current === writtenKey) {
      lastWrittenRef.current = null;
      return;
    }

    if (isOpen) {
      current.set(name, "open");
    } else {
      current.delete(name);
    }

    const search = current.toString();
    const query = search ? `?${search}` : "";
    const newUrl = `${pathname}${query}`;

    lastWrittenRef.current = writtenKey;
    router.replace(newUrl, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, name, pathname]);
  // Intentionally omitting `searchParams` and `router` from deps:
  // - searchParams: including it causes a loop (our replace → new searchParams → re-run)
  // - router: stable reference in Next.js App Router
}
