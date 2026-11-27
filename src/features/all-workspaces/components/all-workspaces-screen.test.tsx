import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AllWorkspacesScreen } from "./all-workspaces-screen";

vi.mock("../hooks/use-all-workspaces", () => ({
  useAllWorkspaces: () => ({
    sources: [],
    loading: false,
    refreshing: false,
    error: "",
    refresh: vi.fn(),
  }),
}));

describe("combined record lists", () => {
  it.each([
    ["Project", "Add project"],
    ["Deployment", "Add deployment"],
    ["Modification", "Add modification"],
  ] as const)("shows %s creation even when the list is empty", (moduleRecordType, label) => {
    const renderForm = vi.fn();
    const html = renderToStaticMarkup(
      <AllWorkspacesScreen
        userId="owner"
        searchInput={null}
        moduleRecordType={moduleRecordType}
        createRecord={{ label, workspaceLabel: "Team QA", disabled: false, renderForm }}
      />,
    );

    expect(html).toContain("No workspace records yet");
    expect(html).toContain(label);
    expect(renderForm).not.toHaveBeenCalled();
  });

  it("omits creation when the caller has no write access", () => {
    const html = renderToStaticMarkup(
      <AllWorkspacesScreen userId="developer" searchInput={null} moduleRecordType="Modification" />,
    );

    expect(html).toContain("Modification records across workspaces");
    expect(html).not.toContain("Add modification");
  });
});
