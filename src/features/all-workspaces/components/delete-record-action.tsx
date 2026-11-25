import { useContext, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { IconButton } from "@/components/app-shell/icon-button";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

import { canDeleteRecord, deleteWorkspaceRecord } from "../lib/delete-record";
import type { WorkspaceRecord, WorkspaceSource } from "../lib/workspace-records";
import { WorkspaceRecordsContext } from "./workspace-record-context";

export function DeleteRecordAction({
  record,
  compact = false,
  onDeleted,
}: {
  record: WorkspaceRecord;
  compact?: boolean;
  onDeleted?: () => void;
}) {
  const context = useContext(WorkspaceRecordsContext);
  const source = context?.sources.get(record.owner);
  const [target, setTarget] = useState<{ source: WorkspaceSource; record: WorkspaceRecord } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const deleting = useRef(false);
  if (!target && (!source || !canDeleteRecord(source.role))) return null;
  const noun = record.type.toLowerCase();
  const label = `Delete ${noun}`;

  function open() {
    if (!source || !canDeleteRecord(source.role)) return;
    setError("");
    setTarget({ source, record });
  }

  async function confirm() {
    if (!target || !context || !supabase || deleting.current) return;
    deleting.current = true;
    setPending(true);
    setError("");
    try {
      const warning = await deleteWorkspaceRecord(
        supabase,
        context.userId,
        target.source,
        target.record,
      );
      setTarget(null);
      onDeleted?.();
      if (warning) toast.warning(warning);
      else toast.success(`${target.record.type} deleted`);
      context.refresh();
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : "Unable to delete this record. Try again.",
      );
    } finally {
      deleting.current = false;
      setPending(false);
    }
  }

  return (
    <>
      {compact ? (
        <IconButton
          ariaLabel={`${label}: ${record.name} · ${record.workspace}`}
          destructive
          disabled={pending}
          icon={Trash2}
          label={label}
          onClick={open}
          type="button"
        />
      ) : (
        <Button
          className="justify-self-end"
          disabled={pending}
          onClick={open}
          type="button"
          variant="destructive"
        >
          <Trash2 aria-hidden="true" /> {label}
        </Button>
      )}
      <ConfirmDialog
        open={!!target}
        title={`${label}?`}
        description={
          target
            ? `“${target.record.name}” will be removed from ${target.source.label}.${target.record.type === "Project" ? " Linked records will keep their history." : target.record.attachments?.length ? " Attached files will also be deleted." : ""}`
            : ""
        }
        confirmLabel={label}
        error={error}
        pending={pending}
        onCancel={() => setTarget(null)}
        onConfirm={() => void confirm()}
      />
    </>
  );
}
