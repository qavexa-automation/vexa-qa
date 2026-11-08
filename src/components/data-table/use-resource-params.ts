"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Search, filters, sorting, page, and page size are shareable, so they live in
 * the URL. Changing search, a filter, or the page size resets to the first
 * page; changing the page does not.
 */
export function useResourceParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const apply = useCallback(
    (changes: Record<string, string | null>, options: { resetPage?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "" || value === "all") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      if (options.resetPage !== false && !("page" in changes)) {
        next.delete("page");
      }
      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const get = useCallback((key: string) => searchParams.get(key) ?? "", [searchParams]);

  return { apply, get, isPending, searchParams };
}
