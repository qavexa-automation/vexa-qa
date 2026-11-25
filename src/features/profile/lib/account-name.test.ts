import { describe, expect, it } from "vitest";
import { ownWorkspaceLabel, workspaceLabel } from "./account-name";

describe("own workspace name", () => {
  it("uses the display name, then the email prefix, then a generic label", () => {
    const email = "ana.cruz@example.test";
    expect(ownWorkspaceLabel({ email, user_metadata: { full_name: "  Ana Cruz " } })).toBe("QA-ANA");
    expect(ownWorkspaceLabel({ email, user_metadata: { full_name: "  " } })).toBe("QA-ANA.CRUZ");
    expect(ownWorkspaceLabel({ email, user_metadata: { full_name: 7 } })).toBe("QA-ANA.CRUZ");
    expect(ownWorkspaceLabel(null)).toBe("My workspace");
  });

  it("prefixes names once and leaves blank names empty", () => {
    expect(workspaceLabel("Jessica")).toBe("QA-JESSICA");
    expect(workspaceLabel("qa-Jessica")).toBe("QA-JESSICA");
    expect(workspaceLabel("Keren May Maturan")).toBe("QA-KEREN");
    expect(workspaceLabel("QA- Keren May")).toBe("QA-KEREN");
    expect(workspaceLabel("QA-")).toBe("");
    expect(workspaceLabel("  ")).toBe("");
  });
});
