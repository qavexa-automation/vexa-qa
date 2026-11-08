"use client";

import type { Column, RowData } from "@tanstack/react-table";
import { ListFilter, X } from "lucide-react";

import type { ColumnFilterConfig, DateRange } from "@/components/data-table/column-filter-fns";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export * from "@/components/data-table/column-filter-fns";

function isEmpty(value: unknown) {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return !(value as DateRange).from && !(value as DateRange).to;
  return false;
}

/** The funnel beside a column header. Filters apply as they change; there is no Apply button. */
export function ColumnFilter<TData extends RowData>({
  column,
  config,
}: {
  column: Column<DataTableFeatures, TData>;
  config: ColumnFilterConfig;
}) {
  const value = column.getFilterValue();
  const active = column.getIsFiltered();
  const set = (next: unknown) => column.setFilterValue(isEmpty(next) ? undefined : next);
  const id = `column-filter-${column.id}`;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label={active ? `Filter ${config.label} (active)` : `Filter ${config.label}`}
            className={cn(
              "relative -my-1 text-muted-foreground",
              active && "bg-brand-subtle text-brand hover:bg-brand-subtle",
            )}
            size="icon-xs"
            variant="ghost"
          />
        }
      >
        <ListFilter aria-hidden="true" />
        {active && (
          <span
            aria-hidden="true"
            className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-brand"
          />
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Filter {config.label}</p>
          {active && (
            <Button size="xs" variant="ghost" onClick={() => set(undefined)}>
              <X aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>
        {config.kind === "text" && (
          <Input
            aria-label={`${config.label} contains`}
            autoFocus
            placeholder="Contains…"
            value={typeof value === "string" ? value : ""}
            onChange={(event) => set(event.target.value)}
          />
        )}
        {config.kind === "options" && (
          <ul className="flex flex-col gap-1">
            {config.options.map((option) => {
              const selected = Array.isArray(value) && value.includes(option);
              const optionId = `${id}-${option.replace(/\W+/g, "-")}`;
              return (
                <li className="flex items-center gap-2" key={option}>
                  <Checkbox
                    checked={selected}
                    id={optionId}
                    onCheckedChange={(checked) => {
                      const current = Array.isArray(value) ? (value as string[]) : [];
                      set(
                        checked
                          ? [...current, option]
                          : current.filter((entry) => entry !== option),
                      );
                    }}
                  />
                  <label className="cursor-pointer text-sm" htmlFor={optionId}>
                    {option}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {config.kind === "date" && (
          <div className="grid grid-cols-2 gap-2">
            {(["from", "to"] as const).map((edge) => {
              const range = (value as DateRange | undefined) ?? {};
              return (
                <Field key={edge}>
                  <FieldLabel htmlFor={`${id}-${edge}`}>
                    {edge === "from" ? "From" : "To"}
                  </FieldLabel>
                  <Input
                    id={`${id}-${edge}`}
                    max={edge === "from" ? range.to : undefined}
                    min={edge === "to" ? range.from : undefined}
                    type="date"
                    value={range[edge] ?? ""}
                    onChange={(event) => set({ ...range, [edge]: event.target.value || undefined })}
                  />
                </Field>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
