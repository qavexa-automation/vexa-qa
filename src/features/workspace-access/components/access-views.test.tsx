import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ModificationTracker from "@/components/modification-tracker";
import TestCaseTable from "@/components/test-case-table";
import type { Modification, TestCase } from "@/lib/model";

const modification: Modification = {
  id: "MOD-1", projectId: "project-1", projectName: "Portal", module: "Login", description: "Improve validation",
  developer: "Ana", status: "Backlog", priority: "High", notes: "Retest after release",
  attachments: [{ id: "file-1", name: "evidence.png", storedName: "evidence.png", contentType: "image/png", size: 1, storedSize: 1, encoding: "none", path: "owner/MOD-1/file-1", uploadedAt: "2026-11-17T00:00:00Z" }],
};
const test: TestCase = { id: "TC-1", title: "Portal", suite: "Login", steps: "Sign in", expected: "Dashboard", status: "Not Tested", lastRun: null, developerRemarks: "Ready to retest" };

describe("Developer workspace controls", () => {
  it("keeps tracker filtering and attachment previews while removing mutations on desktop and mobile", () => {
    const html = renderToStaticMarkup(<ModificationTracker
      projects={[]} modifications={[modification]} search="" readOnly workspaceOwner="owner"
      onChange={vi.fn()} onNotice={vi.fn()} onManageProjects={vi.fn()}
    />);
    expect(html).toContain("Improve validation");
    expect(html).toContain("Retest after release");
    expect(html).toContain("Filter modifications by project");
    expect(html).toContain("Preview evidence.png");
    for (const label of ["Add modification", "Edit modification", "Delete modification", "Remove attachment", "Attach a file to", "Status for Portal", "Priority for Portal"]) expect(html).not.toContain(label);
  });

  it("offers remark editing and displays remarks in both Test Lab views, without result or delete controls", () => {
    const html = renderToStaticMarkup(<TestCaseTable tests={[test]} readOnly onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} onRemarksChange={vi.fn()} onAttach={vi.fn()} onDetach={vi.fn()} onLoadAttachment={vi.fn()} uploadingId={null} canAttach={false} />);
    expect(html).toContain("Developer remarks");
    expect(html.match(/Ready to retest/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("Edit developer remarks");
    expect(html).not.toContain("Delete test case");
    expect(html).not.toContain("Status for TC-1");
  });

  it("edits remarks in place in both Test Lab views, including for a developer", () => {
    const html = renderToStaticMarkup(<TestCaseTable tests={[test]} readOnly onEdit={vi.fn()} onDelete={vi.fn()} onStatusChange={vi.fn()} onRemarksChange={vi.fn()} onAttach={vi.fn()} onDetach={vi.fn()} onLoadAttachment={vi.fn()} uploadingId={null} canAttach={false} />);
    // The desktop cell and the mobile tile each expose the remarks as an editable control.
    expect(html.match(/Developer remarks for TC-1: Portal: Ready to retest/g)?.length).toBe(2);
  });
});
