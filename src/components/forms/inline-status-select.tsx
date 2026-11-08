"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

/**
 * A status or priority badge that edits in place. It reads as the badge until hovered or
 * focused, then shows it is a control; choosing an option saves immediately. Lists are short
 * and fixed, so there is no search field.
 */
export function InlineStatusSelect<TValue extends string>({
  value,
  options,
  tone,
  label,
  onChange,
  disabled = false,
  className,
}: {
  value: TValue;
  options: readonly TValue[];
  tone: (value: TValue) => StatusTone;
  /** What is being changed, e.g. "Priority for VXA-12", for the accessible name. */
  label: string;
  onChange: (value: TValue) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Combobox
      disabled={disabled}
      items={[...options]}
      onValueChange={(next: TValue | null) => {
        if (next && next !== value) onChange(next);
      }}
      value={value}
    >
      <ComboboxTrigger
        aria-label={`${label}: ${value}`}
        className={cn(
          "group/inline -mx-1 inline-flex w-fit items-center gap-0.5 rounded-4xl px-1 py-0.5 outline-none",
          "transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
          "data-popup-open:bg-muted disabled:pointer-events-none",
          "[&>svg]:size-3.5! [&>svg]:opacity-40 [&>svg]:transition-opacity",
          "hover:[&>svg]:opacity-100 focus-visible:[&>svg]:opacity-100 data-popup-open:[&>svg]:opacity-100",
          className,
        )}
        disabled={disabled}
      >
        <StatusBadge label={value} tone={tone(value)} />
      </ComboboxTrigger>
      <ComboboxContent align="start" className="w-auto min-w-40">
        <ComboboxList>
          {(option: TValue) => (
            <ComboboxItem key={option} value={option}>
              <StatusBadge label={option} tone={tone(option)} />
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
