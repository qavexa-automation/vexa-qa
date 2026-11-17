"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Free text that edits in place. It reads as plain text until hovered or focused, then shows it
 * is a control; editing saves on blur or Ctrl+Enter and discards on Escape. The collapsed value
 * stays clamped to two lines so one record cannot stretch a table row.
 */
export function InlineTextEdit({
  value,
  label,
  onChange,
  placeholder = "Add remarks",
  readOnly = false,
  className,
}: {
  value: string;
  /** What is being changed, e.g. "Developer remarks for TC-1", for the accessible name. */
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const trigger = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const text = value.trim();

  // A teammate's save must not overwrite what this person is still typing.
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  // Closing by keyboard puts focus back where it came from, never on the document body.
  useEffect(() => {
    if (editing || !returnFocus.current) return;
    returnFocus.current = false;
    trigger.current?.focus();
  }, [editing]);

  const close = (commit: boolean) => {
    returnFocus.current = true;
    setEditing(false);
    if (!commit) {
      setDraft(value);
      return;
    }
    const next = draft.trim();
    if (next !== text) onChange(next);
  };

  if (readOnly) {
    return (
      <p
        className={cn(
          "line-clamp-2 w-72 whitespace-pre-line break-words",
          !text && "text-muted-foreground",
          className,
        )}
        title={text || undefined}
      >
        {text || "—"}
      </p>
    );
  }

  if (editing) {
    return (
      <div className={cn("w-72", className)}>
        <Textarea
          aria-label={label}
          autoFocus
          className="min-h-16 text-sm"
          placeholder={placeholder}
          value={draft}
          onBlur={() => close(true)}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => {
            const end = event.currentTarget.value.length;
            event.currentTarget.setSelectionRange(end, end);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              close(false);
            }
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              close(true);
            }
          }}
        />
        <p className="mt-0.5 text-xs text-muted-foreground">Ctrl+Enter saves · Esc cancels</p>
      </div>
    );
  }

  return (
    <button
      aria-label={`${label}: ${text || "empty"}`}
      className={cn(
        "group/inline -mx-1 flex w-72 items-start gap-1 rounded-lg px-1 py-0.5 text-left outline-none",
        "transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      ref={trigger}
      title={text || undefined}
      type="button"
      onClick={() => setEditing(true)}
    >
      <span
        className={cn(
          "line-clamp-2 min-w-0 flex-1 whitespace-pre-line break-words",
          !text && "text-muted-foreground",
        )}
      >
        {text || "—"}
      </span>
      <Pencil
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-3.5 shrink-0 opacity-0 transition-opacity",
          "group-hover/inline:opacity-60 group-focus-visible/inline:opacity-100",
        )}
      />
    </button>
  );
}
