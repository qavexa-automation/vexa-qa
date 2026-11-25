import { useContext, useRef, useState } from "react";
import { toast } from "sonner";

import { InlineStatusSelect } from "@/components/forms/inline-status-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { supabase } from "@/lib/supabase";

import { canChangeRecordStatus, changeRecordStatus, recordStatuses } from "../lib/record-status";
import { saveRecordEdit } from "../lib/save-record-edit";
import type { WorkspaceRecord } from "../lib/workspace-records";
import { WorkspaceRecordsContext } from "./workspace-record-context";

export function WorkspaceInlineStatus({ record }: { record: WorkspaceRecord }) {
  const context = useContext(WorkspaceRecordsContext);
  const source = context?.sources.get(record.owner);
  const saving = useRef(false);
  const [pending, setPending] = useState(false);
  const client = supabase;
  const { options, tone } = recordStatuses[record.type];

  async function save(status: string) {
    if (!client || !context || !source || saving.current) return;
    saving.current = true;
    setPending(true);
    try {
      const draft = changeRecordStatus(source, record, status);
      await saveRecordEdit(client, context.userId, source, draft);
      toast.success(`Status updated to ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save the status. Try again.");
    } finally {
      context.refresh();
      saving.current = false;
      setPending(false);
    }
  }

  if (!client || !source || !canChangeRecordStatus(source, record))
    return <StatusBadge {...record.status} />;

  return (
    <InlineStatusSelect
      disabled={pending}
      label={`Status for ${[record.name, record.module !== record.name && record.module, record.workspace]
        .filter(Boolean)
        .join(" · ")}`}
      onChange={(status) => void save(status)}
      options={options}
      tone={tone}
      value={record.status.label}
    />
  );
}
