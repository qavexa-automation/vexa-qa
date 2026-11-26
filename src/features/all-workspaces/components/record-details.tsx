import { useContext, useState, type ReactElement } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { IconButton } from "@/components/app-shell/icon-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Workspace } from "@/lib/model";
import { supabase } from "@/lib/supabase";

import { canEditRecord, createRecordEdit, type RecordEdit } from "../lib/record-edits";
import { saveRecordEdit } from "../lib/save-record-edit";
import type { WorkspaceRecord, WorkspaceSource } from "../lib/workspace-records";
import { RecordAttachments } from "./record-attachments";
import { RecordEditForm } from "./record-edit-form";
import { DeleteRecordAction } from "./delete-record-action";
import { WorkspaceInlineStatus } from "./workspace-inline-status";
import { WorkspaceRecordsContext } from "./workspace-record-context";

export function RecordDetails({
  record,
  showId = false,
  trigger,
  editTrigger = false,
}: {
  record: WorkspaceRecord;
  showId?: boolean;
  trigger?: ReactElement;
  editTrigger?: boolean;
}) {
  const context = useContext(WorkspaceRecordsContext);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<{ source: WorkspaceSource; edit: RecordEdit } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState(false);
  const client = supabase;
  const source = context?.sources.get(record.owner);

  function close() {
    setDirty(false);
    setDiscard(false);
    setEditing(null);
    setOpen(false);
  }

  function requestClose() {
    if (pending) return;
    if (dirty) setDiscard(true);
    else close();
  }

  function beginEdit() {
    if (!source) return false;
    try {
      setEditing({
        source,
        edit: createRecordEdit(source.workspace, source.role, record.type, record.id),
      });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to open this editor.");
      return false;
    }
  }

  async function save(draft: Workspace) {
    if (!client || !context || !editing) throw new Error("Sign in again before saving.");
    setPending(true);
    try {
      await saveRecordEdit(client, context.userId, editing.source, draft);
      context.refresh();
      close();
      toast.success("Record saved");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
        else if (!editTrigger || beginEdit()) setOpen(true);
      }}
    >
      {editTrigger ? (
        <IconButton
          ariaLabel={`${source?.role === "developer" ? "Edit developer remarks" : `Edit ${record.type.toLowerCase()}`}: ${record.name} · ${record.workspace}`}
          icon={Pencil}
          label={
            source?.role === "developer"
              ? "Edit developer remarks"
              : `Edit ${record.type.toLowerCase()}`
          }
          render={(button) => <DialogTrigger render={button} />}
          type="button"
        />
      ) : trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger
          render={
            <Button
              aria-label={`View ${record.type.toLowerCase()} details for ${record.name}${record.module ? `, ${record.module}` : ""} in ${record.workspace}`}
              className="h-auto max-w-full flex-col items-start gap-0 p-0 text-left md:max-w-56"
              type="button"
              variant="link"
            />
          }
        >
          {showId && (
            <span className="max-w-full truncate font-mono text-xs text-muted-foreground">
              {record.id}
            </span>
          )}
          <span className="max-w-full truncate" title={record.name}>
            {record.name || record.type}
          </span>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle className="wrap-anywhere">
            {editing ? `Edit ${record.type.toLowerCase()}` : record.name || record.type}
          </DialogTitle>
          <DialogDescription>
            {record.type} · {record.workspace}
          </DialogDescription>
        </DialogHeader>
        {editing ? (
          <RecordEditForm
            edit={editing.edit}
            onCancel={requestClose}
            onDirty={setDirty}
            onSave={save}
            pending={pending}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <WorkspaceInlineStatus record={record} />
              {source && canEditRecord(source.role, record.type) && (
                <Button onClick={beginEdit} type="button" variant="outline">
                  <Pencil aria-hidden="true" />
                  {source.role === "developer" ? "Edit developer remarks" : "Edit record"}
                </Button>
              )}
            </div>
            <dl className="grid gap-3">
              {[
                { label: "Project", value: record.project },
                { label: "Module", value: record.module },
                ...record.fields,
              ]
                .filter(({ value }) => value?.trim())
                .map(({ label, value }) => (
                  <div key={label}>
                    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap wrap-anywhere">{value}</dd>
                  </div>
                ))}
            </dl>
            {(record.type === "Test case" || record.type === "Modification") && (
              <RecordAttachments record={record} />
            )}
            <DeleteRecordAction record={record} onDeleted={close} />
          </>
        )}
        <ConfirmDialog
          open={discard}
          title="Discard unsaved changes?"
          description="Your edits to this record will be lost."
          confirmLabel="Discard changes"
          onCancel={() => setDiscard(false)}
          onConfirm={close}
        />
      </DialogContent>
    </Dialog>
  );
}
