import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import {
  buildWorkbook,
  columnLetter,
  summarizeColumns,
  excelAlignment,
  excelFileName,
  excelKind,
  excelValue,
  excelWidth,
  type ExcelColumn,
} from "./excel-layout";

describe("Excel layout", () => {
  it("stores dates as real dates, numbers as numbers, and empties as blank cells", () => {
    expect(excelValue("2026-11-01", "date")).toEqual(new Date("2026-11-01T00:00:00Z"));
    expect(excelValue(150, "number")).toBe(150);
    expect(excelValue("High", "status")).toBe("High");
    expect(excelValue("", "text")).toBeNull();
    expect(excelValue(undefined, "date")).toBeNull();
  });

  it("wraps long text and sizes columns to content within bounds", () => {
    expect(excelKind(["short"], "text")).toBe("text");
    expect(excelKind(["x".repeat(41)], "text")).toBe("longText");
    expect(excelKind([1, 2], "number")).toBe("number");
    expect(excelWidth("Module", ["Login"], "text")).toBe(10);
    expect(excelWidth("Module", ["Checkout and payments"], "text")).toBe(23);
    expect(excelWidth("Notes", ["x".repeat(200)], "longText")).toBe(50);
    expect(excelWidth("Date requested", ["2026-11-01"], "date")).toBe(16);
    expect(excelAlignment("number").horizontal).toBe("right");
    expect(excelAlignment("status").horizontal).toBe("center");
    expect(excelAlignment("longText")).toMatchObject({ horizontal: "left", wrapText: true });
    expect(excelFileName("Project portfolio", "2026-11-01")).toBe(
      "VEXA-Project-portfolio-2026-11-01.xlsx",
    );
  });

  it("writes a formatted sheet with a frozen, filterable header", async () => {
    const layout: ExcelColumn[] = [
      { header: "Module", kind: "text", values: ["Login", "Checkout"], width: 12 },
      {
        header: "Priority",
        kind: "status",
        values: ["High", "Low"],
        width: 10,
        options: ["Critical", "High", "Medium", "Low"],
      },
      { header: "Date requested", kind: "date", values: ["2026-10-28", ""], width: 16 },
      { header: "Reward", kind: "number", values: [100, 25], width: 10 },
    ];
    const buffer = await buildWorkbook("Modifications", layout, {
      exportedOn: "2026-11-01",
      filters: ["Priority"],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("Modifications")!;

    expect(sheet.getRow(1).values).toEqual([
      undefined,
      "Module",
      "Priority",
      "Date requested",
      "Reward",
    ]);
    expect(sheet.getRow(1).getCell(1).font?.bold).toBe(true);
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(sheet.autoFilter).toBeTruthy();
    expect(sheet.getColumn(3).width).toBe(16);

    const date = sheet.getRow(2).getCell(3);
    expect(date.value).toEqual(new Date("2026-10-28T00:00:00Z"));
    expect(date.numFmt).toBe("mmm dd, yyyy");
    expect(sheet.getRow(3).getCell(3).value).toBeNull();
    expect(sheet.getRow(2).getCell(4).value).toBe(100);
    expect(sheet.getRow(2).getCell(4).alignment?.horizontal).toBe("right");
    expect(sheet.getRow(2).getCell(2).alignment?.horizontal).toBe("center");
  });

  it("summarizes status, date, and number columns, keeping zero counts in option order", () => {
    const summary = summarizeColumns([
      { header: "Module", kind: "text", values: ["a", "b"], width: 10 },
      {
        header: "Status",
        kind: "status",
        values: ["Completed", "Backlog", "Completed"],
        width: 10,
        options: ["Backlog", "In progress", "In review", "Completed"],
      },
      { header: "Requested", kind: "date", values: ["2026-11-02", "", "2026-10-28"], width: 14 },
      { header: "Reward", kind: "number", values: [100, 50, 0], width: 10 },
    ]);
    expect(summary.breakdowns[0]).toEqual({
      header: "Status",
      column: 2,
      rows: [
        { label: "Backlog", count: 1 },
        { label: "In progress", count: 0 },
        { label: "In review", count: 0 },
        { label: "Completed", count: 2 },
      ],
    });
    expect(summary.dates[0]).toMatchObject({ earliest: "2026-10-28", latest: "2026-11-02" });
    expect(summary.numbers[0]).toMatchObject({ column: 4, total: 150, average: 50 });
    expect([1, 26, 27, 52].map(columnLetter)).toEqual(["A", "Z", "AA", "AZ"]);
  });

  it("puts a dashboard first whose figures are formulas over the data sheet", async () => {
    const buffer = await buildWorkbook(
      "Modifications",
      [
        {
          header: "Status",
          kind: "status",
          values: ["Completed", "Backlog", "Completed"],
          width: 10,
          options: ["Backlog", "In progress", "In review", "Completed"],
        },
        { header: "Requested", kind: "date", values: ["2026-11-02", "", "2026-10-28"], width: 14 },
      ],
      { exportedOn: "2026-11-01", filters: [] },
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Dashboard", "Modifications"]);
    const dashboard = workbook.getWorksheet("Dashboard")!;
    expect(dashboard.getCell("A1").value).toBe("VEXA — Modifications");
    expect(dashboard.getCell("B3").value).toBe("No column filters");
    expect(dashboard.getCell("B5").value).toBe(3);
    expect(dashboard.getCell("A7").value).toBe("By Status");
    expect(dashboard.getCell("A11").value).toBe("Completed");
    expect(dashboard.getCell("B11").value).toEqual({
      formula: "COUNTIF('Modifications'!$A$2:$A$4,A11)",
      result: 2,
    });
    expect(dashboard.getCell("C11").numFmt).toBe("0%");
    const dates = dashboard.getCell("B14").value as { formula: string; result: Date };
    expect(dashboard.getCell("A14").value).toBe("Requested");
    expect(dates.formula).toContain("MIN('Modifications'!$B$2:$B$4)");
    expect(dates.result).toEqual(new Date("2026-10-28T00:00:00Z"));
  });
});
