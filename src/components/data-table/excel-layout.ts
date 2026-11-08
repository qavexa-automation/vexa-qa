/** How a column's values are laid out in an exported sheet. */
export type ExcelColumnKind = "text" | "longText" | "number" | "date" | "status";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const MIN_WIDTH = 10;
const MAX_WIDTH = 50;
/** Text longer than this wraps inside a capped column instead of widening it. */
const LONG_TEXT = 40;

/** A cell value Excel understands natively, so dates sort and numbers sum in the sheet. */
export function excelValue(value: unknown, kind: ExcelColumnKind): string | number | Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (kind === "date" && typeof value === "string" && DATE_ONLY.test(value))
    return new Date(`${value}T00:00:00Z`);
  if (kind === "number" && typeof value === "number") return value;
  return String(value);
}

/** Text columns whose values run long wrap; everything else stays on one line. */
export function excelKind(
  values: unknown[],
  hint: "text" | "number" | "date" | "status",
): ExcelColumnKind {
  if (hint !== "text") return hint;
  return values.some((value) => String(value ?? "").length > LONG_TEXT) ? "longText" : "text";
}

/** A width that fits the header and the longest line of content, within sensible bounds. */
export function excelWidth(header: string, values: unknown[], kind: ExcelColumnKind): number {
  if (kind === "date") return Math.max(header.length + 2, 14);
  const longest = values.reduce<number>((max, value) => {
    const lines = String(value ?? "").split("\n");
    return Math.max(max, ...lines.map((line) => line.length));
  }, header.length);
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, longest + 2));
}

export function excelAlignment(kind: ExcelColumnKind) {
  return {
    vertical: "top" as const,
    horizontal:
      kind === "number"
        ? ("right" as const)
        : kind === "date" || kind === "status"
          ? ("center" as const)
          : ("left" as const),
    wrapText: kind === "longText",
  };
}

/** "VEXA-Modifications-2026-11-01.xlsx" */
export function excelFileName(name: string, today: string) {
  return `VEXA-${name.trim().replace(/[^\w-]+/g, "-")}-${today}.xlsx`;
}

export type ExcelColumn = {
  header: string;
  kind: ExcelColumnKind;
  values: unknown[];
  width: number;
  /** Every possible value of a status column, so the dashboard also lists zero counts. */
  options?: readonly string[];
};

/** What the dashboard sheet knows about the export beyond the rows themselves. */
export type ExcelExportInfo = {
  /** YYYY-MM-DD */
  exportedOn: string;
  /** Labels of the columns that were filtered when exporting. */
  filters: string[];
};

/** "A", "B", … "Z", "AA" — the letter Excel uses for a 1-based column number. */
export function columnLetter(index: number): string {
  let letter = "";
  for (let n = index; n > 0; n = Math.floor((n - 1) / 26))
    letter = String.fromCharCode(65 + ((n - 1) % 26)) + letter;
  return letter;
}

export type ExcelSummary = {
  breakdowns: { header: string; column: number; rows: { label: string; count: number }[] }[];
  dates: { header: string; column: number; earliest: string | null; latest: string | null }[];
  numbers: { header: string; column: number; total: number; average: number }[];
};

/** The figures the dashboard shows, computed from the same values written to the data sheet. */
export function summarizeColumns(layout: ExcelColumn[]): ExcelSummary {
  const summary: ExcelSummary = { breakdowns: [], dates: [], numbers: [] };
  layout.forEach(({ header, kind, values, options }, index) => {
    const column = index + 1;
    if (kind === "status") {
      const labels = [...(options ?? [])];
      for (const value of values) {
        const label = String(value ?? "");
        if (label && !labels.includes(label)) labels.push(label);
      }
      summary.breakdowns.push({
        header,
        column,
        rows: labels.map((label) => ({
          label,
          count: values.filter((value) => String(value ?? "") === label).length,
        })),
      });
    } else if (kind === "date") {
      const dates = values
        .map((value) => String(value ?? ""))
        .filter((value) => DATE_ONLY.test(value))
        .sort();
      summary.dates.push({
        header,
        column,
        earliest: dates[0] ?? null,
        latest: dates[dates.length - 1] ?? null,
      });
    } else if (kind === "number") {
      const numbers = values.filter((value): value is number => typeof value === "number");
      const total = numbers.reduce((sum, value) => sum + value, 0);
      summary.numbers.push({
        header,
        column,
        total,
        average: numbers.length ? total / numbers.length : 0,
      });
    }
  });
  return summary;
}

