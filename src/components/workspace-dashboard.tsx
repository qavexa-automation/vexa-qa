"use client";

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
  Plus,
  Rocket,
  ShieldCheck,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { dashboardSummary } from "@/lib/dashboard";
import {
  filterIssuesByProject,
  filterTestsByProject,
  PRIORITIES,
  STATUSES,
  type Issue,
  type Workspace,
} from "@/lib/model";

type Destination =
  | "Quest board"
  | "Test lab"
  | "Project Maintenance"
  | "Modification Tracker"
  | "Deployment Tracker"
  | "Leaderboard"
  | "Reports";
function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
function Stat({
  label,
  value,
  detail,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <section className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <span className={`stat-icon ${color}`}>
          <Icon size={17} />
        </span>
      </div>
      <strong className="stat-value">{value}</strong>
      <div className="stat-detail">
        <span className={`detail-dot ${color}`} />
        {detail}
      </div>
    </section>
  );
}

export default function WorkspaceDashboard({
  workspace,
  search,
  heroArt,
  renderIssues,
  renderContributors,
  onNavigate,
  onCreateQuest,
  onCriticalQuests,
}: {
  workspace: Workspace;
  search: string;
  heroArt: ReactNode;
  renderIssues: (issues: Issue[], limit?: number) => ReactNode;
  renderContributors: () => ReactNode;
  onNavigate: (view: Destination) => void;
  onCreateQuest: () => void;
  onCriticalQuests: () => void;
}) {
  const summary = dashboardSummary(workspace);
  const query = search.trim().toLowerCase();
  const active = workspace.issues
    .filter(
      (issue) =>
        issue.status !== "Done" &&
        `${issue.id} ${issue.title} ${issue.assignee} ${issue.labels.join(" ")}`
          .toLowerCase()
          .includes(query),
    )
    .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));
  const link = (title: string, destination: Destination) => (
    <button className="text-button" onClick={() => onNavigate(destination)}>
      {title}
      <ArrowUpRight size={14} />
    </button>
  );
  return (
    <>
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="hero-kicker">
            <span>
              <Crosshair size={12} />
              YOUR LIVE WORKSPACE
            </span>
            <small>{summary.projects} PROJECTS</small>
          </div>
          <h2>
            Your projects.
            <br />
            <span>Your progress.</span>
          </h2>
          <p>
            {summary.total
              ? `${summary.done} completed quests. ${summary.total - summary.done} still to go.`
              : "Add a project and create your first quest."}
            <br />
            {summary.modifications} modifications · {summary.deployments} deployment records
          </p>
          <button
            className="button hero-button"
            onClick={() => onNavigate(summary.projects ? "Quest board" : "Project Maintenance")}
          >
            {summary.projects ? "Open quest board" : "Add your first project"}
            <ArrowUpRight size={16} />
          </button>
        </div>
        {heroArt}
        <div className="hero-right">
          <span className="hero-live">
            <span className="live-dot" />
            SAVED WORKSPACE DATA
          </span>
          <div className="hero-mini-stat">
            <span>QUEST COMPLETION</span>
            <strong>
              {summary.progress}
              <small>%</small>
            </strong>
            <div className="progress-track">
              <span style={{ width: `${summary.progress}%` }} />
            </div>
            <p>
              {summary.done} of {summary.total} quests complete
            </p>
          </div>
          <span className="hero-coordinate">BUILT FROM YOUR RECORDS</span>
        </div>
      </section>
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
              <span>{active.length} matching open quests</span>
              <span>Ordered by priority</span>
            </div>
            {renderIssues(active, 5)}
            <div className="panel-footer">
              <span>
                Showing {Math.min(active.length, 5)} of {active.length} active quests
              </span>
              <button className="text-button" onClick={onCreateQuest}>
                <Plus size={13} />
                Add quest
              </button>
            </div>
          </Panel>
          <Panel title="Project portfolio" action={link("Manage projects", "Project Maintenance")}>
            <div className="dashboard-table-scroll">
              <table className="dashboard-project-table">
                <thead>
                  <tr>
                    <th scope="col">Project Name</th>
                    <th scope="col">Developer</th>
                    <th scope="col">Quests done</th>
                    <th scope="col">Tests</th>
                    <th scope="col">Open modifications</th>
                    <th scope="col">Deployments</th>
                  </tr>
                </thead>
                <tbody>
                  {(workspace.projects ?? []).map((project) => {
                    const issues = filterIssuesByProject(
                      workspace.issues,
                      workspace.projects ?? [],
                      project.id,
                    );
                    const tests = filterTestsByProject(
                      workspace.tests,
                      workspace.projects ?? [],
                      project.id,
                    );
                    return (
                      <tr key={project.id}>
                        <th scope="row">{project.name}</th>
                        <td>{project.developer}</td>
                        <td>
                          {issues.filter((issue) => issue.status === "Done").length} /{" "}
                          {issues.length}
                        </td>
                        <td>{tests.length}</td>
                        <td>
                          {
                            (workspace.modifications ?? []).filter(
                              (modification) =>
                                modification.projectId === project.id &&
                                modification.status !== "Done",
                            ).length
                          }
                        </td>
                        <td>
                          {
                            (workspace.deployments ?? []).filter(
                              (deployment) => deployment.projectId === project.id,
                            ).length
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!summary.projects && (
              <div className="empty">
                <FolderKanban size={26} />
                <h3>No projects yet</h3>
                <p>Projects you add in Project Maintenance will appear here.</p>
                {link("Add a project", "Project Maintenance")}
              </div>
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
                <div className="empty">
                  <p>No quest or test activity recorded yet.</p>
                </div>
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
            <button className="text-button" onClick={onCriticalQuests}>
              View critical quests
              <ArrowUpRight size={14} />
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
