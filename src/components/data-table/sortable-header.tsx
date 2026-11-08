"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { useResourceParams } from "@/components/data-table/use-resource-params";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Sorting is shareable, so the header writes to the URL rather than to table
 * state. Only columns users have a reason to sort get one.
 */
export function SortableHeader({
  field,
  title,
  align = "start",
}: {
  field: string;
  title: string;
  align?: "start" | "end";
}) {
  const { apply, get } = useResourceParams();
  const current = get("sort");
  const [activeField, direction] = current.split(":");
  const isActive = activeField === field;
  const Icon = !isActive ? ChevronsUpDown : direction === "desc" ? ArrowDown : ArrowUp;

  function cycle() {
    if (!isActive) apply({ sort: `${field}:asc` });
    else if (direction === "asc") apply({ sort: `${field}:desc` });
    else apply({ sort: null });
  }

  return (
    <Button
      aria-label={`Sort by ${title}`}
      className={cn(
        "-mx-2 h-7 gap-1 px-2 text-xs font-medium text-muted-foreground",
        align === "end" && "ml-auto",
      )}
      onClick={cycle}
      size="sm"
      variant="ghost"
    >
      {title}
      <Icon className={cn("size-3.5", !isActive && "opacity-50")} />
    </Button>
  );
}