// Graphite & Teal accent and border, as ARGB for Excel.
const HEADER_FILL = "FF0F766E";
const HEADER_TEXT = "FFFFFFFF";
const BORDER = "FFE4E4E0";

/**
 * One formatted sheet: a frozen, filterable brand header; borders; and per-column width,
 * alignment, wrapping, and date format. exceljs is loaded on demand so it never weighs on page
 * loads.
 */
export async function buildWorkbook(name: string, layout: ExcelColumn[], info: ExcelExportInfo) {
  const { default: ExcelJS } = await import("exceljs");
  const rowCount = layout[0]?.values.length ?? 0;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VEXA";
  workbook.created = new Date();
  const sheetName = name.replace(/[\\/?*[\]:]/g, "-").slice(0, 31);
  // The dashboard opens first; the rows follow on their own sheet.
  const dashboard = workbook.addWorksheet("Dashboard", { views: [{ showGridLines: false }] });
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = layout.map(({ header, width }) => ({ header, width }));

  const border = { style: "thin" as const, color: { argb: BORDER } };
  const borders = { top: border, left: border, bottom: border, right: border };

  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: HEADER_TEXT } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = borders;
  });

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const row = sheet.addRow(layout.map(({ kind, values }) => excelValue(values[rowIndex], kind)));
    layout.forEach(({ kind }, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      cell.alignment = excelAlignment(kind);
      cell.border = borders;
      if (kind === "date") cell.numFmt = "mmm dd, yyyy";
    });
  }

  if (layout.length)
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: layout.length } };

  writeDashboard(dashboard, sheetName, layout, rowCount, info);
  return workbook.xlsx.writeBuffer();
}

type Sheet = import("exceljs").Worksheet;
const MUTED_TEXT = "FF71717A";
const BAR_COLOR = "FF5EC4B6";
const SECTION_FILL = "FFECF7F5";

/**
 * A summary sheet: title, export details, record count, then a Count and Share table for every
 * status column (with in-cell bars), date ranges, and number totals. Figures are formulas over the
 * data sheet, cached with their current values so they show before Excel recalculates.
 */
