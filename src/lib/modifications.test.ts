import { describe, expect, it } from "vitest";
import { emptyWorkspace, parseWorkspace, type Modification, type Workspace } from "./model";
import {
  formatModificationDate,
  modificationDatesProblem,
  toModificationDate,
} from "./modifications";
import { mergeWorkspaces } from "./workspace-merge";

function modification(): Modification {
  return {
    id: "m1",
    projectId: "p1",
    projectName: "Portal",
    module: "Login",
    description: "Validate login",
    priority: "Medium",
    status: "Backlog",
    developer: "Ana",
    notes: "",
    requestedAt: "2026-10-28",
    modifiedAt: "2026-11-01",
  };
}
const workspace = (): Workspace => ({ ...emptyWorkspace(), modifications: [modification()] });

describe("modification dates", () => {
  it("keeps calendar dates and turns stored timestamps into their Manila day", () => {
    expect(toModificationDate("2026-11-01")).toBe("2026-11-01");
    expect(toModificationDate("2026-11-01T16:30:00.000Z")).toBe("2026-11-02");
    expect(toModificationDate("not a date")).toBeNull();
    expect(toModificationDate(null)).toBeNull();
  });

  it("allows either date to be empty and rejects a modified date before the requested date", () => {
    expect(modificationDatesProblem("2026-10-28", "2026-11-01")).toBeNull();
    expect(modificationDatesProblem("2026-11-01", "2026-11-01")).toBeNull();
    expect(modificationDatesProblem("", "")).toBeNull();
    expect(modificationDatesProblem("", "2026-11-01")).toBeNull();
    expect(modificationDatesProblem("2026-10-28", "")).toBeNull();
    expect(modificationDatesProblem("2026-11-02", "2026-11-01")).toMatch(/cannot be before/);
  });

  it("formats a calendar date without shifting the day", () => {
    expect(formatModificationDate("2026-11-01")).toContain("01");
    expect(formatModificationDate("2026-11-01")).toContain("Nov");
    expect(formatModificationDate(undefined)).toBe("—");
    expect(formatModificationDate("not a date")).toBe("—");
  });

  it("loads old timestamp records as dates and still rejects invalid stored values", () => {
    const legacy = parseWorkspace({
      ...emptyWorkspace(),
      modifications: [
        { ...modification(), requestedAt: "2026-11-01T04:00:00.000Z", modifiedAt: undefined },
      ],
    });
    expect(legacy?.modifications?.[0]).toMatchObject({
      requestedAt: "2026-11-01",
    });
    expect(legacy?.modifications?.[0].modifiedAt).toBeUndefined();
    expect(
      parseWorkspace({
        ...emptyWorkspace(),
        modifications: [{ ...modification(), requestedAt: "not a date" }],
      }),
    ).toBeNull();
    expect(
      parseWorkspace({
        ...emptyWorkspace(),
        modifications: [{ ...modification(), modifiedAt: 123 }],
      }),
    ).toBeNull();
  });

  it("merges the dates like any other edited field", () => {
    const base = workspace(),
      local = structuredClone(base),
      remote = structuredClone(base);
    local.modifications![0].modifiedAt = "2026-11-03";
    remote.modifications![0].status = "Completed";
    expect(mergeWorkspaces(base, local, remote).modifications![0]).toMatchObject({
      modifiedAt: "2026-11-03",
      status: "Completed",
      requestedAt: "2026-10-28",
    });
    remote.modifications![0].modifiedAt = "2026-11-04";
    expect(() => mergeWorkspaces(base, local, remote)).toThrow(
      "Both users changed modification m1 (modifiedAt)",
    );
  });
});
