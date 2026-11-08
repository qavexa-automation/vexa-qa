"use client";

import { useMemo, useState, useTransition } from "react";
import { useTable } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Plus, Search, SearchX } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { dataTableFeatures } from "@/components/data-table/data-table-features";
import { DataTableLoadingBar } from "@/components/data-table/data-table-loading-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxSearch,
  ComboboxSelectTrigger,
} from "@/components/ui/combobox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { createSampleRecordColumns } from "@/features/design-system/components/sample-record-columns";
import {
  getStatusLabel,
  sampleRecords,
  statusOptions,
  type SampleRecord,
} from "@/features/design-system/lib/sample-records";

const PAGE_SIZE = 4;

export function ResourceListDemo() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof statusOptions)[number]["value"]>("all");
  const [sort, setSort] = useState<{ id: keyof SampleRecord; desc: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const matching = sampleRecords.filter((record) => {
      const matchesTerm = !term || [record.name, record.id, record.owner].some((value) => value.toLowerCase().includes(term));
      return matchesTerm && (status === "all" || record.status === status);
    });

    return sort
      ? [...matching].sort((left, right) => {
          const result = String(left[sort.id]).localeCompare(String(right[sort.id]));
          return sort.desc ? -result : result;
        })
      : matching;
  }, [search, sort, status]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const columns = useMemo(() => createSampleRecordColumns((next) => {
    startTransition(() => {
      setSort(next);
      setPage(1);
    });
  }), []);

  const table = useTable({
    columns,
    data: pageRows,
    features: dataTableFeatures,
    manualPagination: true,
    manualSorting: true,
    rowCount: filtered.length,
    getRowId: (row) => row.id,
    state: {
      pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE },
      sorting: sort ? [{ id: sort.id, desc: sort.desc }] : [],
    },
  });

  const selectedStatus = statusOptions.find((option) => option.value === status) ?? statusOptions[0];

  function refine(change: () => void) {
    startTransition(() => {
      change();
      setPage(1);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <InputGroup className="h-9 w-full sm:max-w-sm">
          <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
          <InputGroupInput
            aria-label="Search records"
            onChange={(event) => refine(() => setSearch(event.target.value))}
            placeholder="Search records"
            value={search}
          />
        </InputGroup>
        <Combobox
          itemToStringValue={(option: (typeof statusOptions)[number]) => option.label}
          items={statusOptions}
          onValueChange={(option) => refine(() => setStatus(option?.value ?? "all"))}
          value={selectedStatus}
        >
          <ComboboxSelectTrigger aria-label="Status" className="w-44" placeholder="All statuses" />
          <ComboboxContent>
            <ComboboxSearch />
            <ComboboxEmpty>No statuses found.</ComboboxEmpty>
            <ComboboxList>
              {(option) => <ComboboxItem key={option.value} value={option}>{option.label}</ComboboxItem>}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <Button className="sm:ml-auto"><Plus aria-hidden="true" />Add record</Button>
      </div>

      <DataTableLoadingBar isPending={isPending} />

      <div className="hidden md:block">
        <DataTable
          ariaLabel="Example records"
          empty={
            <div className="grid min-h-48 place-items-center p-6 text-center">
              <div><SearchX className="mx-auto size-5 text-muted-foreground" /><p className="mt-3 font-medium">No matching records</p><p className="mt-1 text-sm text-muted-foreground">Change the search or status filter.</p></div>
            </div>
          }
          isPending={isPending}
          table={table}
        />
      </div>

      <div className="space-y-2 md:hidden">
        {pageRows.length ? pageRows.map((record) => (
          <article className="rounded-lg border border-border glass-inset p-4" key={record.id}>
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-medium">{record.name}</h3><p className="mt-1 font-mono text-xs text-muted-foreground">{record.id}</p></div>
              <Badge variant={record.status === "archived" ? "outline" : record.status === "pending" ? "secondary" : "default"}>{getStatusLabel(record.status)}</Badge>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-muted-foreground">Owner</dt><dd className="mt-1">{record.owner}</dd></div><div><dt className="text-xs text-muted-foreground">Updated</dt><dd className="mt-1">{record.updatedAt}</dd></div></dl>
          </article>
        )) : <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No matching records.</p>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p aria-live="polite" className="text-xs text-muted-foreground">Showing {pageRows.length} of {filtered.length} records</p>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Page {page} of {pageCount}</span>
          <Button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} size="icon" variant="outline"><ChevronLeft /></Button>
          <Button aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)} size="icon" variant="outline"><ChevronRight /></Button>
        </div>
      </div>
    </div>
  );
}
