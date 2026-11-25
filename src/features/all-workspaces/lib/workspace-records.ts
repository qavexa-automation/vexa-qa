import type { StatusPresentation } from "@/components/ui/status-badge";
import type { Attachment } from "@/features/attachments";
import { canOpenWorkspaceView, type WorkspaceRole } from "@/features/workspace-access";
import { formatDate } from "@/lib/dates";
import { getDepartmentSection, type Workspace } from "@/lib/model";
import type { SharedWorkspace } from "@/lib/relational-workspace";
import {
  activityStatusTone,
  deploymentStatusTone,
  projectStatusTone,
  statusTone,
  testStatusTone,
} from "@/lib/status-tones";

export type WorkspaceSource = SharedWorkspace & { role: WorkspaceRole; workspace: Workspace };

const recordViews = {
  Project: "Project Maintenance",
  "Test case": "Test lab",
  Modification: "Modification Tracker",
  Quest: "Quest board",
  Deployment: "Deployment Tracker",
  Activity: "Activity Calendar",
} as const;

export type RecordType = keyof typeof recordViews;
export const recordTypes = Object.keys(recordViews) as RecordType[];

export function workspaceRecordTypeForView(view: string): RecordType | undefined {
  return recordTypes.find((type) => recordViews[type] === view);
}

export type WorkspaceRecord = {
  key: string;
  id: string;
  owner: string;
  workspace: string;
  type: RecordType;
  name: string;
  project: string;
  module: string;
  status: StatusPresentation;
  fields: { label: string; value: string | null | undefined; date?: string }[];
  attachments?: Attachment[];
};

export function workspaceRecords(
  { owner, label, role, workspace }: WorkspaceSource,
  recordType?: RecordType,
) {
  const rows: WorkspaceRecord[] = [];
  const projects = new Map((workspace.projects ?? []).map((project) => [project.id, project.name]));
  const add = (
    type: RecordType,
    id: string,
    record: Omit<WorkspaceRecord, "key" | "id" | "owner" | "workspace" | "type" | "module"> & {
      module?: string;
    },
  ) => {
    if ((!recordType || type === recordType) && canOpenWorkspaceView(role, recordViews[type]))
      rows.push({
        module: "",
        ...record,
        key: JSON.stringify([owner, type, id]),
        id,
        owner,
        workspace: label,
        type,
      });
  };
  const day = (value: string | null | undefined) =>
    value && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) ? formatDate(value) : "";
  const dateField = (label: string, value: string | null | undefined) => ({
    label,
    value: day(value),
    date: value ?? "",
  });

  for (const project of workspace.projects ?? []) {
    const status = project.status ?? "Not Started";
    add("Project", project.id, {
      name: project.name,
      project: project.name,
      status: { label: status, tone: projectStatusTone(status) },
      fields: [
        { label: "Department / Section", value: getDepartmentSection(project) },
        { label: "Developer", value: project.developer },
      ],
    });
  }
  for (const test of workspace.tests) {
    add("Test case", test.id, {
      name: test.title,
      project: projects.get(test.projectId ?? "") ?? test.title,
      module: test.suite,
      status: { label: test.status, tone: testStatusTone(test.status) },
      fields: [
        { label: "Test case ID", value: test.id },
        { label: "Test details", value: test.steps },
        { label: "Expected result", value: test.expected },
        { label: "Developer remarks", value: test.developerRemarks },
      ],
      attachments: test.attachments,
    });
  }
  for (const modification of workspace.modifications ?? []) {
    add("Modification", modification.id, {
      name: modification.module || modification.projectName,
      project: projects.get(modification.projectId) ?? modification.projectName,
      module: modification.module,
      status: { label: modification.status, tone: statusTone(modification.status) },
      fields: [
        { label: "Description", value: modification.description },
        { label: "Remarks", value: modification.notes },
        { label: "Priority", value: modification.priority },
        { label: "Developer", value: modification.developer },
        dateField("Date requested", modification.requestedAt),
        dateField("Date modified", modification.modifiedAt),
      ],
      attachments: modification.attachments,
    });
  }
  for (const quest of workspace.issues) {
    add("Quest", quest.id, {
      name: quest.title,
      project: projects.get(quest.projectId ?? "") ?? "",
      status: { label: quest.status, tone: statusTone(quest.status) },
      fields: [
        { label: "Quest ID", value: quest.id },
        { label: "Description", value: quest.description },
        { label: "Type", value: quest.type },
        { label: "Priority", value: quest.priority },
        { label: "Assignee", value: quest.assignee },
        { label: "Labels", value: quest.labels.join(", ") },
      ],
    });
  }
  for (const deployment of workspace.deployments ?? []) {
    add("Deployment", deployment.id, {
      name: deployment.version || deployment.projectName,
      project: projects.get(deployment.projectId) ?? deployment.projectName,
      status: { label: deployment.status, tone: deploymentStatusTone(deployment.status) },
      fields: [
        { label: "Environment", value: deployment.environment },
        dateField("Deployment date", deployment.deploymentDate),
        { label: "Notes", value: deployment.notes },
      ],
    });
  }
  for (const event of workspace.calendarEvents ?? []) {
    add("Activity", event.id, {
      name: event.title,
      project: projects.get(event.projectId) ?? "",
      status: { label: event.status, tone: activityStatusTone(event.status) },
      fields: [
        { label: "Kind", value: event.kind },
        {
          label: "Start",
          value: [day(event.startDate), event.startTime].filter(Boolean).join(" "),
          date: event.startDate,
        },
        {
          label: "End",
          value: [day(event.endDate), event.endTime].filter(Boolean).join(" "),
          date: event.endDate,
        },
        { label: "Location", value: event.location },
        { label: "Notes", value: event.notes },
      ],
    });
  }
  return rows;
}
