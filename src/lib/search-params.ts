/**
 * Shareable list state lives in the URL. These helpers parse the raw
 * `searchParams` a route receives into a typed query the services understand,
 * so every resource screen refines the same way.
 */

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type SortDirection = "asc" | "desc";

export type ResourceQuery = {
  search: string;
  page: number;
  pageSize: number;
  sort: { field: string; direction: SortDirection } | null;
  filters: Record<string, string>;
};

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50];

export function readParam(params: RawSearchParams, key: string): string | undefined {
  const value = params[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseResourceQuery(
  params: RawSearchParams,
  options: { filterKeys?: readonly string[]; defaultSort?: string; defaultPageSize?: number } = {},
): ResourceQuery {
  const rawPage = Number(readParam(params, "page") ?? "1");
  const rawSize = Number(readParam(params, "size") ?? options.defaultPageSize ?? DEFAULT_PAGE_SIZE);
  const sortValue = readParam(params, "sort") ?? options.defaultSort;

  const filters: Record<string, string> = {};
  for (const key of options.filterKeys ?? []) {
    const value = readParam(params, key);
    if (value && value !== "all") filters[key] = value;
  }

  return {
    search: (readParam(params, "q") ?? "").trim(),
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1,
    pageSize: PAGE_SIZE_OPTIONS.includes(rawSize)
      ? rawSize
      : (options.defaultPageSize ?? DEFAULT_PAGE_SIZE),
    sort: parseSort(sortValue),
    filters,
  };
}

function parseSort(value: string | undefined): ResourceQuery["sort"] {
  if (!value) return null;
  const [field, direction] = value.split(":");
  if (!field) return null;
  return { field, direction: direction === "desc" ? "desc" : "asc" };
}

export type Page<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * Applies search, sort, and pagination the way a server query would. When
 * Supabase replaces the in-memory store this is the only place that changes.
 */
export function paginate<T>(rows: T[], query: Pick<ResourceQuery, "page" | "pageSize">): Page<T> {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, pageCount);
  const start = (page - 1) * query.pageSize;
  return { rows: rows.slice(start, start + query.pageSize), total, page, pageSize: query.pageSize };
}

export function matchesSearch(term: string, values: (string | null | undefined)[]): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  const haystack = values
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());
  // Every word must appear somewhere across the fields, so a query that spans two fields — such as
  // a property name plus a unit code ("Maple Residences 5B") — still matches. A single word keeps
  // the original substring behaviour.
  return needle.split(/\s+/).every((token) => haystack.some((value) => value.includes(token)));
}

export function compareBy<T>(
  rows: T[],
  sort: ResourceQuery["sort"],
  accessors: Record<string, (row: T) => string | number>,
): T[] {
  if (!sort || !accessors[sort.field]) return rows;
  const accessor = accessors[sort.field];
  const factor = sort.direction === "desc" ? -1 : 1;
  return [...rows].sort((left, right) => {
    const a = accessor(left);
    const b = accessor(right);
    if (typeof a === "number" && typeof b === "number") return (a - b) * factor;
    return String(a).localeCompare(String(b)) * factor;
  });
}
