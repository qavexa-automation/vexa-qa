import type { StatusTone } from "@/components/ui/status-badge";
import { ACTIVITY_STATUSES } from "@/features/activity-calendar";
import {
  DEPLOYMENT_STATUSES,
  PROJECT_STATUSES,
  STATUSES,
  TEST_STATUSES,
  moveIssue,
  runTest,
} from "@/lib/model";
import {
  activityStatusTone,
  deploymentStatusTone,
  projectStatusTone,
  statusTone,
  testStatusTone,
} from "@/lib/status-tones";

import type { RecordType, WorkspaceRecord, WorkspaceSource } from "./workspace-records";

function choices<T extends string>(options: readonly T[], tone: (value: T) => StatusTone) {
  const tones = new Map<string, StatusTone>(options.map((option) => [option, tone(option)]));
  return { options, tone: (value: string) => tones.get(value) ?? "neutral" };
}

const questStatuses = choices(STATUSES, statusTone);
export const recordStatuses = {
  Project: choices(PROJECT_STATUSES, projectStatusTone),
  "Test case": choices(TEST_STATUSES, testStatusTone),
  Modification: questStatuses,
  Quest: questStatuses,
  Deployment: choices(DEPLOYMENT_STATUSES, deploymentStatusTone),
  Activity: choices(ACTIVITY_STATUSES, activityStatusTone),
} satisfies Record<RecordType, { options: readonly string[]; tone: (value: string) => StatusTone }>;

export function canChangeRecordStatus(source: WorkspaceSource, record: WorkspaceRecord) {
  return source.owner === record.owner && source.role !== "developer";
}

export function changeRecordStatus(
  source: WorkspaceSource,
  record: WorkspaceRecord,
  value: string,
) {
  if (!canChangeRecordStatus(source, record))
    throw new Error("You don’t have access to change this status.");

  const { workspace } = source;
  const { id, type } = record;

  function selectedStatus<T extends string>(options: readonly T[]): T {
    const status = options.find((option) => option === value);
    if (!status) throw new Error("Select a valid status.");
    return status;
  }

  function requireRecord(records: readonly { id: string }[]) {
    if (!records.some((entry) => entry.id === id))
      throw new Error("This record is no longer available.");
  }

  function replaceStatus<T extends { id: string; status?: string }>(
    records: T[],
    status: T["status"],
  ) {
    requireRecord(records);
    return records.map((entry) => (entry.id === id ? { ...entry, status } : entry));
  }

  switch (type) {
    case "Project":
      return {
        ...workspace,
        projects: replaceStatus(workspace.projects ?? [], selectedStatus(PROJECT_STATUSES)),
      };
    case "Test case":
      requireRecord(workspace.tests);
      return runTest(workspace, id, selectedStatus(TEST_STATUSES));
    case "Modification":
      return {
        ...workspace,
        modifications: replaceStatus(workspace.modifications ?? [], selectedStatus(STATUSES)),
      };
    case "Quest":
      requireRecord(workspace.issues);
      return moveIssue(workspace, id, selectedStatus(STATUSES));
    case "Deployment":
      return {
        ...workspace,
        deployments: replaceStatus(workspace.deployments ?? [], selectedStatus(DEPLOYMENT_STATUSES)),
      };
    case "Activity":
      return {
        ...workspace,
        calendarEvents: replaceStatus(workspace.calendarEvents ?? [], selectedStatus(ACTIVITY_STATUSES)),
      };
  }
}
