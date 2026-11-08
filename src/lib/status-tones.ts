import type { StatusTone } from "@/components/ui/status-badge";
import {
  DEPLOYMENT_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  STATUSES,
  TEST_STATUSES,
  type Deployment,
  type Priority,
  type ProjectStatus,
  type Status,
  type TestCase,
} from "./model";

// Each workspace status maps onto one shared tone (DESIGN.md, "Status"). The label always
// accompanies the tone, so color never carries the meaning alone.
const statusTones: Record<Status, StatusTone> = {
  Backlog: "neutral",
  "In progress": "info",
  "In review": "attention",
  Completed: "positive",
};
const priorityTones: Record<Priority, StatusTone> = {
  Critical: "critical",
  High: "attention",
  Medium: "info",
  Low: "neutral",
};
const testTones: Record<TestCase["status"], StatusTone> = {
  Passed: "positive",
  Failed: "critical",
  "Not Applicable": "neutral",
  "Not Tested": "neutral",
};
const deploymentTones: Record<Deployment["status"], StatusTone> = {
  Planned: "neutral",
  "In progress": "info",
  Deployed: "positive",
  Failed: "critical",
  "Rolled back": "attention",
};
const projectTones: Record<ProjectStatus, StatusTone> = {
  "Not Started": "neutral",
  "Requirements Gathering": "info",
  "Analysis & Design": "info",
  "In Development": "info",
  "For QA Testing": "attention",
  "For UAT": "attention",
  "For Deployment": "attention",
  Deployed: "positive",
  "On Hold": "attention",
  Cancelled: "neutral",
};

export const statusTone = (status: Status) => statusTones[status];
export const priorityTone = (priority: Priority) => priorityTones[priority];
export const testStatusTone = (status: TestCase["status"]) => testTones[status];
export const deploymentStatusTone = (status: Deployment["status"]) => deploymentTones[status];
export const projectStatusTone = (status: ProjectStatus) => projectTones[status];
export const projectStatusRank = (status: ProjectStatus) => PROJECT_STATUSES.indexOf(status);

// Workflow order for sorting: Critical first, Backlog before Completed, and so on.
export const priorityRank = (priority: Priority) => PRIORITIES.indexOf(priority);
export const statusRank = (status: Status) => STATUSES.indexOf(status);
export const testStatusRank = (status: TestCase["status"]) => TEST_STATUSES.indexOf(status);
export const deploymentStatusRank = (status: Deployment["status"]) =>
  DEPLOYMENT_STATUSES.indexOf(status);
