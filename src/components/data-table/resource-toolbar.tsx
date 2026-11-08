"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { useResourceParams } from "@/components/data-table/use-resource-params";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxSearch,
  ComboboxSelectTrigger,
} from "@/components/ui/combobox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";

export type FilterOption = { value: string; label: string };

export type ResourceFilter = {
  name: string;
  label: string;
  /** Shown in the trigger when nothing is chosen, e.g. "All properties". */
  allLabel: string;
  options: FilterOption[];
  /** Filters users reach for less often sit behind the More filters popover. */
  secondary?: boolean;
};

/**
 * Search and the frequently used filters sit on the left and apply
 * immediately. Page actions sit on the right.
 */
export function ResourceToolbar({
  searchPlaceholder,
  searchLabel,
  filters = [],
  actions,
}: {
  searchPlaceholder: string;
  searchLabel: string;
  filters?: ResourceFilter[];
  actions?: ReactNode;
}) {
  const { apply, get, isPending } = useResourceParams();
  const [term, setTerm] = useState(get("q"));

  // The input is the source of truth while the reader types; the URL catches
  // up once they pause, so the debounce writes and never reads back.
  useEffect(() => {
    if (term === get("q")) return;
    const timer = setTimeout(() => apply({ q: term }), 250);
    return () => clearTimeout(timer);
  }, [apply, get, term]);

  const primary = filters.filter((filter) => !filter.secondary);
  const secondary = filters.filter((filter) => filter.secondary);
  const activeCount = filters.filter(
    (filter) => get(filter.name) && get(filter.name) !== "all",
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-2" data-pending={isPending || undefined}>
      <InputGroup className="h-9 w-full sm:max-w-xs" data-tour="resource-search">
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          aria-label={searchLabel}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={searchPlaceholder}
          value={term}
        />
      </InputGroup>

      {primary.map((filter) => (
        <FilterCombobox filter={filter} key={filter.name} />
      ))}

      {secondary.length ? (
        <Popover>
          <PopoverTrigger render={<Button data-tour="resource-more-filters" variant="outline" />}>
            <SlidersHorizontal aria-hidden="true" />
            More filters
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 space-y-3">
            <PopoverTitle>More filters</PopoverTitle>
            {secondary.map((filter) => (
              <div className="space-y-1.5" key={filter.name}>
                <p className="text-xs font-medium text-muted-foreground">{filter.label}</p>
                <FilterCombobox filter={filter} fullWidth />
              </div>
            ))}
          </PopoverContent>
        </Popover>
      ) : null}

      {activeCount > 0 || term ? (
        <Button
          onClick={() => {
            setTerm("");
            apply(
              Object.fromEntries([["q", null], ...filters.map((filter) => [filter.name, null])]),
            );
          }}
          size="sm"
          variant="ghost"
        >
          <X aria-hidden="true" />
          Clear
        </Button>
      ) : null}

      {actions ? (
        <div className="flex items-center gap-2 sm:ml-auto" data-tour="resource-actions">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

function FilterCombobox({ filter, fullWidth }: { filter: ResourceFilter; fullWidth?: boolean }) {
  const { apply, get } = useResourceParams();
  const options: FilterOption[] = [{ value: "all", label: filter.allLabel }, ...filter.options];
  const current = get(filter.name) || "all";
  const selected = options.find((option) => option.value === current) ?? options[0];

  return (
    <Combobox
      itemToStringValue={(option: FilterOption) => option.label}
      items={options}
      onValueChange={(option) => apply({ [filter.name]: option?.value ?? null })}
      value={selected}
    >
      <ComboboxSelectTrigger
        aria-label={filter.label}
        className={fullWidth ? "w-full" : "w-44"}
        data-tour={`resource-filter-${filter.name}`}
        placeholder={filter.allLabel}
      />
      <ComboboxContent>
        <ComboboxSearch />
        <ComboboxEmpty>No matches.</ComboboxEmpty>
        <ComboboxList>
          {(option: FilterOption) => (
            <ComboboxItem key={option.value} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
