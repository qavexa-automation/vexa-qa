import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ZodError } from "zod";

import { OptionCombobox } from "@/components/forms/option-combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Workspace } from "@/lib/model";

import type { RecordEdit } from "../lib/record-edits";

export function RecordEditForm({
  edit,
  pending,
  onDirty,
  onCancel,
  onSave,
}: {
  edit: RecordEdit;
  pending: boolean;
  onDirty: (dirty: boolean) => void;
  onCancel: () => void;
  onSave: (draft: Workspace) => Promise<void>;
}) {
  const [values, setValues] = useState(edit.initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState("");
  const saving = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const message = useRef<HTMLDivElement>(null);
  const prefix = useId();
  const dirty = Object.keys(edit.initial).some((key) => values[key] !== edit.initial[key]);

  useEffect(() => {
    form.current?.querySelector<HTMLElement>('input, textarea, [role="combobox"]')?.focus();
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (name: string, value: string) => {
    const next = { ...values, [name]: value };
    setValues(next);
    onDirty(Object.keys(edit.initial).some((key) => next[key] !== edit.initial[key]));
    setErrors((previous) => ({ ...previous, [name]: "" }));
    setProblem("");
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty || saving.current) return;
    saving.current = true;
    setErrors({});
    setProblem("");
    try {
      await onSave(edit.apply(values));
    } catch (error) {
      if (error instanceof ZodError && error.issues.every((issue) => issue.path.length)) {
        const next: Record<string, string> = {};
        for (const issue of error.issues) next[String(issue.path[0])] ??= issue.message;
        setErrors(next);
        requestAnimationFrame(() =>
          form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
        );
      } else {
        setProblem(
          error instanceof Error ? error.message : "Unable to save this record. Try again.",
        );
        requestAnimationFrame(() => message.current?.focus());
      }
    } finally {
      saving.current = false;
    }
  }

  return (
    <form className="grid min-w-0 gap-4" noValidate onSubmit={submit} ref={form}>
      <fieldset className="grid min-w-0 gap-4" disabled={pending}>
        {edit.fields
          .filter((field) => !field.timedOnly || values.timing === "Timed")
          .map((field) => {
            const { name, label, options, kind, required } = field;
            const id = `${prefix}-${name}`;
            const error = errors[name];
            const value = values[name];
            if (options)
              return (
                <OptionCombobox
                  key={name}
                  id={id}
                  label={label}
                  value={value}
                  options={options}
                  placeholder={`Select ${label.toLowerCase()}`}
                  onChange={(next) => change(name, next)}
                  disabled={pending}
                  error={error}
                />
              );
            const props = {
              id,
              required,
              value,
              "aria-invalid": !!error,
              "aria-describedby": error ? `${id}-error` : undefined,
            };
            return (
              <Field key={name} data-invalid={!!error}>
                <FieldLabel htmlFor={id}>
                  {label}
                  {!required && " (optional)"}
                </FieldLabel>
                {kind === "textarea" ? (
                  <Textarea
                    {...props}
                    rows={3}
                    onChange={(event) => change(name, event.target.value)}
                  />
                ) : (
                  <Input
                    {...props}
                    type={kind}
                    onChange={(event) => change(name, event.target.value)}
                  />
                )}
                {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
              </Field>
            );
          })}
      </fieldset>
      {problem && (
        <Alert ref={message} tabIndex={-1} role="alert" variant="destructive">
          <AlertDescription>{problem}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button disabled={pending} onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
        <Button className="min-w-28" disabled={!dirty || pending} type="submit">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
