"use client";

import type { LucideIcon } from "lucide-react";

import { IconButton } from "@/components/app-shell/icon-button";
import { cn } from "@/lib/utils";

export type RowAction = {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
};

/**
 * A row's actions as icon buttons in one narrow trailing column, destructive last. Each names
 * its record for screen readers; a consequential action still confirms in the caller.
 */
export function RowActions({
  subject,
  actions,
  revealOnHover = false,
}: {
  subject: string;
  actions: RowAction[];
  /**
   * In a table row, stay hidden until the row is hovered or holds focus. Touch screens, which
   * cannot hover, always show them; so do the phone tiles, which leave this off.
   */
  revealOnHover?: boolean;
}) {
  const ordered = [
    ...actions.filter((action) => !action.destructive),
    ...actions.filter((action) => action.destructive),
  ];
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-0.5",
        revealOnHover &&
          "transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 [@media(hover:hover)]:group-focus-within/row:opacity-100",
      )}
    >
      {ordered.map(({ label, icon, onSelect, destructive }) => (
        <IconButton
          ariaLabel={`${label}: ${subject}`}
          destructive={destructive}
          icon={icon}
          key={label}
          label={label}
          onClick={onSelect}
        />
      ))}
    </div>
  );
}

/** The common pair for an editable record: edit first, delete last. */
export function editDeleteActions(
  noun: string,
  onEdit: () => void,
  onDelete: () => void,
  icons: { edit: LucideIcon; delete: LucideIcon },
): RowAction[] {
  return [
    { label: `Edit ${noun}`, icon: icons.edit, onSelect: onEdit },
    { label: `Delete ${noun}`, icon: icons.delete, onSelect: onDelete, destructive: true },
  ];
}
