import { z } from "zod";

import type { ComboboxOption } from "@/components/forms/option-combobox";
import { projectOptions } from "@/components/forms/project-options";
import {
  ACTIVITY_KINDS,
  ACTIVITY_STATUSES,
  calendarEventInputSchema,
} from "@/features/activity-calendar";
import type { WorkspaceRole } from "@/features/workspace-access";
import {
  DEPLOYMENT_ENVIRONMENTS,
  DEPLOYMENT_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  STATUSES,
  TEST_STATUSES,
  TYPES,
  getDepartmentSection,
  moveIssue,
  runTest,
  updateProjects,
  type Workspace,
} from "@/lib/model";
import {
  modificationDatesProblem,
  saveModification,
  toModificationDate,
} from "@/lib/modifications";

import type { RecordType } from "./workspace-records";

type Values = Record<string, string>;
export type EditField = {
  name: string;
  label: string;
  kind: "text" | "textarea" | "date" | "time" | "number" | "options";
  options?: readonly ComboboxOption[];
  required?: boolean;
  timedOnly?: boolean;
};
export type RecordEdit = {
  initial: Values;
  fields: EditField[];
  apply(values: Values): Workspace;
};

const text = (
  name: string,
  label: string,
  kind: EditField["kind"] = "text",
  required = true,
): EditField => ({ name, label, kind, required });
const choice = (name: string, label: string, options: readonly string[]): EditField => ({
  name,
  label,
  kind: "options",
  options: options.map((value) => ({ value, label: value })),
});
const required = (label: string) => z.string().trim().min(1, `Enter ${label}.`);
const optional = z.string().trim();
const optionalDay = z.union([z.iso.date("Enter a valid date."), z.literal("")]);
const requiredDay = z.iso.date("Enter a valid date.");
const replace = <T extends { id: string }>(records: T[], record: T) =>
  records.map((entry) => (entry.id === record.id ? record : entry));

export function canEditRecord(role: WorkspaceRole, type: RecordType) {
  return role !== "developer" || type === "Test case";
}

