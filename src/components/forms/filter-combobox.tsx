"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxSearch,
  ComboboxSelectTrigger,
} from "@/components/ui/combobox";
import type { ComboboxOption } from "@/components/forms/option-combobox";
import { cn } from "@/lib/utils";

/**
 * A list filter that applies as soon as an option is picked. The first option is always the
 * explicit "All …" choice, whose value is the empty string.
 */
export function FilterCombobox({
  label,
  allLabel,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  allLabel: string;
  options: readonly ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const items: ComboboxOption[] = [{ value: "", label: allLabel }, ...options];
  const selected = items.find((option) => option.value === value) ?? items[0];
  return (
    <Combobox
      itemToStringLabel={(option: ComboboxOption) => option.label}
      itemToStringValue={(option: ComboboxOption) => option.label}
      items={items}
      onValueChange={(option: ComboboxOption | null) => onChange(option?.value ?? "")}
      value={selected}
    >
      <ComboboxSelectTrigger
        aria-label={label}
        className={cn("h-9 w-44", className)}
        placeholder={allLabel}
      />
      <ComboboxContent>
        <ComboboxSearch />
        <ComboboxEmpty>No matches.</ComboboxEmpty>
        <ComboboxList>
          {(option: ComboboxOption) => (
            <ComboboxItem key={option.value || "all"} value={option}>
              {option.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

/** Options from a fixed list of values whose label is the value itself. */
export const valueOptions = (values: readonly string[]): ComboboxOption[] =>
  values.map((value) => ({ value, label: value }));
