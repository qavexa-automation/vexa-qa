"use client";

import { cn } from "@/lib/utils";

export function DataTableLoadingBar({ isPending }: { isPending: boolean }) {
  return (
    <div aria-hidden="true" className="h-0.5 overflow-hidden bg-transparent">
      <div
        className={cn(
          "h-full w-1/3 bg-primary transition-opacity duration-150",
          isPending ? "opacity-100 motion-safe:animate-pulse" : "opacity-0",
        )}
      />
    </div>
  );
}
