import { modificationXp } from "./modification-quests";
import { toModificationDate } from "./modifications";
import { calendarEventSchema } from "@/features/activity-calendar/schemas/calendar-event-schema";
import type { CalendarEvent } from "@/features/activity-calendar/types/calendar-event";
import { attachmentSchema } from "@/features/attachments/schemas/attachment-schema";
import type { Attachment } from "@/features/attachments/types/attachment";

export const STATUSES = ["Backlog", "In progress", "In review", "Completed"] as const;
export const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
export const TYPES = ["Bug", "Task", "Story"] as const;
export const TEST_STATUSES = ["Passed", "Failed", "Not Applicable", "Not Tested"] as const;
export const PROJECT_STATUSES = [
  "Not Started",
  "Requirements Gathering",
  "Analysis & Design",
  "In Development",
  "For QA Testing",
  "For UAT",
  "For Deployment",
  "Deployed",
  "On Hold",
  "Cancelled",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const DEPLOYMENT_ENVIRONMENTS = ["Development", "Staging", "Production"] as const;
export const DEPLOYMENT_STATUSES = [
  "Planned",
  "In progress",
  "Deployed",
  "Failed",
  "Rolled back",
] as const;
export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type IssueType = (typeof TYPES)[number];
export type Issue = {
  id: string;
  title: string;
  projectId?: string;
  description: string;
  status: Status;
  priority: Priority;
  type: IssueType;
  assignee: string;
  xp: number;
  labels: string[];
  createdAt: string;
};
export type TestCase = {
  id: string;
  title: string;
  projectId?: string;
  suite: string;
  steps: string;
  expected: string;
  status: (typeof TEST_STATUSES)[number];
  lastRun: string | null;
};
export type Activity = {
  id: string;
  text: string;
  date: string;
  kind: "issue" | "test" | "achievement";
};
export type Project = {
  id: string;
  name: string;
  department: string;
  // Retained for records saved before Department/Section became one field.
  section?: string;
  developer: string;
  /** Older saved projects default to Not Started. */
  status?: ProjectStatus;
};
export type Deployment = {
  id: string;
  projectId: string;
  projectName: string;
  environment: (typeof DEPLOYMENT_ENVIRONMENTS)[number];
  version: string;
  deploymentDate: string;
  status: (typeof DEPLOYMENT_STATUSES)[number];
  notes: string;
};
export type Modification = {
  id: string;
  projectId: string;
  projectName: string;
  module: string;
  description: string;
  priority: Priority;
  status: Status;
  developer: string;
  notes: string;
  requestedAt?: string | null;
  modifiedAt?: string | null;
  /** Files attached to the record; absent on records saved before attachments existed. */
  attachments?: Attachment[];
};
export function getDepartmentSection(project: Pick<Project, "department" | "section">): string {
  const department = project.department.trim();
  const section = project.section?.trim() ?? "";
  if (!department) return section;
  if (!section || department.toLowerCase() === section.toLowerCase()) return department;
  return `${department} / ${section}`;
}
export type Workspace = {
  calendarEvents?: CalendarEvent[];
  projects?: Project[];
  deployments?: Deployment[];
  modifications?: Modification[];
  issues: Issue[];
  tests: TestCase[];
  activity: Activity[];
  sprint: string;
  sprintGoal: string;
};
export function updateProjects(workspace: Workspace, projects: Project[]): Workspace {
  return {
    ...workspace,
    projects,
    issues: workspace.issues.map((issue) => {
      const project = projects.find((entry) => entry.id === issue.projectId);
      return project && (project.name !== issue.title || project.developer !== issue.assignee)
        ? { ...issue, title: project.name, assignee: project.developer }
        : issue;
    }),
    modifications: workspace.modifications?.map((modification) => {
      const project = projects.find((entry) => entry.id === modification.projectId);
      return project && project.name !== modification.projectName
        ? { ...modification, projectName: project.name }
        : modification;
    }),
    deployments: workspace.deployments?.map((deployment) => {
      const project = projects.find((entry) => entry.id === deployment.projectId);
      return project && project.name !== deployment.projectName
        ? { ...deployment, projectName: project.name }
        : deployment;
    }),
    tests: workspace.tests.map((test) => {
      const project = projects.find((entry) => entry.id === test.projectId);
      return project && project.name !== test.title ? { ...test, title: project.name } : test;
    }),
  };
}
export function filterTestsByProject(
  tests: TestCase[],
  projects: Project[],
  projectId: string,
): TestCase[] {
  return filterByProject(tests, projects, projectId);
}
export function filterIssuesByProject(
  issues: Issue[],
  projects: Project[],
  projectId: string,
): Issue[] {
  return filterByProject(issues, projects, projectId);
}
function filterByProject<T extends { projectId?: string; title: string }>(
  records: T[],
  projects: Project[],
  projectId: string,
): T[] {
  if (!projectId) return records;
  return records.filter((record) => {
    const linkedProject = record.projectId
      ? projects.find((project) => project.id === record.projectId)
      : undefined;
    const legacyMatches = !record.projectId
      ? projects.filter((project) => project.name === record.title)
      : [];
    const resolvedId =
      linkedProject?.id ?? (legacyMatches.length === 1 ? legacyMatches[0].id : undefined);
    return resolvedId === projectId;
  });
}
export function metrics(workspace: Workspace) {
  const done = workspace.issues.filter((i) => i.status === "Completed");
  const run = workspace.tests.filter((t) => t.status === "Passed" || t.status === "Failed");
  const passed = run.filter((t) => t.status === "Passed").length;
  return {
    total: workspace.issues.length,
    done: done.length,
    progress: workspace.issues.length
      ? Math.round((done.length / workspace.issues.length) * 100)
      : 0,
    bugs: workspace.issues.filter((i) => i.type === "Bug" && i.status !== "Completed").length,
    critical: workspace.issues.filter((i) => i.priority === "Critical" && i.status !== "Completed")
      .length,
    passRate: run.length ? Math.round((passed / run.length) * 100) : 0,
    passed,
    run: run.length,
    // Modifications earn XP by status on the Quest Board (see modification-quests.ts).
    xp: done.reduce((sum, issue) => sum + issue.xp, 0) + modificationXp(workspace.modifications),
  };
}
export function deleteTest(workspace: Workspace, id: string): Workspace {
  if (!workspace.tests.some((test) => test.id === id)) return workspace;
  return {
    ...workspace,
    tests: workspace.tests.filter((test) => test.id !== id),
    activity: [
      {
        id: crypto.randomUUID(),
        text: `${id} deleted`,
        date: new Date().toISOString(),
        kind: "test" as const,
      },
      ...workspace.activity,
    ].slice(0, 40),
  };
}
export function moveIssue(workspace: Workspace, id: string, status: Status): Workspace {
  const issue = workspace.issues.find((i) => i.id === id);
  if (!issue || issue.status === status) return workspace;
  return {
    ...workspace,
    issues: workspace.issues.map((i) => (i.id === id ? { ...i, status } : i)),
    activity: [
      {
        id: crypto.randomUUID(),
        text: `${id} moved to ${status}${status === "Completed" ? ` · ${issue.xp} XP earned` : ""}`,
        date: new Date().toISOString(),
        kind: "issue" as const,
      },
      ...workspace.activity,
    ].slice(0, 40),
  };
}
export function runTest(workspace: Workspace, id: string, status: TestCase["status"]): Workspace {
  const test = workspace.tests.find((t) => t.id === id);
  const executed = status === "Passed" || status === "Failed";
  if (!test || (!executed && test.status === status)) return workspace;
  const date = new Date().toISOString();
  return {
    ...workspace,
    tests: workspace.tests.map((t) =>
      t.id === id ? { ...t, status, lastRun: executed ? date : null } : t,
    ),
    activity: [
      {
        id: crypto.randomUUID(),
        text: `${id} ${status === "Not Tested" ? "reset to Not Tested" : status.toLowerCase()}: ${test.title}`,
        date,
        kind: "test" as const,
      },
      ...workspace.activity,
    ].slice(0, 40),
  };
}
export function isWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== "object") return false;
  const data = value as Workspace;
  return (
    typeof data.sprint === "string" &&
    typeof data.sprintGoal === "string" &&
    (data.calendarEvents === undefined ||
      (Array.isArray(data.calendarEvents) &&
        data.calendarEvents.every((event) => calendarEventSchema.safeParse(event).success))) &&
    (data.modifications === undefined ||
      (Array.isArray(data.modifications) &&
        data.modifications.every(
          (modification) =>
            modification &&
            typeof modification.id === "string" &&
            typeof modification.projectId === "string" &&
            typeof modification.projectName === "string" &&
            typeof modification.module === "string" &&
            typeof modification.description === "string" &&
            PRIORITIES.includes(modification.priority) &&
            STATUSES.includes(modification.status) &&
            typeof modification.developer === "string" &&
            typeof modification.notes === "string" &&
            (modification.requestedAt == null ||
              (typeof modification.requestedAt === "string" &&
                Number.isFinite(Date.parse(modification.requestedAt)))) &&
            (modification.modifiedAt == null ||
              (typeof modification.modifiedAt === "string" &&
                Number.isFinite(Date.parse(modification.modifiedAt)))) &&
            (modification.attachments === undefined ||
              (Array.isArray(modification.attachments) &&
                modification.attachments.every(
                  (attachment) => attachmentSchema.safeParse(attachment).success,
                ))),
        ))) &&
    (data.deployments === undefined ||
      (Array.isArray(data.deployments) &&
        data.deployments.every(
          (deployment) =>
            deployment &&
            typeof deployment.id === "string" &&
            typeof deployment.projectId === "string" &&
            typeof deployment.projectName === "string" &&
            DEPLOYMENT_ENVIRONMENTS.includes(deployment.environment) &&
            typeof deployment.version === "string" &&
            typeof deployment.deploymentDate === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(deployment.deploymentDate) &&
            DEPLOYMENT_STATUSES.includes(deployment.status) &&
            typeof deployment.notes === "string",
        ))) &&
    (data.projects === undefined ||
      (Array.isArray(data.projects) &&
        data.projects.every(
          (project) =>
            project &&
            typeof project.id === "string" &&
            typeof project.name === "string" &&
            typeof project.department === "string" &&
            (project.section === undefined || typeof project.section === "string") &&
            typeof project.developer === "string" &&
            (project.status === undefined || PROJECT_STATUSES.includes(project.status)),
        ))) &&
    Array.isArray(data.issues) &&
    data.issues.every(
      (i) =>
        i &&
        typeof i.id === "string" &&
        typeof i.title === "string" &&
        (i.projectId === undefined || typeof i.projectId === "string") &&
        typeof i.description === "string" &&
        STATUSES.includes(i.status) &&
        PRIORITIES.includes(i.priority) &&
        TYPES.includes(i.type) &&
        typeof i.assignee === "string" &&
        Number.isFinite(i.xp) &&
        i.xp >= 0 &&
        Array.isArray(i.labels) &&
        i.labels.every((l) => typeof l === "string") &&
        typeof i.createdAt === "string",
    ) &&
    Array.isArray(data.tests) &&
    data.tests.every(
      (t) =>
        t &&
        typeof t.id === "string" &&
        typeof t.title === "string" &&
        (t.projectId === undefined || typeof t.projectId === "string") &&
        typeof t.suite === "string" &&
        typeof t.steps === "string" &&
        typeof t.expected === "string" &&
        TEST_STATUSES.includes(t.status) &&
        (t.lastRun === null || typeof t.lastRun === "string"),
    ) &&
    Array.isArray(data.activity) &&
    data.activity.every(
      (a) =>
        a &&
        typeof a.id === "string" &&
        typeof a.text === "string" &&
        typeof a.date === "string" &&
        ["issue", "test", "achievement"].includes(a.kind),
    )
  );
}
export function emptyWorkspace(): Workspace {
  return {
    calendarEvents: [],
    projects: [],
    deployments: [],
    modifications: [],
    issues: [],
    tests: [],
    activity: [],
    sprint: "Sprint 01",
    sprintGoal: "Ship something worth celebrating.",
  };
}
// The final status was called "Done" before it became "Completed".
function renameDone(records: unknown) {
  if (!Array.isArray(records)) return records;
  return records.map((record: unknown) =>
    record && typeof record === "object" && "status" in record && record.status === "Done"
      ? { ...record, status: "Completed" }
      : record,
  );
}
export function parseWorkspace(value: unknown): Workspace | null {
  if (!value || typeof value !== "object") return null;
  const stored = value as Record<string, unknown>;
  const candidate = {
    ...stored,
    tests: Array.isArray(stored.tests)
      ? stored.tests.map((test: unknown) => {
          if (test && typeof test === "object" && "status" in test && test.status === "Not run") {
            return { ...test, status: "Not Tested", lastRun: null };
          }
          return test;
        })
      : stored.tests,
    issues: renameDone(stored.issues),
    modifications: renameDone(stored.modifications),
  };
  if (!isWorkspace(candidate)) return null;
  return candidate.modifications
    ? {
        ...candidate,
        // Only dates a record carries are normalized; absent ones stay absent.
        modifications: candidate.modifications.map((modification) => ({
          ...modification,
          ...(modification.requestedAt !== undefined && {
            requestedAt: toModificationDate(modification.requestedAt),
          }),
          ...(modification.modifiedAt !== undefined && {
            modifiedAt: toModificationDate(modification.modifiedAt),
          }),
        })),
      }
    : candidate;
}
