import { useId, useMemo } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceSummaryCards } from "@/components/workspace-summary-cards";
import { canOpenWorkspaceView } from "@/features/workspace-access";
import { overviewTotals } from "@/lib/dashboard";

import { useAllWorkspaces } from "../hooks/use-all-workspaces";

export function AllWorkspacesSummary({ userId }: { userId: string }) {
  const { sources, loading, refreshing, error, refresh } = useAllWorkspaces(userId);
  const titleId = useId();
  const summary = useMemo(
    () =>
      overviewTotals(
        sources.map(({ workspace, role }) => ({
          workspace,
          canViewOverview: canOpenWorkspaceView(role, "Overview"),
        })),
      ),
    [sources],
  );

  return (
    <section aria-labelledby={titleId} className="mb-6 space-y-3">
      <h2 className="text-lg font-semibold" id={titleId}>
        All workspaces summary
      </h2>
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {error} {sources.length > 0 && "Totals include the workspaces that loaded."}
            </span>
            <Button
              disabled={refreshing}
              onClick={refresh}
              size="sm"
              type="button"
              variant="outline"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3" role="status">
          <span className="sr-only">Loading workspace totals</span>
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton className="h-27 rounded-xl" key={index} />
          ))}
        </div>
      ) : (
        sources.length > 0 && (
          <WorkspaceSummaryCards summary={summary} workspaceCount={sources.length} />
        )
      )}
    </section>
  );
}
