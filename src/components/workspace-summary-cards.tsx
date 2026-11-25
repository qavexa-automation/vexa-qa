import {
  Bug,
  Crosshair,
  FlaskConical,
  FolderKanban,
  Layers,
  NotebookPen,
  Rocket,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { StatCard } from "@/components/app-shell/panel";
import type { OverviewTotals } from "@/lib/dashboard";

export function WorkspaceSummaryCards({
  summary,
  workspaceCount,
}: {
  summary: OverviewTotals;
  workspaceCount?: number;
}) {
  return (
    <div
      className={
        workspaceCount === undefined ? "stats-grid" : "grid grid-cols-2 gap-3 lg:grid-cols-3"
      }
    >
      {workspaceCount !== undefined && (
        <StatCard
          label="WORKSPACES"
          value={workspaceCount}
          icon={Layers}
          color="mint"
          detail="Included in these totals"
        />
      )}
      <StatCard
        label="PROJECTS"
        value={summary.projects}
        icon={FolderKanban}
        color="mint"
        detail="From Project Maintenance"
      />
      <StatCard
        label="TOTAL QUESTS"
        value={summary.total}
        icon={Crosshair}
        color="mint"
        detail={`${summary.done} completed · ${summary.total - summary.done} open`}
      />
      <StatCard
        label="OPEN BUGS"
        value={summary.bugs}
        icon={Bug}
        color="orange"
        detail={`${summary.critical} open critical quests`}
      />
      <StatCard
        label="TEST PASS RATE"
        value={`${summary.passRate}%`}
        icon={ShieldCheck}
        color="purple"
        detail={
          summary.run
            ? `${summary.passed} passed / ${summary.run} executed`
            : "No executed tests yet"
        }
      />
      <StatCard
        label="TEST CASES"
        value={summary.tests}
        icon={FlaskConical}
        color="purple"
        detail={`${summary.notTested} not tested · ${summary.failedTests} failed`}
      />
      <StatCard
        label="MODIFICATIONS"
        value={summary.modifications}
        icon={NotebookPen}
        color="orange"
        detail={`${summary.openModifications} open · ${summary.doneModifications} completed`}
      />
      <StatCard
        label="DEPLOYMENT RECORDS"
        value={summary.deployments}
        icon={Rocket}
        color="mint"
        detail={`${summary.deployed} deployed · ${summary.failedDeployments} failed`}
      />
      <StatCard
        label={workspaceCount === undefined ? "WORKSPACE XP" : "TOTAL XP"}
        value={summary.xp.toLocaleString()}
        icon={Zap}
        color="yellow"
        detail="From completed quests"
      />
    </div>
  );
}
