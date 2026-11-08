export type SampleRecordStatus = "active" | "pending" | "archived";

export type SampleRecord = {
  id: string;
  name: string;
  owner: string;
  status: SampleRecordStatus;
  updatedAt: string;
};

export const sampleRecords: SampleRecord[] = [
  { id: "REC-20841", name: "Quarterly review", owner: "Operations", status: "active", updatedAt: "12 min ago" },
  { id: "REC-20837", name: "Mobile navigation audit", owner: "Design", status: "pending", updatedAt: "41 min ago" },
  { id: "REC-20816", name: "Support handoff", owner: "Support", status: "active", updatedAt: "Yesterday" },
  { id: "REC-20792", name: "API usage report", owner: "Engineering", status: "archived", updatedAt: "2 days ago" },
  { id: "REC-20754", name: "Access policy update", owner: "Operations", status: "pending", updatedAt: "4 days ago" },
  { id: "REC-20721", name: "Release readiness", owner: "Engineering", status: "active", updatedAt: "6 days ago" },
  { id: "REC-20688", name: "Customer feedback pass", owner: "Support", status: "archived", updatedAt: "1 week ago" },
];

export const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "archived", label: "Archived" },
] as const;

export function getStatusLabel(status: SampleRecordStatus) {
  return statusOptions.find((option) => option.value === status)?.label ?? status;
}
