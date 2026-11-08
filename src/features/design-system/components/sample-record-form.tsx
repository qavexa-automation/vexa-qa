"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxSearch,
  ComboboxSelectTrigger,
} from "@/components/ui/combobox";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  sampleRecordSchema,
  type SampleRecordValues,
} from "@/features/design-system/schemas/sample-record-schema";

const owners = ["Design", "Engineering", "Operations", "Support"];

export function SampleRecordForm() {
  const form = useForm<SampleRecordValues>({
    resolver: zodResolver(sampleRecordSchema),
    defaultValues: { name: "", code: "", owner: "", notes: "", notifications: true, active: true },
  });

  async function onSubmit(values: SampleRecordValues) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    toast.success(`${values.name} saved.`);
    form.reset(values);
  }

  return (
    <form method="post" className="max-w-2xl space-y-6" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        <div className="grid items-start gap-4 @2xl:grid-cols-2">
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel htmlFor="sample-name">Name</FieldLabel>
            <Input
              aria-invalid={!!form.formState.errors.name}
              id="sample-name"
              placeholder="Quarterly review"
              {...form.register("name")}
            />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>
          <Field data-invalid={!!form.formState.errors.code}>
            <FieldLabel htmlFor="sample-code">Code</FieldLabel>
            <Input
              aria-invalid={!!form.formState.errors.code}
              className="font-mono"
              id="sample-code"
              placeholder="REC-20841"
              {...form.register("code")}
            />
            <FieldError errors={[form.formState.errors.code]} />
          </Field>
        </div>

        <Controller
          control={form.control}
          name="owner"
          render={({ field, fieldState }) => (
            <Field data-invalid={!!fieldState.error}>
              <FieldLabel htmlFor="sample-owner">Owner</FieldLabel>
              <Combobox
                items={owners}
                onValueChange={(value) => field.onChange(value ?? "")}
                value={field.value || null}
              >
                <ComboboxSelectTrigger id="sample-owner" placeholder="Select owner" />
                <ComboboxContent>
                  <ComboboxSearch />
                  <ComboboxEmpty>No owners found.</ComboboxEmpty>
                  <ComboboxList>
                    {(owner) => <ComboboxItem key={owner} value={owner}>{owner}</ComboboxItem>}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <FieldDescription>Comboboxes keep hidden choices searchable and keyboard accessible.</FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Field>
          <FieldLabel htmlFor="sample-notes">Notes (optional)</FieldLabel>
          <Textarea id="sample-notes" placeholder="Add useful context" rows={3} {...form.register("notes")} />
          <FieldError errors={[form.formState.errors.notes]} />
        </Field>

        <Controller
          control={form.control}
          name="notifications"
          render={({ field }) => (
            <Field orientation="horizontal">
              <Checkbox checked={field.value} id="sample-notifications" onCheckedChange={field.onChange} />
              <FieldLabel className="font-normal" htmlFor="sample-notifications">Send update notifications</FieldLabel>
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="active"
          render={({ field }) => (
            <Field className="justify-between gap-4" orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor="sample-active">Active</FieldLabel>
                <FieldDescription>A switch is for a state that takes effect on its own, such as a scheduled job.</FieldDescription>
              </FieldContent>
              <Switch checked={field.value} id="sample-active" onCheckedChange={field.onChange} />
            </Field>
          )}
        />
      </FieldGroup>

      <div className="flex gap-2">
        <Button disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? <Spinner /> : null}Save record
        </Button>
        <Button onClick={() => form.reset()} type="button" variant="ghost">Reset</Button>
      </div>
    </form>
  );
}