export function createRecordEdit(
  workspace: Workspace,
  role: WorkspaceRole,
  type: RecordType,
  id: string,
): RecordEdit {
  if (!canEditRecord(role, type)) throw new Error("You don’t have edit access to this record.");
  const projects = workspace.projects ?? [];

  function projectField(id: string, name: string, emptyLabel = "No project"): EditField {
    const options = projectOptions(projects, { projectId: id, projectName: name });
    if (!id) options.unshift({ value: "", label: name ? `${name} (saved name)` : emptyLabel });
    return { name: "projectId", label: "Project", kind: "options", options };
  }

  function projectFor(value: string, current: string) {
    if (value === current) return undefined;
    const project = projects.find((entry) => entry.id === value);
    if (!project && value !== "") throw new Error("Select a project in this workspace.");
    return project;
  }

  if (type === "Project") {
    const record = projects.find((entry) => entry.id === id);
    if (record)
      return {
        initial: {
          name: record.name,
          department: getDepartmentSection(record),
          developer: record.developer,
          status: record.status ?? "Not Started",
        },
        fields: [
          text("name", "Project name"),
          text("department", "Department / Section"),
          text("developer", "Developer"),
          choice("status", "Status", PROJECT_STATUSES),
        ],
        apply: (values) => {
          const change = z
            .object({
              name: required("a project name"),
              department: required("a department or section"),
              developer: required("a developer"),
              status: z.enum(PROJECT_STATUSES),
            })
            .parse(values);
          const departmentChanged = values.department !== getDepartmentSection(record);
          return updateProjects(
            workspace,
            replace(projects, {
              ...record,
              ...change,
              department: departmentChanged ? change.department : record.department,
              section: departmentChanged ? undefined : record.section,
              status:
                values.status === (record.status ?? "Not Started") ? record.status : change.status,
            }),
          );
        },
      };
  }

  if (type === "Test case") {
    const record = workspace.tests.find((entry) => entry.id === id);
    if (record) {
      const remarks = text("developerRemarks", "Developer remarks", "textarea", false);
      if (role === "developer")
        return {
          initial: { developerRemarks: record.developerRemarks ?? "" },
          fields: [remarks],
          apply: (values) => ({
            ...workspace,
            tests: replace(workspace.tests, {
              ...record,
              developerRemarks: optional.parse(values.developerRemarks),
            }),
          }),
        };
      const projectId = record.projectId ?? "";
      return {
        initial: {
          projectId,
          suite: record.suite,
          steps: record.steps,
          expected: record.expected,
          developerRemarks: record.developerRemarks ?? "",
          status: record.status,
        },
        fields: [
          projectField(projectId, record.title),
          text("suite", "Module"),
          text("steps", "Test details", "textarea"),
          text("expected", "Expected result", "textarea"),
          remarks,
          choice("status", "Status", TEST_STATUSES),
        ],
        apply: (values) => {
          const {
            projectId: nextProjectId,
            status,
            ...fields
          } = z
            .object({
              projectId: z.string(),
              status: z.enum(TEST_STATUSES),
              suite: required("a module"),
              steps: required("test details"),
              expected: required("an expected result"),
              developerRemarks: optional,
            })
            .parse(values);
          const project = projectFor(nextProjectId, projectId);
          const next = {
            ...workspace,
            tests: replace(workspace.tests, {
              ...record,
              ...fields,
              developerRemarks:
                values.developerRemarks === (record.developerRemarks ?? "")
                  ? record.developerRemarks
                  : fields.developerRemarks,
              projectId: project?.id ?? record.projectId,
              title: project?.name ?? record.title,
            }),
          };
          return status === record.status ? next : runTest(next, id, status);
        },
      };
    }
  }

  if (type === "Modification") {
    const records = workspace.modifications ?? [];
    const record = records.find((entry) => entry.id === id);
    if (record)
      return {
        initial: {
          projectId: record.projectId,
          module: record.module,
          description: record.description,
          notes: record.notes,
          status: record.status,
          priority: record.priority,
          requestedAt: toModificationDate(record.requestedAt) ?? "",
          modifiedAt: toModificationDate(record.modifiedAt) ?? "",
        },
        fields: [
          projectField(record.projectId, record.projectName),
          text("module", "Module"),
          text("description", "Modification details", "textarea"),
          text("notes", "Remarks", "textarea", false),
          choice("priority", "Priority", PRIORITIES),
          choice("status", "Status", STATUSES),
          text("requestedAt", "Date requested", "date", false),
          text("modifiedAt", "Date modified", "date", false),
        ],
        apply: (values) => {
          const change = z
            .object({
              projectId: z.string(),
              module: required("a module"),
              description: required("modification details"),
              notes: optional,
              priority: z.enum(PRIORITIES),
              status: z.enum(STATUSES),
              requestedAt: optionalDay,
              modifiedAt: optionalDay,
            })
            .parse(values);
          const datesProblem = modificationDatesProblem(change.requestedAt, change.modifiedAt);
          if (datesProblem) throw new Error(datesProblem);
          const project = projectFor(change.projectId, record.projectId);
          return {
            ...workspace,
            modifications: saveModification(
              records,
              {
                ...record,
                ...change,
                projectName: project?.name ?? record.projectName,
                developer: project?.developer ?? record.developer,
                requestedAt:
                  values.requestedAt === (toModificationDate(record.requestedAt) ?? "")
                    ? record.requestedAt
                    : change.requestedAt || null,
                modifiedAt:
                  values.modifiedAt === (toModificationDate(record.modifiedAt) ?? "")
                    ? record.modifiedAt
                    : change.modifiedAt || null,
              },
              id,
            ),
          };
        },
      };
  }

  if (type === "Quest") {
    const record = workspace.issues.find((entry) => entry.id === id);
    if (record) {
      const projectId = record.projectId ?? "";
      return {
        initial: {
          projectId,
          description: record.description,
          status: record.status,
          priority: record.priority,
          type: record.type,
          xp: String(record.xp),
          labels: record.labels.join(", "),
        },
        fields: [
          projectField(projectId, record.title),
          text("description", "Description", "textarea", false),
          choice("status", "Status", STATUSES),
          choice("priority", "Priority", PRIORITIES),
          choice("type", "Quest type", TYPES),
          text("xp", "Reward (XP)", "number"),
          text("labels", "Labels (comma separated)", "text", false),
        ],
        apply: (values) => {
          const {
            projectId: nextProjectId,
            status,
            labels,
            ...change
          } = z
            .object({
              projectId: z.string(),
              description: optional,
              status: z.enum(STATUSES),
              priority: z.enum(PRIORITIES),
              type: z.enum(TYPES),
              labels: optional,
              xp: z
                .string()
                .regex(/^\d+$/, "Enter a whole number for XP.")
                .transform(Number)
                .pipe(z.number().int().min(0).max(1000, "XP must be 1,000 or less.")),
            })
            .parse(values);
          const project = projectFor(nextProjectId, projectId);
          const next = {
            ...workspace,
            issues: replace(workspace.issues, {
              ...record,
              ...change,
              projectId: project?.id ?? record.projectId,
              title: project?.name ?? record.title,
              assignee: project?.developer ?? record.assignee,
              labels: [
                ...new Set(
                  labels
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                ),
              ].slice(0, 5),
            }),
          };
          return status === record.status ? next : moveIssue(next, id, status);
        },
      };
    }
  }

  if (type === "Deployment") {
    const records = workspace.deployments ?? [];
    const record = records.find((entry) => entry.id === id);
    if (record)
      return {
        initial: {
          projectId: record.projectId,
          environment: record.environment,
          version: record.version,
          deploymentDate: record.deploymentDate,
          status: record.status,
          notes: record.notes,
        },
        fields: [
          projectField(record.projectId, record.projectName),
          choice("environment", "Environment", DEPLOYMENT_ENVIRONMENTS),
          text("version", "Version / Release"),
          text("deploymentDate", "Deployment date", "date"),
          choice("status", "Status", DEPLOYMENT_STATUSES),
          text("notes", "Notes", "textarea", false),
        ],
        apply: (values) => {
          const change = z
            .object({
              projectId: z.string(),
              environment: z.enum(DEPLOYMENT_ENVIRONMENTS),
              version: required("a release version"),
              deploymentDate: requiredDay,
              status: z.enum(DEPLOYMENT_STATUSES),
              notes: optional,
            })
            .parse(values);
          const project = projectFor(change.projectId, record.projectId);
          return {
            ...workspace,
            deployments: replace(records, {
              ...record,
              ...change,
              projectName: project?.name ?? record.projectName,
            }),
          };
        },
      };
  }

  if (type === "Activity") {
    const records = workspace.calendarEvents ?? [];
    const record = records.find((entry) => entry.id === id);
    if (record) {
      const projectId = projects.some((project) => project.id === record.projectId)
        ? record.projectId
        : "";
      const field = projectField("", "");
      return {
        initial: {
          projectId,
          title: record.title,
          kind: record.kind,
          status: record.status,
          startDate: record.startDate,
          endDate: record.endDate,
          startTime: record.startTime,
          endTime: record.endTime,
          timing: record.allDay ? "All day" : "Timed",
          location: record.location,
          notes: record.notes,
        },
        fields: [
          text("title", "Activity title"),
          field,
          choice("kind", "Activity type", ACTIVITY_KINDS),
          choice("status", "Status", ACTIVITY_STATUSES),
          choice("timing", "Timing", ["All day", "Timed"]),
          text("startDate", "Start date", "date"),
          text("endDate", "End date", "date"),
          { ...text("startTime", "Start time (Manila)", "time"), timedOnly: true },
          { ...text("endTime", "End time (Manila)", "time"), timedOnly: true },
          text("location", "Location", "text", false),
          text("notes", "Notes", "textarea", false),
        ],
        apply: (values) => {
          const allDay = values.timing === "All day";
          const change = calendarEventInputSchema.parse({
            ...values,
            allDay,
            startTime: allDay ? "" : values.startTime,
            endTime: allDay ? "" : values.endTime,
          });
          projectFor(change.projectId, projectId);
          return { ...workspace, calendarEvents: replace(records, { ...change, id }) };
        },
      };
    }
  }

  throw new Error("This record is no longer available.");
}
