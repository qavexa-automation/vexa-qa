"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";

import { Tabs } from "@/components/ui/tabs";

/**
 * Tabs whose active value lives in the URL, so a refresh, a shared link, or a navigation inside a
 * panel (a calendar's next month, a table's next page) comes back to the same tab. Switching uses
 * the native History API, which Next.js keeps in sync with useSearchParams, so changing tab is
 * instant and does not re-render the page on the server.
 *
 * The panels are server-rendered and passed in as children with the ordinary TabsList and
 * TabsContent primitives.
 */
export function UrlTabs({
  defaultValue,
  param = "tab",
  values,
  className,
  children,
}: {
  defaultValue: string;
  param?: string;
  /** Every tab value; anything else in the URL falls back to the default. */
  values: readonly string[];
  className?: string;
  children: ReactNode;
}) {
  const searchParams = useSearchParams();
  const requested = searchParams.get(param);
  const value = requested && values.includes(requested) ? requested : defaultValue;

  function change(next: unknown) {
    if (typeof next !== "string" || next === value) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(param, next);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  return (
    <Tabs className={className} onValueChange={change} value={value}>
      {children}
    </Tabs>
  );
}
