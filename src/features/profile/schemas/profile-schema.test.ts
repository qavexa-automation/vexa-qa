import { describe, expect, it } from "vitest";
import { displayNameSchema } from "./profile-schema";

describe("display name", () => {
  it("trims surrounding whitespace and preserves the person's chosen spelling", () => {
    expect(displayNameSchema.parse("  María-José de la Cruz  ")).toBe("María-José de la Cruz");
    expect(displayNameSchema.parse("李 明")).toBe("李 明");
  });

  it("rejects empty and non-text names before saving", () => {
    for (const name of ["", " \t\n ", null, undefined, 123, { full_name: "Ana" }]) {
      expect(displayNameSchema.safeParse(name).success).toBe(false);
    }
  });

  it("keeps full names without truncating their content", () => {
    const name = "Alexandria ".repeat(20).trim();
    expect(displayNameSchema.parse(name)).toBe(name);
  });
});
