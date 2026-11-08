"use client";

import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bug,
  CheckCircle2,
  Crosshair,
  FlaskConical,
  FolderKanban,
  NotebookPen,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { dashboardBacklog, dashboardSummary } from "@/lib/dashboard";
import {
  filterIssuesByProject,
  filterTestsByProject,
  STATUSES,
  type Issue,
  type Workspace,
} from "@/lib/model";
import { EmptyState, Panel, StatCard as Stat } from "@/components/app-shell/panel";
import { PortfolioTable } from "@/components/workspace-tables/portfolio-table";

type Destination =
  | "Quest board"
  | "Test lab"
  | "Project Maintenance"
  | "Modification Tracker"
  | "Deployment Tracker"
  | "Leaderboard"
  | "Reports";

export default function WorkspaceDashboard({
  workspace,
  userName,
  search,
  renderIssues,
  renderContributors,
  onNavigate,
  onCriticalQuests,
}: {
  workspace: Workspace;
  userName?: string;
  search: string;
  renderIssues: (issues: Issue[], limit?: number) => ReactNode;
  renderContributors: () => ReactNode;
  onNavigate: (view: Destination) => void;
  onCriticalQuests: () => void;
}) {
  const summary = dashboardSummary(workspace);
  const backlog = dashboardBacklog(workspace, search);
  const link = (title: string, destination: Destination) => (
    <Button variant="link" className="h-auto p-0" onClick={() => onNavigate(destination)}>
      {title}
      <ArrowUpRight size={14} />
    </Button>
  );
  return (
    <>
      <header className="mb-6 flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div
            aria-hidden="true"
            className="relative grid size-12 shrink-0 place-items-center rounded-xl bg-brand-subtle text-brand-strong ring-1 ring-brand-border sm:size-14"
          >
            <ShieldCheck className="size-6 sm:size-7" strokeWidth={1.6} />
            <Sparkles className="absolute -top-1 -right-1 size-4 text-status-attention motion-safe:animate-[pulse_2s_ease-in-out_2]" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Your QA workspace
            </p>
            <h1 className="font-sans text-2xl leading-tight font-semibold tracking-tight text-foreground wrap-anywhere sm:text-3xl">
              {userName ? (
                <>Welcome back, <span className="text-brand-strong">{userName}</span>!</>
              ) : "Welcome, let’s get testing!"}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Ready, set, test. Let’s make today a win.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <Button className="h-10 gap-2 px-4" onClick={() => onNavigate("Quest board")}>
            View quests
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </Button>
          <Button variant="ghost" className="h-10 gap-2 px-3" onClick={() => onNavigate("Test lab")}>
            <FlaskConical aria-hidden="true" className="size-4" />
            Test lab
          </Button>
        </div>
      </header>
      <div className="stats-grid">
        <Stat
          label="PROJECTS"
          value={summary.projects}
          icon={FolderKanban}
          color="mint"
          detail="From Project Maintenance"
        />
        <Stat
          label="TOTAL QUESTS"
          value={summary.total}
          icon={Crosshair}
          color="mint"
          detail={`${summary.done} completed · ${summary.total - summary.done} open`}
        />
        <Stat
          label="OPEN BUGS"
          value={summary.bugs}
          icon={Bug}
          color="orange"
          detail={`${summary.critical} open critical quests`}
        />
        <Stat
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
        <Stat
          label="TEST CASES"
          value={summary.tests}
          icon={FlaskConical}
          color="purple"
          detail={`${summary.notTested} not tested · ${summary.failedTests} failed`}
        />
        <Stat
          label="MODIFICATIONS"
          value={summary.modifications}
          icon={NotebookPen}
          color="orange"
          detail={`${summary.openModifications} open · ${summary.doneModifications} completed`}
        />
        <Stat
          label="DEPLOYMENT RECORDS"
          value={summary.deployments}
          icon={Rocket}
          color="mint"
          detail={`${summary.deployed} deployed · ${summary.failedDeployments} failed`}
        />
        <Stat
          label="WORKSPACE XP"
          value={summary.xp.toLocaleString()}
          icon={Zap}
          color="yellow"
          detail="From completed quests"
        />
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <Panel title="Active quests" action={link("View all quests", "Quest board")}>
            <div className="dashboard-list-summary">
              <span>{backlog.length} matching backlog quests</span>
              <span>Ordered by priority</span>
            </div>
            {renderIssues(backlog, 5)}
            <div className="panel-footer">
              <span>
                Showing {Math.min(backlog.length, 5)} of {backlog.length} backlog quests
              </span>
            </div>
          </Panel>
          <Panel title="Project portfolio" action={link("Manage projects", "Project Maintenance")}>
            <PortfolioTable
              rows={(workspace.projects ?? []).map((project) => {
                const issues = filterIssuesByProject(
                  workspace.issues,
                  workspace.projects ?? [],
                  project.id,
                );
                return {
                  id: project.id,
                  name: project.name,
                  developer: project.developer,
                  questsDone: issues.filter((issue) => issue.status === "Completed").length,
                  questsTotal: issues.length,
                  tests: filterTestsByProject(workspace.tests, workspace.projects ?? [], project.id)
                    .length,
                  openModifications: (workspace.modifications ?? []).filter(
                    (modification) =>
                      modification.projectId === project.id && modification.status !== "Completed",
                  ).length,
                  deployments: (workspace.deployments ?? []).filter(
                    (deployment) => deployment.projectId === project.id,
                  ).length,
                };
              })}
            />
            {!summary.projects && (
              <EmptyState
                icon={FolderKanban}
                title={<>No projects yet</>}
                description={<>Projects you add in Project Maintenance will appear here.</>}
              >
                {link("Add a project", "Project Maintenance")}
              </EmptyState>
            )}
          </Panel>
          <Panel title="Work and delivery status">
            <div className="dashboard-pipeline">
              <div>
                <h3>Quests</h3>
                {STATUSES.map((status) => (
                  <div className="dashboard-count-row" key={status}>
                    <span>{status}</span>
                    <strong>{summary.questStatuses[status]}</strong>
                  </div>
                ))}
                {link("Open quest board", "Quest board")}
              </div>
              <div>
                <h3>Modifications</h3>
                {STATUSES.map((status) => (
                  <div className="dashboard-count-row" key={status}>
                    <span>{status}</span>
                    <strong>
                      {
                        (workspace.modifications ?? []).filter(
                          (modification) => modification.status === status,
                        ).length
                      }
                    </strong>
                  </div>
                ))}
                {link("Open modifications", "Modification Tracker")}
              </div>
              <div>
                <h3>Deployments</h3>
                {[
                  ["Planned", summary.plannedDeployments],
                  ["In progress", summary.activeDeployments],
                  ["Deployed", summary.deployed],
                  ["Failed", summary.failedDeployments],
                  ["Rolled back", summary.rolledBackDeployments],
                ].map(([label, count]) => (
                  <div className="dashboard-count-row" key={label}>
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
                {link("Open deployments", "Deployment Tracker")}
              </div>
            </div>
          </Panel>
          <Panel title="Quest and test activity" action={link("View log", "Reports")}>
            <div className="activity-list">
              {workspace.activity.slice(0, 4).map((event) => (
                <div className="activity-row" key={event.id}>
                  <span className="activity-icon">
                    <CheckCircle2 size={15} />
                  </span>
                  <p>{event.text}</p>
                  <time>
                    {new Date(event.date).toLocaleString("en-PH", {
                      timeZone: "Asia/Manila",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
              ))}
              {!workspace.activity.length && (
                <EmptyState description={<>No quest or test activity recorded yet.</>} />
              )}
            </div>
          </Panel>
        </div>
        <div className="dashboard-side">
          <Panel title="Developer contributions" action={<Trophy size={17} className="gold" />}>
            {renderContributors()}
            <button className="panel-link" onClick={() => onNavigate("Leaderboard")}>
              View all developers
              <ArrowRight size={14} />
            </button>
          </Panel>
          <Panel title="Test results" action={link("Test lab", "Test lab")}>
            <div className="dashboard-quality">
              {[
                ["Passed", summary.passed],
                ["Failed", summary.failedTests],
                ["Not Applicable", summary.notApplicable],
                ["Not Tested", summary.notTested],
              ].map(([label, count]) => (
                <div className="dashboard-count-row" key={label}>
                  <span>{label}</span>
                  <strong>{count}</strong>
                </div>
              ))}
              <div className="progress-track">
                <span style={{ width: `${summary.passRate}%` }} />
              </div>
              <p>
                {summary.run
                  ? `${summary.passRate}% passed among executed tests.`
                  : "Record a Passed or Failed result to calculate pass rate."}
              </p>
              <small>Not Applicable and Not Tested are excluded.</small>
            </div>
          </Panel>
          <section className="challenge-card">
            <div className="challenge-top">
              <span>CRITICAL QUESTS</span>
              <span className="challenge-icon">
                <Target size={22} />
              </span>
            </div>
            <h3>
              {summary.criticalTotal
                ? `${summary.critical} still need attention.`
                : "No critical quests recorded."}
            </h3>
            <p>
              {summary.criticalTotal
                ? `${summary.criticalDone} of ${summary.criticalTotal} critical quests are complete.`
                : "Critical quests will appear here when you add them."}
            </p>
            <div className="challenge-progress">
              <span>
                {summary.criticalDone} / {summary.criticalTotal} completed
              </span>
              <strong>
                <Zap size={12} />
                {summary.criticalXp} XP REMAINING
              </strong>
            </div>
            <div className="progress-track">
              <span
                style={{
                  width: `${summary.criticalTotal ? (summary.criticalDone / summary.criticalTotal) * 100 : 0}%`,
                }}
              />
            </div>
            <Button variant="link" className="h-auto p-0" onClick={onCriticalQuests}>
              View critical quests
              <ArrowUpRight size={14} />
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}
