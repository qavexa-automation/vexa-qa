import { describe, expect, it } from "vitest";
import { DEPLOYMENT_STATUSES, PRIORITIES, PROJECT_STATUSES, STATUSES, TEST_STATUSES } from "./model";
import {
  deploymentStatusRank,
  deploymentStatusTone,
  priorityRank,
  priorityTone,
  projectStatusRank,
  projectStatusTone,
  statusRank,
  statusTone,
  testStatusTone,
} from "./status-tones";

describe("status tones", () => {
  it("gives every workspace status a tone", () => {
    for (const status of STATUSES) expect(statusTone(status)).toBeTruthy();
    for (const priority of PRIORITIES) expect(priorityTone(priority)).toBeTruthy();
    for (const status of TEST_STATUSES) expect(testStatusTone(status)).toBeTruthy();
    for (const status of DEPLOYMENT_STATUSES) expect(deploymentStatusTone(status)).toBeTruthy();
    for (const status of PROJECT_STATUSES) expect(projectStatusTone(status)).toBeTruthy();
  });

  it("reserves the critical tone for failures and critical priority", () => {
    expect(priorityTone("Critical")).toBe("critical");
    expect(testStatusTone("Failed")).toBe("critical");
    expect(deploymentStatusTone("Failed")).toBe("critical");
    expect(statusTone("Completed")).toBe("positive");
  });

  it("ranks values in workflow order for sorting", () => {
    expect(priorityRank("Critical")).toBeLessThan(priorityRank("Low"));
    expect(statusRank("Backlog")).toBeLessThan(statusRank("Completed"));
    expect(deploymentStatusRank("Planned")).toBeLessThan(deploymentStatusRank("Deployed"));
    expect(projectStatusRank("Not Started")).toBeLessThan(projectStatusRank("Deployed"));
  });
});
