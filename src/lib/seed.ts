import type { Issue, Workspace } from "./model";
const date = "2026-10-26T08:00:00.000Z";
const demoTestTitles: Record<string, string> = {
  "TC-101": "Complete checkout with a saved card",
  "TC-102": "Apply a valid promotional code",
  "TC-103": "Sign in with valid credentials",
  "TC-104": "Reset password through email",
  "TC-105": "Find products by keyword",
  "TC-106": "Navigate with keyboard only",
  "TC-107": "Check mobile product layout",
  "TC-108": "Upload a profile image",
  "TC-109": "Prevent duplicate order submissions",
  "TC-110": "Recover from a network timeout",
};

export function removeDemoTestCases(workspace: Workspace): Workspace {
  const tests = workspace.tests.filter(
    (test) => test.projectId || demoTestTitles[test.id] !== test.title,
  );
  const activity = workspace.activity.filter(
    (event) =>
      !(
        event.id === "a2" &&
        event.kind === "test" &&
        event.text === "Jamie passed the duplicate order test"
      ),
  );
  return tests.length === workspace.tests.length && activity.length === workspace.activity.length
    ? workspace
    : { ...workspace, tests, activity };
}
export function removeUntouchedDemoData(workspace: Workspace): Workspace {
  const cleaned = removeDemoTestCases(workspace);
  const original = demoWorkspace();
  const issues = cleaned.issues.filter((issue) => {
    if (issue.projectId) return true;
    const sample = original.issues.find((entry) => entry.id === issue.id);
    if (!sample) return true;
    return !(Object.keys(sample) as (keyof Issue)[]).every(
      (key) => JSON.stringify(issue[key]) === JSON.stringify(sample[key]),
    );
  });
  const activity = cleaned.activity.filter(
    (event) =>
      !original.activity.some(
        (sample) =>
          sample.id === event.id &&
          sample.text === event.text &&
          sample.kind === event.kind &&
          sample.date === event.date,
      ),
  );
  const resetSprint =
    cleaned.sprint === original.sprint && cleaned.sprintGoal === original.sprintGoal;
  if (
    issues.length === cleaned.issues.length &&
    activity.length === cleaned.activity.length &&
    !resetSprint
  )
    return cleaned;
  return {
    ...cleaned,
    issues,
    activity,
    ...(resetSprint
      ? { sprint: "Sprint 01", sprintGoal: "Ship something worth celebrating." }
      : {}),
  };
}
const issue = (
  id: number,
  title: string,
  status: Issue["status"],
  priority: Issue["priority"],
  type: Issue["type"],
  assignee: string,
  xp: number,
  labels: string[],
): Issue => ({
  id: `VXA-${id}`,
  title,
  status,
  priority,
  type,
  assignee,
  xp,
  labels,
  createdAt: date,
  description: `Validate and resolve: ${title}.\n\nReproduce the behavior in the staging environment. Document the result, add regression coverage, and move this quest to review when ready.`,
});
export function demoWorkspace(): Workspace {
  return {
    sprint: "Sprint 08",
    sprintGoal: "A smoother checkout. A stronger release.",
    issues: [
      issue(
        1042,
        "Payment fails with saved cards",
        "In progress",
        "Critical",
        "Bug",
        "Alex Morgan",
        150,
        ["Payments", "Checkout"],
      ),
      issue(
        1043,
        "Add checkout regression suite",
        "In progress",
        "High",
        "Task",
        "Jamie Chen",
        100,
        ["Automation"],
      ),
      issue(
        1044,
        "Cart total ignores promo discount",
        "Backlog",
        "High",
        "Bug",
        "Sam Rivera",
        100,
        ["Checkout"],
      ),
      issue(
        1045,
        "Verify mobile onboarding flow",
        "In review",
        "Medium",
        "Story",
        "Taylor Brooks",
        75,
        ["Mobile", "UX"],
      ),
      issue(
        1046,
        "Search results flash on page load",
        "Backlog",
        "Medium",
        "Bug",
        "Alex Morgan",
        75,
        ["Frontend"],
      ),
      issue(1047, "Write API contract tests", "In progress", "High", "Task", "Jamie Chen", 100, [
        "API",
        "Automation",
      ]),
      issue(1048, "Update password reset copy", "In review", "Low", "Task", "Sam Rivera", 50, [
        "Auth",
      ]),
      issue(1049, "Fix session expiry redirect", "Done", "High", "Bug", "Alex Morgan", 100, [
        "Auth",
      ]),
      issue(
        1050,
        "Validate product image uploads",
        "Done",
        "Medium",
        "Story",
        "Taylor Brooks",
        75,
        ["Media"],
      ),
      issue(1051, "Cover empty-cart edge cases", "Done", "Medium", "Task", "Jamie Chen", 75, [
        "Checkout",
      ]),
      issue(1052, "Resolve duplicate order emails", "Done", "High", "Bug", "Sam Rivera", 100, [
        "Notifications",
      ]),
      issue(1053, "Verify keyboard navigation", "Done", "Medium", "Story", "Alex Morgan", 75, [
        "Accessibility",
      ]),
      issue(1054, "Test currency rounding", "Done", "High", "Task", "Jamie Chen", 100, [
        "Payments",
      ]),
      issue(1055, "Fix profile avatar alignment", "Done", "Low", "Bug", "Taylor Brooks", 50, [
        "Frontend",
      ]),
    ],
    tests: [],
    activity: [
      { id: "a1", text: "VXA-1055 completed by Taylor · 50 XP earned", date, kind: "issue" },
      { id: "a3", text: "VXA-1042 flagged as critical", date, kind: "issue" },
      {
        id: "a4",
        text: "Alex completed the accessibility quest · 75 XP",
        date,
        kind: "achievement",
      },
    ],
  };
}
