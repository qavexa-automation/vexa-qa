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
import { StatusBadge } from "@/components/ui/status-badge";
import { LongTextCell, TextCell } from "@/components/workspace-tables/cells";
import { ACTIVITY_STATUSES } from "@/features/activity-calendar";
import {
  DEPLOYMENT_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  STATUSES,
  TEST_STATUSES,
} from "@/lib/model";

import type { RecordType, WorkspaceRecord } from "../lib/workspace-records";
import { RecordAttachments, RecordDetails } from "./record-details";

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
  "Test case": ["Test details", "Expected result", "Developer remarks", "Last run"],
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
const dateDetails = [
  "Last run",
  "Date requested",
  "Date modified",
  "Deployment date",
  "Start",
  "End",
];
const statuses: Record<RecordType, readonly string[]> = {
  Project: PROJECT_STATUSES,
  "Test case": TEST_STATUSES,
  Modification: STATUSES,
  Quest: STATUSES,
  Deployment: DEPLOYMENT_STATUSES,
  Activity: ACTIVITY_STATUSES,
};
const attachmentPresence = ["Attached", "None"];

export function workspaceRecordColumns(recordType?: RecordType) {
  const name = recordType ? moduleName[recordType] : "Record";
  const statusOptions = recordType && statuses[recordType];
  const labels: ["type" | "workspace" | "project" | "module", string][] = [
    ["workspace", "Workspace"],
  ];
  if (!recordType) labels.unshift(["type", "Type"]);
  if (recordType !== "Project" && recordType !== "Test case") labels.push(["project", "Project"]);
  if (!recordType || recordType === "Test case") labels.push(["module", "Module"]);

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
    columnHelper.accessor((record) => record.status.label, {
      id: "status",
      filterFn: statusOptions ? filterOptions : filterText,
      sortFn: statusOptions ? sortByRank((value) => statusOptions.indexOf(value)) : "text",
      meta: {
        filter: statusOptions ? optionsFilter("Status", statusOptions) : textFilter("Status"),
      },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => <StatusBadge {...row.original.status} />,
    }),
    ...(recordType
      ? detailNames[recordType].map((detail) => {
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
  ]);
}