function writeDashboard(
  dashboard: Sheet,
  sheetName: string,
  layout: ExcelColumn[],
  rowCount: number,
  info: ExcelExportInfo,
) {
  const summary = summarizeColumns(layout);
  const ref = (column: number) => {
    const letter = columnLetter(column);
    return `'${sheetName.replace(/'/g, "''")}'!$${letter}$2:$${letter}$${Math.max(rowCount + 1, 2)}`;
  };
  const border = { style: "thin" as const, color: { argb: BORDER } };
  const borders = { top: border, left: border, bottom: border, right: border };
  dashboard.columns = [{ width: 30 }, { width: 14 }, { width: 14 }, { width: 4 }];

  dashboard.mergeCells("A1:C1");
  const title = dashboard.getCell("A1");
  title.value = `VEXA — ${sheetName}`;
  title.font = { bold: true, size: 16, color: { argb: HEADER_FILL } };
  dashboard.getRow(1).height = 26;

  const exported = new Date(`${info.exportedOn}T00:00:00Z`);
  dashboard.getCell("A2").value = "Exported";
  dashboard.getCell("B2").value = exported;
  dashboard.getCell("B2").numFmt = "mmm dd, yyyy";
  dashboard.getCell("A3").value = "Filtered by";
  dashboard.getCell("B3").value = info.filters.length
    ? info.filters.join(", ")
    : "No column filters";
  for (const address of ["A2", "A3"])
    dashboard.getCell(address).font = { color: { argb: MUTED_TEXT } };
  for (const address of ["B2", "B3"]) dashboard.getCell(address).alignment = { horizontal: "left" };

  dashboard.getCell("A5").value = "Total records";
  dashboard.getCell("A5").font = { bold: true };
  const total = dashboard.getCell("B5");
  total.value = rowCount;
  total.font = { bold: true, size: 14, color: { argb: HEADER_FILL } };
  total.alignment = { horizontal: "left" };

  let row = 7;
  const sectionHeader = (labels: string[]) => {
    const header = dashboard.getRow(row);
    labels.forEach((label, index) => {
      const cell = header.getCell(index + 1);
      cell.value = label;
      cell.font = { bold: true, color: { argb: HEADER_TEXT } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
      cell.alignment = { horizontal: index === 0 ? "left" : "right", vertical: "middle" };
      cell.border = borders;
    });
    header.height = 20;
    row++;
  };
  const bodyCell = (column: number, value: unknown, numFmt?: string) => {
    const cell = dashboard.getRow(row).getCell(column);
    cell.value = value as never;
    cell.border = borders;
    cell.alignment = { horizontal: column === 1 ? "left" : "right" };
    if (numFmt) cell.numFmt = numFmt;
    return cell;
  };

  for (const breakdown of summary.breakdowns) {
    sectionHeader([`By ${breakdown.header}`, "Count", "Share"]);
    const first = row;
    for (const { label, count } of breakdown.rows) {
      bodyCell(1, label);
      bodyCell(2, { formula: `COUNTIF(${ref(breakdown.column)},A${row})`, result: count });
      bodyCell(
        3,
        { formula: `IF($B$5=0,0,B${row}/$B$5)`, result: rowCount ? count / rowCount : 0 },
        "0%",
      );
      row++;
    }
    if (breakdown.rows.length)
      dashboard.addConditionalFormatting({
        ref: `B${first}:B${row - 1}`,
        rules: [
          {
            type: "dataBar",
            priority: 1,
            gradient: false,
            cfvo: [{ type: "num", value: 0 }, { type: "max" }],
            color: { argb: BAR_COLOR },
          } as import("exceljs").DataBarRuleType,
        ],
      });
    row++;
  }

  if (summary.dates.length) {
    sectionHeader(["Dates", "Earliest", "Latest"]);
    for (const date of summary.dates) {
      const toDate = (value: string | null) => (value ? new Date(`${value}T00:00:00Z`) : "");
      bodyCell(1, date.header);
      bodyCell(
        2,
        {
          formula: `IF(COUNT(${ref(date.column)})=0,"",MIN(${ref(date.column)}))`,
          result: toDate(date.earliest),
        },
        "mmm dd, yyyy",
      );
      bodyCell(
        3,
        {
          formula: `IF(COUNT(${ref(date.column)})=0,"",MAX(${ref(date.column)}))`,
          result: toDate(date.latest),
        },
        "mmm dd, yyyy",
      );
      row++;
    }
    row++;
  }

  if (summary.numbers.length) {
    sectionHeader(["Totals", "Sum", "Average"]);
    for (const number of summary.numbers) {
      bodyCell(1, number.header);
      bodyCell(2, { formula: `SUM(${ref(number.column)})`, result: number.total }, "#,##0");
      bodyCell(
        3,
        { formula: `IFERROR(AVERAGE(${ref(number.column)}),0)`, result: number.average },
        "#,##0.0",
      );
      row++;
    }
  }

  // Soft band behind the record count so the headline figure reads first.
  for (const address of ["A5", "B5", "C5"])
    dashboard.getCell(address).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: SECTION_FILL },
    };
}
