"use client";

import type { ReactNode, Ref } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxSearch,
  ComboboxSelectTrigger,
} from "@/components/ui/combobox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

export type ComboboxOption = { value: string; label: string; hint?: string };

/**
 * A labelled single-select field: the Select2-style button that opens a searchable list. It stores
 * the option's identifier and shows its label, so forms submit ids and people read names.
 */
export function OptionCombobox({
  id,
  label,
  options,
  value,
  onChange,
  placeholder,
  description,
  error,
  disabled,
  triggerRef,
}: {
  id: string;
  label: ReactNode;
  options: readonly ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  description?: ReactNode;
  error?: string;
  disabled?: boolean;
  /** Lets a form return focus to this field, for example after saving. */
  triggerRef?: Ref<HTMLButtonElement>;
}) {
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Combobox
        disabled={disabled}
        itemToStringLabel={(option: ComboboxOption) => option.label}
        itemToStringValue={(option: ComboboxOption) => option.label}
        items={options as ComboboxOption[]}
        onValueChange={(option: ComboboxOption | null) => {
          if (option) onChange(option.value);
        }}
        value={selected}
      >
        <ComboboxSelectTrigger
          aria-invalid={!!error}
          className="w-full"
          disabled={disabled}
          id={id}
          placeholder={placeholder}
          ref={triggerRef}
        />
        <ComboboxContent>
          <ComboboxSearch />
          <ComboboxEmpty>No matches.</ComboboxEmpty>
          <ComboboxList>
            {(option: ComboboxOption) => (
              <ComboboxItem key={option.value} value={option}>
                <span className="flex min-w-0 flex-col">
                  <span>{option.label}</span>
                  {option.hint ? (
                    <span className="text-xs text-muted-foreground">{option.hint}</span>
                  ) : null}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
