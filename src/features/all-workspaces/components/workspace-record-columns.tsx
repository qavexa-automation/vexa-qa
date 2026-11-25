import { createColumnHelper } from "@tanstack/react-table";

import {
  dateFilter,
  filterDateRange,
  filterOptions,
  filterText,
  optionsFilter,
  textFilter,
} from "@/components/data-table/column-filter-fns";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import { sortByRank } from "@/components/data-table/sort-by-rank";
import { LongTextCell, TextCell } from "@/components/workspace-tables/cells";
import { PRIORITIES } from "@/lib/model";

import { recordStatuses } from "../lib/record-status";
import type { RecordType, WorkspaceRecord } from "../lib/workspace-records";
import { RecordAttachments, RecordDetails } from "./record-details";
import { WorkspaceInlineStatus } from "./workspace-inline-status";
import { WorkspaceRecordActions } from "./workspace-record-actions";

const columnHelper = createColumnHelper<DataTableFeatures, WorkspaceRecord>();
const moduleName: Record<RecordType, string> = {
  Project: "Project name",
  "Test case": "Test case",
  Modification: "Module",
  Quest: "Quest",
  Deployment: "Version / Release",
  Activity: "Activity",
};
const detailNames: Record<RecordType, string[]> = {
  Project: ["Department / Section", "Developer"],
  "Test case": ["Test details", "Expected result", "Status", "Developer remarks"],
  Modification: [
    "Description",
    "Priority",
    "Developer",
    "Remarks",
    "Date requested",
    "Date modified",
  ],
  Quest: ["Description", "Type", "Priority", "Assignee", "Labels"],
  Deployment: ["Environment", "Deployment date", "Notes"],
  Activity: ["Kind", "Start", "End", "Location", "Notes"],
};
const longDetails = [
  "Test details",
  "Expected result",
  "Developer remarks",
  "Description",
  "Remarks",
  "Notes",
];
const dateDetails = ["Date requested", "Date modified", "Deployment date", "Start", "End"];
const attachmentPresence = ["Attached", "None"];

export function workspaceRecordColumns(recordType?: RecordType) {
  const name = recordType ? moduleName[recordType] : "Record";
  const statusOptions: readonly string[] | undefined = recordType && recordStatuses[recordType].options;
  const labels: ["type" | "workspace" | "project" | "module", string][] = [
    ["workspace", "Workspace"],
  ];
  if (!recordType) labels.unshift(["type", "Type"]);
  if (recordType !== "Project" && recordType !== "Test case") labels.push(["project", "Project"]);
  if (!recordType || recordType === "Test case") labels.push(["module", "Module"]);
  const statusColumn = columnHelper.accessor((record) => record.status.label, {
    id: "status",
    filterFn: statusOptions ? filterOptions : filterText,
    sortFn: statusOptions ? sortByRank((value) => statusOptions.indexOf(value)) : "text",
    meta: {
      filter: statusOptions ? optionsFilter("Status", statusOptions) : textFilter("Status"),
    },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => <WorkspaceInlineStatus record={row.original} />,
  });

  return columnHelper.columns([
    columnHelper.accessor("name", {
      filterFn: filterText,
      sortFn: "text",
      meta: {
        filter: textFilter(name),
        exportId: recordType === "Test case" || recordType === "Quest",
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title={name} />,
      cell: ({ row }) => (
        <RecordDetails
          record={row.original}
          showId={recordType === "Test case" || recordType === "Quest"}
        />
      ),
    }),
    ...labels.map(([field, label]) =>
      columnHelper.accessor(field, {
        filterFn: filterText,
        sortFn: "text",
        meta: { filter: textFilter(label) },
        header: ({ column }) => <DataTableColumnHeader column={column} title={label} />,
        cell: ({ getValue }) => <TextCell value={getValue()} />,
      }),
    ),
    ...(recordType === "Test case" ? [] : [statusColumn]),
    ...(recordType
      ? detailNames[recordType].map((detail) => {
          if (detail === "Status") return statusColumn;
          const label = detail === "Test details" ? "Steps to execute" : detail;
          const isLong = longDetails.includes(detail);
          const isDate = dateDetails.includes(detail);
          const detailOf = (record: WorkspaceRecord) =>
            record.fields.find((field) => field.label === detail);
          return columnHelper.accessor(
            (record) => (isDate ? detailOf(record)?.date : detailOf(record)?.value) ?? "",
            {
              id: detail,
              filterFn: isDate
                ? filterDateRange
                : detail === "Priority"
                  ? filterOptions
                  : filterText,
              sortFn:
                detail === "Priority"
                  ? sortByRank((value) => PRIORITIES.findIndex((priority) => priority === value))
                  : "text",
              enableSorting: !isLong,
              meta: {
                filter: isDate
                  ? dateFilter(label)
                  : detail === "Priority"
                    ? optionsFilter(label, PRIORITIES)
                    : textFilter(label),
              },
              header: ({ column }) => <DataTableColumnHeader column={column} title={label} />,
              cell: ({ getValue, row }) =>
                isLong ? (
                  <LongTextCell value={getValue()} />
                ) : (
                  <TextCell value={isDate ? detailOf(row.original)?.value : getValue()} />
                ),
            },
          );
        })
      : []),
    ...(recordType === "Test case" || recordType === "Modification"
      ? [
          columnHelper.accessor((record) => (record.attachments?.length ? "Attached" : "None"), {
            id: "attachments",
            filterFn: filterOptions,
            sortFn: "text",
            meta: {
              filter: optionsFilter("Attachments", attachmentPresence),
              cellClassName: "min-w-44",
            },
            header: ({ column }) => <DataTableColumnHeader column={column} title="Attachments" />,
            cell: ({ row }) => <RecordAttachments record={row.original} />,
          }),
        ]
      : []),
    columnHelper.display({
      id: "actions",
      enableHiding: false,
      meta: { cellClassName: "w-px", headerClassName: "w-px" },
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => <WorkspaceRecordActions record={row.original} revealOnHover />,
    }),
  ]);
}
