"use client";

import { useId, useRef, useState, useTransition } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

type ReasonOption<TReason extends string> = { value: TReason; label: string };

/**
 * Confirms a consequential step that ends a lead (closing, rejecting, cancelling) and asks why,
 * so the reason is structured data rather than a free-text afterthought. The note is optional.
 */
export function ReasonDialog<TReason extends string>({
  open,
  onOpenChange,
  title,
  description,
  reasonLabel,
  options,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  reasonLabel: string;
  options: ReasonOption<TReason>[];
  confirmLabel: string;
  cancelLabel?: string;
  /** Returns an error message to show, or null when the step succeeded. */
  onConfirm: (reason: TReason, note: string) => Promise<string | null>;
}) {
  const id = useId();
  const input = useRef<HTMLButtonElement>(null);
  const [reason, setReason] = useState<ReasonOption<TReason> | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset(nextOpen: boolean) {
    if (!nextOpen) {
      setReason(null);
      setNote("");
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  function confirm() {
    if (!reason) {
      setError("Choose a reason.");
      input.current?.focus();
      return;
    }
    setError(null);
    startTransition(async () => {
      const problem = await onConfirm(reason.value, note.trim());
      if (problem) setError(problem);
      else reset(false);
    });
  }

  return (
    <AlertDialog onOpenChange={reset} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor={`${id}-reason`}>{reasonLabel}</FieldLabel>
            <Combobox
              itemToStringValue={(option: ReasonOption<TReason>) => option.label}
              items={options}
              onValueChange={(option) => {
                setReason(option);
                if (option) setError(null);
              }}
              value={reason}
            >
              <ComboboxSelectTrigger
                aria-invalid={!!error}
                className="w-full"
                id={`${id}-reason`}
                placeholder="Select a reason"
                ref={input}
              />
              <ComboboxContent>
                <ComboboxSearch />
                <ComboboxEmpty>No reason matches that.</ComboboxEmpty>
                <ComboboxList>
                  {(option: ReasonOption<TReason>) => (
                    <ComboboxItem key={option.value} value={option}>
                      {option.label}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            {error ? <FieldError errors={[{ message: error }]} /> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-note`}>
              Note <span className="font-normal text-muted-foreground">(optional)</span>
            </FieldLabel>
            <Textarea
              id={`${id}-note`}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              value={note}
            />
          </Field>
        </FieldGroup>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <Button disabled={isPending} onClick={confirm} variant="destructive">
            {isPending ? <Spinner /> : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
