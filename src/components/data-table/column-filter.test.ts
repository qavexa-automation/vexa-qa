import type { Row } from "@tanstack/react-table";
import { describe, expect, it } from "vitest";

import { filterDateRange, filterOptions, filterText } from "./column-filter-fns";
import type { DataTableFeatures } from "./data-table-features";
import { sortByRank } from "./sort-by-rank";

const row = (value: unknown) =>
  ({ getValue: () => value }) as unknown as Row<DataTableFeatures, { value: unknown }>;

describe("column filters", () => {
  it("matches text case-insensitively anywhere in the value", () => {
    expect(filterText(row("Login validation"), "module", "VALID")).toBe(true);
    expect(filterText(row("Login validation"), "module", "  login ")).toBe(true);
    expect(filterText(row("Login validation"), "module", "checkout")).toBe(false);
    expect(filterText(row(undefined), "module", "x")).toBe(false);
  });

  it("keeps rows whose label is one of the chosen options", () => {
    expect(filterOptions(row("High"), "priority", ["Critical", "High"])).toBe(true);
    expect(filterOptions(row("Low"), "priority", ["Critical", "High"])).toBe(false);
  });

  it("keeps dates inside an inclusive range and drops rows without a date", () => {
    expect(filterDateRange(row("2026-11-01"), "d", { from: "2026-11-01", to: "2026-11-30" })).toBe(
      true,
    );
    expect(filterDateRange(row("2026-10-31"), "d", { from: "2026-11-01" })).toBe(false);
    expect(filterDateRange(row("2026-12-01"), "d", { to: "2026-11-30" })).toBe(false);
    expect(filterDateRange(row(""), "d", { from: "2026-11-01" })).toBe(false);
  });

  it("sorts labels in workflow order", () => {
    const order = ["Critical", "High", "Medium", "Low"];
    const byPriority = sortByRank((value: string) => order.indexOf(value));
    expect(byPriority(row("Critical"), row("Low"), "priority")).toBeLessThan(0);
    expect(byPriority(row("Low"), row("High"), "priority")).toBeGreaterThan(0);
  });
});
