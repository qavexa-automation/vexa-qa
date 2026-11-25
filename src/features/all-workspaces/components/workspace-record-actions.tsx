import { useContext } from "react";

import { RowActions } from "@/components/data-table/row-actions";

import { canEditRecord } from "../lib/record-edits";
import type { WorkspaceRecord } from "../lib/workspace-records";
import { DeleteRecordAction } from "./delete-record-action";
import { RecordDetails } from "./record-details";
import { WorkspaceRecordsContext } from "./workspace-record-context";

export function WorkspaceRecordActions({
  record,
  revealOnHover,
}: {
  record: WorkspaceRecord;
  revealOnHover?: boolean;
}) {
  const source = useContext(WorkspaceRecordsContext)?.sources.get(record.owner);
  if (!source || !canEditRecord(source.role, record.type)) return null;
  return (
    <RowActions revealOnHover={revealOnHover} subject={`${record.name} · ${record.workspace}`}>
      <RecordDetails record={record} editTrigger />
      <DeleteRecordAction record={record} compact />
    </RowActions>
  );
}
