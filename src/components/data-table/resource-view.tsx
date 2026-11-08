"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTable, type ColumnDef, type RowData } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import {
  dataTableFeatures,
  type DataTableFeatures,
} from "@/components/data-table/data-table-features";
import { DataTableLoadingBar } from "@/components/data-table/data-table-loading-bar";
import { useResourceParams } from "@/components/data-table/use-resource-params";
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
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_SIZE_OPTIONS } from "@/lib/search-params";

export type LoadMoreResult<TRow> = { rows: TRow[]; hasMore: boolean };

/**
 * Column definitions are authored per feature with `createColumnHelper`, whose
 * value generic differs from column to column.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ResourceColumns<TRow extends RowData> = ColumnDef<DataTableFeatures, TRow, any>[];

export type LoadMore<TRow> = (input: {
  params: Record<string, string>;
  page: number;
}) => Promise<LoadMoreResult<TRow>>;

export type ResourceViewProps<TRow extends RowData> = {
  ariaLabel: string;
  rows: TRow[];
  total: number;
  page: number;
  pageSize: number;
  getRowId: (row: TRow) => string;
  columns: ResourceColumns<TRow>;
  renderTile: (row: TRow) => ReactNode;
  loadMore: LoadMore<TRow>;
  empty: ReactNode;
  /** Noun used in the result count, for example "units". */
  noun: string;
};

/**
 * One shared resource view. Desktop and tablet use the table shell over the
 * current server page. Below the table breakpoint the same ordered result set
 * is rendered as touch friendly tiles that append as the reader reaches the
 * end of the list.
 */
export function ResourceView<TRow extends RowData>({
  ariaLabel,
  rows,
  total,
  page,
  pageSize,
  getRowId,
  columns,
  renderTile,
  loadMore,
  empty,
  noun,
}: ResourceViewProps<TRow>) {
  const { apply, get, isPending, searchParams } = useResourceParams();
  const paramsKey = searchParams.toString();

  const table = useTable({
    columns,
    data: rows,
    features: dataTableFeatures,
    manualPagination: true,
    manualSorting: true,
    rowCount: total,
    getRowId: (row) => getRowId(row as TRow),
    state: {
      pagination: { pageIndex: page - 1, pageSize },
      sorting: sortingState(get("sort")),
    },
  });

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRow = Math.min(page * pageSize, total);

  return (
    <div className="space-y-3">
      <DataTableLoadingBar isPending={isPending} />

      <div className="hidden md:block" data-tour="resource-table">
        <DataTable ariaLabel={ariaLabel} empty={empty} isPending={isPending} table={table} />
      </div>

      {/* Keyed on the query so a change to search, filters, or sorting resets
          the accumulated tiles rather than appending to a stale list. */}
      <MobileTileList
        empty={empty}
        getRowId={getRowId}
        initial={rows}
        key={paramsKey}
        loadMore={loadMore}
        noun={noun}
        params={paramsKey}
        renderTile={renderTile}
        total={total}
      />

      <div className="hidden flex-wrap items-center gap-3 md:flex" data-tour="resource-pagination">
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {total === 0 ? `No ${noun}` : `Showing ${firstRow} to ${lastRow} of ${total} ${noun}`}
        </p>
        <div className="ml-auto flex items-center gap-2">
          <Combobox
            itemToStringLabel={(size: number) => `${size} per page`}
            itemToStringValue={(size: number) => `${size} per page`}
            items={PAGE_SIZE_OPTIONS}
            onValueChange={(size) => apply({ size: size ? String(size) : null })}
            value={pageSize}
          >
            <ComboboxSelectTrigger aria-label="Rows per page" className="h-8 w-36" />
            <ComboboxContent>
              <ComboboxSearch />
              <ComboboxEmpty>No matches.</ComboboxEmpty>
              <ComboboxList>
                {(size: number) => (
                  <ComboboxItem key={size} value={size}>
                    {size} per page
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <span className="text-xs text-muted-foreground tabular-nums">
            Page {page} of {pageCount}
          </span>
          <Button
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => apply({ page: String(page - 1) }, { resetPage: false })}
            size="icon-sm"
            variant="outline"
          >
            <ChevronLeft />
          </Button>
          <Button
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => apply({ page: String(page + 1) }, { resetPage: false })}
            size="icon-sm"
            variant="outline"
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

function sortingState(value: string) {
  if (!value) return [];
  const [id, direction] = value.split(":");
  if (!id) return [];
  return [{ id, desc: direction === "desc" }];
}

/**
 * Mobile accumulation. Tiles append one chunk at a time, records deduplicate
 * by identifier, a stale response is discarded by the effect's cleanup, and
 * the whole list is reset by remounting on a new query rather than by
 * resetting state from an effect.
 */
function MobileTileList<TRow>({
  initial,
  total,
  params,
  loadMore,
  getRowId,
  renderTile,
  empty,
  noun,
}: {
  initial: TRow[];
  total: number;
  params: string;
  loadMore: LoadMore<TRow>;
  getRowId: (row: TRow) => string;
  renderTile: (row: TRow) => ReactNode;
  empty: ReactNode;
  noun: string;
}) {
  const [rows, setRows] = useState(initial);
  const [loadedPage, setLoadedPage] = useState(1);
  const [requestedPage, setRequestedPage] = useState(1);
  const [reachedEnd, setReachedEnd] = useState(initial.length >= total);
  const [error, setError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const isLoading = requestedPage > loadedPage && !error;
  const hasMore = !reachedEnd && rows.length < total;
  const query = useMemo(() => Object.fromEntries(new URLSearchParams(params)), [params]);

  useEffect(() => {
    if (requestedPage <= loadedPage) return;
    let cancelled = false;

    loadMore({ params: query, page: requestedPage })
      .then((result) => {
        if (cancelled) return;
        setRows((current) => {
          const seen = new Set(current.map(getRowId));
          return [...current, ...result.rows.filter((row) => !seen.has(getRowId(row)))];
        });
        if (!result.hasMore) setReachedEnd(true);
        setLoadedPage(requestedPage);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [getRowId, loadMore, loadedPage, query, requestedPage]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || reachedEnd || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRequestedPage((current) => Math.max(current, loadedPage + 1));
        }
      },
      { rootMargin: "320px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [error, loadedPage, reachedEnd]);

  return (
    <div className="md:hidden" data-tour="resource-tiles">
      {rows.length === 0 && !isLoading ? (
        empty
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={getRowId(row)}>{renderTile(row)}</li>
          ))}
        </ul>
      )}

      {isLoading ? (
        <ul className="mt-2 flex flex-col gap-2">
          {[0, 1].map((index) => (
            <li className="rounded-lg border border-border glass-inset p-4" key={index}>
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="mt-2 h-3 w-1/4" />
              <Skeleton className="mt-4 h-3 w-3/4" />
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-lg border border-dashed border-border p-4 text-center">
          <p className="text-sm text-muted-foreground">That batch did not load.</p>
          <Button
            className="mt-2"
            onClick={() => {
              setError(false);
              setRequestedPage(loadedPage + 1);
            }}
            size="sm"
            variant="outline"
          >
            <RotateCcw aria-hidden="true" />
            Try again
          </Button>
        </div>
      ) : null}

      <div aria-hidden="true" className="h-px" ref={sentinelRef} />

      <p aria-live="polite" className="py-3 text-center text-xs text-muted-foreground">
        {isLoading
          ? `Loading more ${noun}`
          : rows.length === 0
            ? ""
            : hasMore
              ? `${rows.length} of ${total} ${noun}`
              : `All ${total} ${noun} shown`}
      </p>
    </div>
  );
}
