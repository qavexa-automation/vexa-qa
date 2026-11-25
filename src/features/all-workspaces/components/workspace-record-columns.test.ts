import { expect, it } from "vitest";

import { workspaceRecordColumns } from "./workspace-record-columns";

it("shows Test Lab status immediately after the expected result and hides the last run", () => {
  const ids = workspaceRecordColumns("Test case").map((column) => column.id);
  const expectedResult = ids.indexOf("Expected result");
  expect(expectedResult).toBeGreaterThanOrEqual(0);
  expect(ids[expectedResult + 1]).toBe("status");
  expect(ids).not.toContain("Last run");
});
