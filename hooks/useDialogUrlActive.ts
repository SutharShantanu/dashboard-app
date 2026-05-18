import { useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function useDialogUrlActive(isOpen: boolean, name: string = "dialog") {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  useEffect(() => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    if (isOpen) {
      current.set(name, "open");
    } else {
      current.delete(name);
    }

    const search = current.toString();
    const query = search ? `?${search}` : "";

    const newUrl = `${pathname}${query}`;
    
    // For comparison, create sorted versions to avoid infinite loops due to ordering differences
    const currentSorted = new URLSearchParams(Array.from(searchParams.entries()));
    currentSorted.sort();
    
    const nextSorted = new URLSearchParams(Array.from(current.entries()));
    nextSorted.sort();

    if (currentSorted.toString() !== nextSorted.toString()) {
      router.replace(newUrl, { scroll: false });
    }
  }, [isOpen, name, router, searchParams, pathname]);
}
