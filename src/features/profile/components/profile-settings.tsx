"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { displayNameSchema } from "../schemas/profile-schema";
import type { ProfileSaveResult } from "../types/profile";

export function ProfileSettings({
  initialName,
  onSave,
  onNotice,
}: {
  initialName: string;
  onSave: (name: string) => Promise<ProfileSaveResult>;
  onNotice: (message: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const name = draft ?? initialName;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError("");
    const parsed = displayNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      nameInput.current?.focus();
      return;
    }
    submitting.current = true;
    setPending(true);
    try {
      const result = await onSave(parsed.data);
      if (!result.ok) setError(result.message);
      else {
        setDraft(null);
        onNotice("Display name saved");
      }
    } catch {
      setError("We couldn’t save your name. Check your connection and try again.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={save}>
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor="profile-display-name">Display name</FieldLabel>
        <Input
          id="profile-display-name"
          ref={nameInput}
          name="displayName"
          autoComplete="name"
          placeholder="Enter your name"
          required
          disabled={pending}
          aria-invalid={!!error}
          aria-describedby={`profile-name-help${error ? " profile-name-error" : ""}`}
          value={name}
          onChange={(event) => setDraft(event.target.value)}
        />
        <FieldDescription id="profile-name-help">
          The name shown in your Overview greeting and account menu.
        </FieldDescription>
        {error && (
          <FieldError id="profile-name-error" role="alert">
            {error}
          </FieldError>
        )}
      </Field>
      <Button type="submit" className="min-w-36 self-start" disabled={pending}>
        {pending ? <Spinner aria-hidden="true" /> : <Check aria-hidden="true" />}
        {pending ? "Saving…" : "Save name"}
      </Button>
    </form>
  );
}
