"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Bug,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Code2,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  FolderKanban,
  Filter,
  FlaskConical,
  GitBranch as Github,
  LayoutDashboard,
  ListTodo,
  LoaderCircle,
  LogIn,
  LogOut,
  Medal,
  Menu,
  MoreHorizontal,
  NotebookPen,
  Plus,
  Rocket,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  Skull,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  filterTestsByProject,
  filterIssuesByProject,
  metrics,
  moveIssue,
  PRIORITIES,
  runTest,
  STATUSES,
  TYPES,
  TEST_STATUSES,
  updateProjects,
  type Issue,
  type Project,
  type Priority,
  type Status,
  type TestCase,
  type Workspace,
} from "@/lib/model";
import { LOCAL_WORKSPACE_BACKUP_KEY, useWorkspace } from "@/lib/use-workspace";
import { supabase } from "@/lib/supabase";
import ProjectMaintenance from "@/components/project-maintenance";
import TestCaseTable from "@/components/test-case-table";
import DeploymentTracker from "@/components/deployment-tracker";
import ModificationTracker from "@/components/modification-tracker";
import WorkspaceDashboard from "@/components/workspace-dashboard";
import { workspaceContributors } from "@/lib/dashboard";
import WorkspaceSharing from "@/components/workspace-sharing";

type View =
  | "Overview"
  | "Quest board"
  | "Modification Tracker"
  | "Test lab"
  | "Reports"
  | "Leaderboard"
  | "Achievements"
  | "Integrations"
  | "Project Maintenance"
  | "Deployment Tracker"
  | "Settings";
const navigation: { title: string; items: { name: View; icon: LucideIcon }[] }[] = [
  {
    title: "WORKSPACE",
    items: [
      { name: "Overview", icon: LayoutDashboard },
      { name: "Quest board", icon: ListTodo },
      { name: "Modification Tracker", icon: NotebookPen },
      { name: "Test lab", icon: FlaskConical },
      { name: "Reports", icon: BarChart3 },
    ],
  },
  {
    title: "YOUR GUILD",
    items: [
      { name: "Leaderboard", icon: Users },
      { name: "Achievements", icon: Trophy },
    ],
  },
  {
    title: "MANAGE",
    items: [
      { name: "Project Maintenance", icon: FolderKanban },
      { name: "Deployment Tracker", icon: Rocket },
      { name: "Integrations", icon: Code2 },
      { name: "Settings", icon: Settings },
    ],
  },
];
const icons: Record<Issue["type"], LucideIcon> = { Bug, Task: CheckCheck, Story: BookOpen };
const descriptions: Record<View, string> = {
  Overview: "Your next great release starts here.",
  "Quest board": "Every issue is a quest. Make your next move.",
  "Modification Tracker": "Track project changes, modules, and modification progress.",
  "Test lab": "Put every flow to the test. Leave nothing to chance.",
  Reports: "The numbers behind your next release.",
  Leaderboard: "Great releases are a team sport.",
  Achievements: "Small wins. Legendary progress.",
  Integrations: "Your stack. One connected command center.",
  "Project Maintenance": "Maintain project names, departments/sections, and developers.",
  "Deployment Tracker": "Track project releases, environments, and deployment progress.",
  Settings: "Make this workspace your own.",
};
function Avatar({ name, size = "" }: { name: string; size?: string }) {
  const clean = name.trim();
  const parts = clean.split(/\s+/);
  const initials =
    parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : clean.slice(0, 2);
  const colors = ["mint", "purple", "orange", "blue"];
  const color =
    colors[[...clean].reduce((sum, character) => sum + character.charCodeAt(0), 0) % colors.length];
  return (
    <span className={`avatar ${color} ${size}`} title={name}>
      {initials.toUpperCase() || "?"}
    </span>
  );
}
function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`priority ${priority.toLowerCase()}`}>
      {priority === "Critical" ? (
        <ArrowUp size={12} />
      ) : priority === "High" ? (
        <ArrowUp size={12} />
      ) : priority === "Low" ? (
        <ArrowDown size={12} />
      ) : (
        <span>＝</span>
      )}
      {priority}
    </span>
  );
}
function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status ${status.toLowerCase().replaceAll(" ", "-")}`}>
      <i />
      {status}
    </span>
  );
}
function Panel({
  title,
  eyebrow,
  action,
  children,
  className = "",
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">VEXA WORKSPACE</span>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function OrbitArt() {
  return (
    <div className="orbit-art" aria-hidden="true">
      <svg viewBox="0 0 340 220" fill="none">
        <defs>
          <linearGradient
            id="orb"
            x1="115"
            y1="35"
            x2="220"
            y2="190"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#b9fa63" />
            <stop offset="1" stopColor="#244c36" />
          </linearGradient>
          <radialGradient id="glow">
            <stop stopColor="#92f34f" stopOpacity=".22" />
            <stop offset="1" stopColor="#92f34f" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="177" cy="110" r="110" fill="url(#glow)" />
        <ellipse
          cx="177"
          cy="112"
          rx="132"
          ry="43"
          stroke="#91c66c"
          strokeOpacity=".3"
          transform="rotate(-27 177 112)"
        />
        <ellipse
          cx="177"
          cy="112"
          rx="112"
          ry="60"
          stroke="#91c66c"
          strokeOpacity=".22"
          transform="rotate(30 177 112)"
        />
        <path
          d="m177 28 66 38v77l-66 39-66-39V66z"
          fill="#254734"
          stroke="#bafa53"
          strokeOpacity=".5"
        />
        <path
          d="m177 39 56 33v64l-56 33-56-33V72z"
          fill="url(#orb)"
          fillOpacity=".13"
          stroke="#c5f790"
          strokeOpacity=".3"
        />
        <path d="m148 78 18 37 25-53h21l-46 91-39-75z" fill="url(#orb)" />
        <path d="m177 28 66 38-66 38-66-38m66 38v78" stroke="#bafa53" strokeOpacity=".12" />
        <circle cx="60" cy="146" r="5" fill="#bcfa62" />
        <circle cx="284" cy="62" r="3" fill="#bcfa62" />
        <path d="M273 163h14m-7-7v14M75 57h10m-5-5v10" stroke="#bafa53" strokeOpacity=".5" />
        <path d="M132 193h90" stroke="#bafa53" strokeOpacity=".25" />
        <path d="M151 199h52" stroke="#bafa53" strokeOpacity=".12" />
      </svg>
      <span className="orbit-caption">BUILD. TEST. LEVEL UP.</span>
    </div>
  );
}

export default function CommandCenter() {
  const {
    workspace,
    setWorkspace,
    user,
    owner,
    sharedWorkspaces,
    ready,
    sync,
    error,
    reload,
    hasLocalBackup,
    switchWorkspace,
    joinWorkspace,
    flush,
  } = useWorkspace();
  const [view, setView] = useState<View>("Overview");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("All priorities");
  const [typeFilter, setTypeFilter] = useState("All types");
  const [questProjectFilter, setQuestProjectFilter] = useState("");
  const [mine, setMine] = useState(false);
  const [newStatus, setNewStatus] = useState<Status>("Backlog");
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(
          e.target instanceof HTMLElement &&
          (e.target.matches("input, textarea, select") || e.target.isContentEditable)
        ) &&
        !document.querySelector("dialog[open]")
      ) {
        e.preventDefault();
        searchInput.current?.focus();
      }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  const [issueModal, setIssueModal] = useState<Issue | "new" | null>(null);
  const [testModal, setTestModal] = useState<TestCase | "new" | null>(null);
  const [authModal, setAuthModal] = useState(false);
  const [help, setHelp] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [toast, setToast] = useState("");
  const [listMode, setListMode] = useState(false);
  const [dropColumn, setDropColumn] = useState<Status | null>(null);
  const [testFilter, setTestFilter] = useState("All tests");
  const [testProjectFilter, setTestProjectFilter] = useState("");
  const [compact, setCompact] = useState(false);
  const m = metrics(workspace);
  const profileName =
    typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : (user?.email?.split("@")[0] ?? "Local workspace");
  const matchesIdentity = (name: string) =>
    !!user &&
    [profileName, user.email, user.email?.split("@")[0]].some(
      (identity) => identity?.trim().toLowerCase() === name.trim().toLowerCase(),
    );
  const projects = workspace.projects ?? [];
  const selectedQuestProject = projects.find((project) => project.id === questProjectFilter);
  const activeQuestProjectFilter = selectedQuestProject?.id ?? "";
  const selectedTestProject = projects.find((project) => project.id === testProjectFilter);
  const activeTestProjectFilter = selectedTestProject?.id ?? "";
  const projectTests = filterTestsByProject(workspace.tests, projects, activeTestProjectFilter);
  const testMetrics = metrics({ ...workspace, tests: projectTests });
  const visibleTests = projectTests.filter(
    (test) =>
      (testFilter === "All tests" || test.status === testFilter) &&
      `${test.title} ${test.id} ${test.suite}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const notify = (message: string) => setToast(message);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(timer);
  }, [toast]);
  const navigate = (next: View) => {
    setView(next);
    setSearch("");
    setSidebar(false);
    setNotifications(false);
  };
  const updateStatus = (id: string, status: Status) => {
    if (!ready) return;
    const issue = workspace.issues.find((i) => i.id === id);
    setWorkspace((w) => moveIssue(w, id, status));
    if (status === "Done" && issue?.status !== "Done")
      notify(`Quest complete! +${issue?.xp ?? 0} XP earned`);
  };
  const filtered = filterIssuesByProject(
    workspace.issues,
    projects,
    view === "Quest board" ? activeQuestProjectFilter : "",
  ).filter(
    (i) =>
      `${i.id} ${i.title} ${i.labels.join(" ")} ${i.assignee}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (priority === "All priorities" || i.priority === priority) &&
      (typeFilter === "All types" || i.type === typeFilter) &&
      (!mine || !user || matchesIdentity(i.assignee)),
  );
  const downloadJson = (data: string, filename: string) => {
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportWorkspace = () => {
    downloadJson(JSON.stringify(workspace, null, 2), "vexa-workspace.json");
    notify("Workspace backup downloaded");
  };
  const exportOriginalLocalWorkspace = () => {
    try {
      const backup = localStorage.getItem(LOCAL_WORKSPACE_BACKUP_KEY);
      if (!backup) {
        notify("No pre-cleanup backup is available");
        return;
      }
      downloadJson(backup, "vexa-before-sample-cleanup.json");
      notify("Original local workspace backup downloaded");
    } catch {
      notify("Unable to read the local backup");
    }
  };
  const rank = workspaceContributors(workspace);

  function issueRows(issues: Issue[], limit?: number) {
    return (
      <div className="issue-table-wrap">
        <table className="issue-table">
          <thead>
            <tr>
              <th>PROJECT TITLE</th>
              <th>PRIORITY</th>
              <th>STATUS</th>
              <th>ASSIGNEE</th>
              <th>REWARD</th>
              <th>
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {issues.slice(0, limit ?? issues.length).map((issue) => {
              const Icon = icons[issue.type];
              return (
                <tr key={issue.id} onClick={() => setIssueModal(issue)}>
                  <td>
                    <button className="quest-title" onClick={() => setIssueModal(issue)}>
                      <span className={`type-icon ${issue.type.toLowerCase()}`}>
                        <Icon size={14} />
                      </span>
                      <span>
                        <small>{issue.id}</small>
                        <strong>{issue.title}</strong>
                      </span>
                    </button>
                  </td>
                  <td>
                    <PriorityBadge priority={issue.priority} />
                  </td>
                  <td>
                    <StatusBadge status={issue.status} />
                  </td>
                  <td>
                    <Avatar name={issue.assignee} />
                  </td>
                  <td>
                    <span className="xp">
                      <Zap size={12} />
                      {issue.xp} XP
                    </span>
                  </td>
                  <td>
                    <ChevronRight size={14} className="muted" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!issues.length && (
          <div className="empty">
            <Search size={26} />
            <h3>No quests found</h3>
            <p>Try another filter or create your first quest.</p>
          </div>
        )}
      </div>
    );
  }

  function leaderboard(full = false) {
    return (
      <div className={`leaderboard ${full ? "full-leaderboard" : ""}`}>
        {rank.slice(0, full ? rank.length : 4).map((member, index) => (
          <div className="leader-row" key={member.name}>
            <span className={`rank rank-${index}`}>
              {index === 0 && member.xp > 0 ? (
                <Medal size={18} />
              ) : (
                String(index + 1).padStart(2, "0")
              )}
            </span>
            <Avatar name={member.name} size={full ? "large" : ""} />
            <div className="leader-name">
              <strong>
                {member.name}
                {matchesIdentity(member.name) && <small>YOU</small>}
              </strong>
              <span>{full ? member.role : `${member.completed} quests completed`}</span>
            </div>
            <span className="leader-xp">
              {member.xp}
              <small> XP</small>
            </span>
          </div>
        ))}
        {!rank.length && (
          <div className="empty">
            <Users size={24} />
            <h3>No developers yet</h3>
            <p>Add project developers or assign a quest to see contributions.</p>
          </div>
        )}
        <div className="sample-note">Based on saved developers and quest assignments</div>
      </div>
    );
  }

  return (
    <div className={`app ${compact ? "compact" : ""}`}>
      {sidebar && <div className="sidebar-scrim" onClick={() => setSidebar(false)} />}
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
        <button className="brand" onClick={() => navigate("Overview")} aria-label="Vexa overview">
          <span>
            vexa<span className="brand-dot">.</span>
          </span>
          <span className="brand-qa">QA</span>
        </button>
        <p className="brand-tagline">Verification and Execution Automation</p>
        <nav>
          {navigation.map((group) => (
            <div className="nav-group" key={group.title}>
              <span className="nav-label">{group.title}</span>
              {group.items.map(({ name, icon: Icon }) => (
                <button
                  className={`nav-item ${view === name ? "active" : ""}`}
                  key={name}
                  onClick={() => navigate(name)}
                >
                  <Icon size={18} />
                  <span>{name}</span>
                  {name === "Quest board" && <span className="nav-count">{m.total - m.done}</span>}
                  {name === "Achievements" && <span className="new-dot" />}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="level-card">
            <div className="level-top">
              <span className="level-icon">
                <Shield size={18} />
              </span>
              <div>
                <strong>Level {Math.floor(m.xp / 500) + 1}</strong>
                <small>{m.xp >= 500 ? "Quality guardian" : "Rising explorer"}</small>
              </div>
              <Sparkles size={15} />
            </div>
            <div className="progress-track">
              <span style={{ width: `${(m.xp % 500) / 5}%` }} />
            </div>
            <div className="level-meta">
              <span>{m.xp % 500} / 500 XP</span>
              <span>
                Next level <ArrowUpRight size={10} />
              </span>
            </div>
          </div>
          <button className="help-button" onClick={() => setHelp(true)}>
            <CircleHelp size={17} />
            Help & getting started
            <ArrowUpRight size={13} />
          </button>
          <button
            className="profile"
            onClick={() => (user ? navigate("Settings") : setAuthModal(true))}
          >
            <Avatar name={profileName} />
            <div>
              <strong>{profileName}</strong>
              <small>{user ? "Cloud workspace" : "Saved on this device"}</small>
            </div>
            <ChevronRight size={14} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              onClick={() => setSidebar(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb-home">Workspace</span>
            <ChevronRight size={13} />
            <strong>{view}</strong>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <Search size={15} />
              <input
                ref={searchInput}
                aria-label="Search workspace"
                placeholder={
                  view === "Modification Tracker"
                    ? "Search modifications…"
                    : view === "Deployment Tracker"
                      ? "Search deployments…"
                      : view === "Project Maintenance"
                        ? "Search projects…"
                        : view === "Test lab"
                          ? "Search test cases…"
                          : "Search quests…"
                }
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (
                    ![
                      "Quest board",
                      "Test lab",
                      "Overview",
                      "Project Maintenance",
                      "Deployment Tracker",
                      "Modification Tracker",
                    ].includes(view)
                  )
                    setView("Quest board");
                }}
              />
              <kbd>/</kbd>
            </label>
            <span className="demo-badge">
              <i />
              {user ? "CLOUD" : "LOCAL MODE"}
            </span>
            <div className="notification-wrap">
              <button
                className="icon-button notification-button"
                onClick={() => setNotifications(!notifications)}
                aria-label="Recent activity"
                aria-expanded={notifications}
              >
                <Bell size={19} />
                {workspace.activity.length > 0 && <i />}
              </button>
              {notifications && (
                <div className="notification-popover">
                  <h3>Latest activity</h3>
                  {workspace.activity.slice(0, 5).map((a) => (
                    <div key={a.id}>
                      <span className="activity-dot" />
                      <p>{a.text}</p>
                    </div>
                  ))}
                  {!workspace.activity.length && (
                    <p>No activity yet. Your next quest starts here.</p>
                  )}
                  <button
                    className="text-button"
                    onClick={() => {
                      setNotifications(false);
                      navigate("Reports");
                    }}
                  >
                    View activity <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>
            <div className="topbar-divider" />
            <Avatar name={profileName} />
          </div>
        </header>
        <main>
          <div className={`page-heading ${view === "Test lab" ? "test-lab-heading" : ""}`}>
            <div>
              <div className="page-eyebrow">
                <span className="tiny-cross">✦</span>{" "}
                {view === "Overview" ? "YOUR MISSION CONTROL" : "VEXA QA WORKSPACE"}
              </div>
              <h1>
                {view === "Overview" ? (
                  <>
                    Let’s build something <span>great.</span>
                  </>
                ) : (
                  view
                )}
              </h1>
              <p>{descriptions[view]}</p>
            </div>
            <div className={`heading-actions ${view === "Test lab" ? "test-lab-actions" : ""}`}>
              {view === "Test lab" && (
                <select
                  className="test-project-filter"
                  aria-label="Filter test cases by project"
                  disabled={!ready}
                  value={activeTestProjectFilter}
                  onChange={(event) => setTestProjectFilter(event.target.value)}
                >
                  <option value="">All projects</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
              {view === "Overview" && (
                <span className="sprint-chip">
                  <span className="live-dot" />
                  All saved records
                </span>
              )}
              {["Overview", "Quest board"].includes(view) ? (
                <button
                  disabled={!ready}
                  className="button primary"
                  onClick={() => {
                    setNewStatus("Backlog");
                    setIssueModal("new");
                  }}
                >
                  <Plus size={17} />
                  Create quest
                </button>
              ) : view === "Test lab" ? (
                <button
                  disabled={!ready}
                  className="button primary"
                  onClick={() => setTestModal("new")}
                >
                  <Plus size={17} />
                  New test case
                </button>
              ) : view === "Reports" ? (
                <button className="button secondary" onClick={exportWorkspace}>
                  <Download size={16} />
                  Export data
                </button>
              ) : null}
            </div>
          </div>
          {error && (
            <div className="error-banner">
              <Shield size={18} />
              <span>
                {error} Your current data is still visible; export a backup before reloading.
              </span>
              <button onClick={exportWorkspace}>Export</button>
              <button onClick={() => void reload()}>Reload</button>
              {user && (
                <button onClick={() => void supabase?.auth.signOut()}>
                  Return to local workspace
                </button>
              )}
            </div>
          )}
          {!ready && !error && (
            <div className="loading-line">
              <LoaderCircle size={14} className="spin" />
              Loading your workspace…
            </div>
          )}
          <fieldset disabled={!ready || !!error} className="workspace-content">
            {view === "Overview" && (
              <WorkspaceDashboard
                workspace={workspace}
                search={search}
                heroArt={<OrbitArt />}
                renderIssues={issueRows}
                renderContributors={leaderboard}
                onNavigate={navigate}
                onCreateQuest={() => {
                  setNewStatus("Backlog");
                  setIssueModal("new");
                }}
                onCriticalQuests={() => {
                  navigate("Quest board");
                  setPriority("Critical");
                  setTypeFilter("All types");
                  setQuestProjectFilter("");
                  setMine(false);
                }}
              />
            )}
            {view === "Quest board" && (
              <>
                <div className="board-banner">
                  <div>
                    <span className="sprint-chip">
                      <span className="live-dot" />
                      {workspace.sprint}
                    </span>
                    <h3>{workspace.sprintGoal}</h3>
                    <p>
                      {m.done} completed · {m.total - m.done} to go · {m.xp} XP earned
                    </p>
                  </div>
                  <div className="board-squad">
                    <div className="avatar-stack">
                      {rank.slice(0, 4).map((t) => (
                        <Avatar key={t.name} name={t.name} />
                      ))}
                    </div>
                    <span>THE QA SQUAD</span>
                  </div>
                </div>
                <div className="filter-bar">
                  <div className="filter-controls">
                    <Filter size={15} className="muted" />
                    <select
                      aria-label="Filter by priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option>All priorities</option>
                      {PRIORITIES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by type"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option>All types</option>
                      {TYPES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <select
                      className="quest-project-filter"
                      aria-label="Filter by project title"
                      value={activeQuestProjectFilter}
                      onChange={(event) => setQuestProjectFilter(event.target.value)}
                    >
                      <option value="">All project titles</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    <button
                      className={`button small ${mine ? "selected-filter" : "ghost"}`}
                      disabled={!user}
                      title={
                        !user
                          ? "Sign in to match quests to your account name or email"
                          : "Show quests assigned to your account"
                      }
                      onClick={() => setMine(!mine)}
                    >
                      Assigned to me
                    </button>
                    {(priority !== "All priorities" ||
                      typeFilter !== "All types" ||
                      activeQuestProjectFilter ||
                      mine ||
                      search) && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setPriority("All priorities");
                          setTypeFilter("All types");
                          setQuestProjectFilter("");
                          setMine(false);
                          setSearch("");
                        }}
                      >
                        Clear filters <X size={12} />
                      </button>
                    )}
                  </div>
                  <div className="view-toggle">
                    <button
                      className={!listMode ? "selected" : ""}
                      aria-label="Board view"
                      onClick={() => setListMode(false)}
                    >
                      <LayoutDashboard size={15} />
                    </button>
                    <button
                      className={listMode ? "selected" : ""}
                      aria-label="List view"
                      onClick={() => setListMode(true)}
                    >
                      <ListTodo size={16} />
                    </button>
                  </div>
                </div>
                {listMode ? (
                  <div className="panel">{issueRows(filtered)}</div>
                ) : (
                  <div className="kanban">
                    {STATUSES.map((status) => (
                      <section
                        key={status}
                        className={`kanban-column ${dropColumn === status ? "drag-over" : ""}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDropColumn(status);
                        }}
                        onDragLeave={() => setDropColumn(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          updateStatus(e.dataTransfer.getData("text/plain"), status);
                          setDropColumn(null);
                        }}
                      >
                        <div className="column-heading">
                          <StatusBadge status={status} />
                          <span>{filtered.filter((i) => i.status === status).length}</span>
                          <button
                            aria-label={`Add quest to ${status}`}
                            className="icon-button"
                            onClick={() => setIssueModal("new")}
                          >
                            <Plus size={15} />
                          </button>
                        </div>
                        <div className="column-cards">
                          {filtered
                            .filter((i) => i.status === status)
                            .map((issue) => {
                              const Icon = icons[issue.type];
                              return (
                                <button
                                  draggable
                                  onDragStart={(e) =>
                                    e.dataTransfer.setData("text/plain", issue.id)
                                  }
                                  onDragEnd={() => setDropColumn(null)}
                                  className="quest-card"
                                  key={issue.id}
                                  onClick={() => setIssueModal(issue)}
                                >
                                  <div className="quest-card-top">
                                    <span className={`type-icon ${issue.type.toLowerCase()}`}>
                                      <Icon size={13} />
                                    </span>
                                    <span>{issue.id}</span>
                                    <MoreHorizontal size={16} />
                                  </div>
                                  <h3>{issue.title}</h3>
                                  <div className="tags">
                                    {issue.labels.map((l) => (
                                      <span key={l}>{l}</span>
                                    ))}
                                  </div>
                                  <div className="quest-card-bottom">
                                    <PriorityBadge priority={issue.priority} />
                                    <span className="xp">
                                      <Zap size={11} />
                                      {issue.xp}
                                    </span>
                                    <Avatar name={issue.assignee} size="small" />
                                  </div>
                                </button>
                              );
                            })}
                          <button className="add-card" onClick={() => setIssueModal("new")}>
                            <Plus size={14} />
                            Add quest
                          </button>
                        </div>
                      </section>
                    ))}
                  </div>
                )}
                <p className="board-help">
                  <CircleHelp size={13} />
                  Drag quests between columns, or open a quest to update its status.
                </p>
              </>
            )}
            {view === "Modification Tracker" && (
              <ModificationTracker
                projects={workspace.projects ?? []}
                modifications={workspace.modifications ?? []}
                search={search}
                onChange={(modifications) => setWorkspace((w) => ({ ...w, modifications }))}
                onNotice={notify}
                onManageProjects={() => navigate("Project Maintenance")}
              />
            )}
            {view === "Test lab" && (
              <>
                <div className="stats-grid three">
                  <Stat
                    label="TEST CASES"
                    value={projectTests.length}
                    icon={FlaskConical}
                    color="purple"
                    detail="Your manual regression library"
                  />
                  <Stat
                    label="PASSING TESTS"
                    value={testMetrics.passed}
                    icon={CheckCircle2}
                    color="mint"
                    detail={`${testMetrics.passRate}% pass rate of executed tests`}
                  />
                  <Stat
                    label="NEEDS ATTENTION"
                    value={projectTests.filter((t) => t.status === "Failed").length}
                    icon={Bug}
                    color="orange"
                    detail={`${projectTests.filter((t) => t.status === "Not Tested").length} tests waiting to be tested`}
                  />
                </div>
                <Panel
                  title="Regression library"
                  action={
                    <select
                      value={testFilter}
                      aria-label="Filter tests"
                      onChange={(e) => setTestFilter(e.target.value)}
                    >
                      {["All tests", ...TEST_STATUSES].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  }
                >
                  <div className="test-list">
                    <TestCaseTable
                      tests={visibleTests}
                      onEdit={setTestModal}
                      onStatusChange={(id, status) => {
                        setWorkspace((w) => runTest(w, id, status));
                        notify(
                          `${id}: ${status === "Not Tested" ? "reset to Not Tested" : `${status} result recorded`}`,
                        );
                      }}
                    />
                    {!visibleTests.length && (
                      <div className="empty">
                        <FlaskConical size={28} />
                        <h3>No matching test cases</h3>
                        <p>Add a test case or adjust your project, status, or search filters.</p>
                        {(activeTestProjectFilter || testFilter !== "All tests" || search) && (
                          <button
                            type="button"
                            className="button secondary"
                            onClick={() => {
                              setTestProjectFilter("");
                              setTestFilter("All tests");
                              setSearch("");
                            }}
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </Panel>
                <div className="info-note">
                  <CircleHelp size={16} />
                  Test results are recorded manually after you execute the steps. VEXA does not run
                  your application tests.
                </div>
              </>
            )}
            {view === "Reports" && (
              <>
                <div className="stats-grid">
                  <Stat
                    label="COMPLETION"
                    value={`${m.progress}%`}
                    icon={Target}
                    color="mint"
                    detail={`${m.done} of ${m.total} quests`}
                  />
                  <Stat
                    label="TEST COVERAGE"
                    value={workspace.tests.length}
                    icon={FileCheck2}
                    color="purple"
                    detail="Documented manual test cases"
                  />
                  <Stat
                    label="PASS RATE"
                    value={`${m.passRate}%`}
                    icon={ShieldCheck}
                    color="mint"
                    detail="Of tests with recorded results"
                  />
                  <Stat
                    label="CRITICAL OPEN"
                    value={m.critical}
                    icon={Skull}
                    color="orange"
                    detail="Resolve before release"
                  />
                </div>
                <div className="reports-grid">
                  <Panel title="Quest distribution" eyebrow="CURRENT WORKSPACE">
                    <div className="bar-chart">
                      {STATUSES.map((status) => {
                        const count = workspace.issues.filter((i) => i.status === status).length;
                        return (
                          <div className="chart-row" key={status}>
                            <StatusBadge status={status} />
                            <div className="chart-track">
                              <span
                                className={status.toLowerCase().replaceAll(" ", "-")}
                                style={{ width: `${m.total ? (count / m.total) * 100 : 0}%` }}
                              />
                            </div>
                            <strong>{count}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                  <Panel title="Issues by priority" eyebrow="OPEN QUESTS">
                    <div className="bar-chart">
                      {PRIORITIES.map((p) => {
                        const count = workspace.issues.filter(
                          (i) => i.priority === p && i.status !== "Done",
                        ).length;
                        return (
                          <div className="chart-row" key={p}>
                            <PriorityBadge priority={p} />
                            <div className="chart-track">
                              <span
                                className={p.toLowerCase()}
                                style={{
                                  width: `${m.total - m.done ? (count / (m.total - m.done)) * 100 : 0}%`,
                                }}
                              />
                            </div>
                            <strong>{count}</strong>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                </div>
                <Panel
                  title="Activity log"
                  action={
                    <span className="subtle-label">LATEST {workspace.activity.length} EVENTS</span>
                  }
                >
                  <div className="activity-list">
                    {workspace.activity.map((a) => (
                      <div className="activity-row" key={a.id}>
                        <span className="activity-icon">
                          {a.kind === "test" ? (
                            <FlaskConical size={15} />
                          ) : a.kind === "achievement" ? (
                            <Trophy size={15} />
                          ) : (
                            <Activity size={15} />
                          )}
                        </span>
                        <p>{a.text}</p>
                        <time>
                          {new Date(a.date).toLocaleString("en-PH", {
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
                        <Activity size={24} />
                        <h3>Your story starts here</h3>
                        <p>Quest updates and test results will appear here.</p>
                      </div>
                    )}
                  </div>
                </Panel>
              </>
            )}
            {view === "Leaderboard" && (
              <>
                <div className="guild-hero">
                  <span className="guild-trophy">
                    <Trophy size={40} strokeWidth={1.3} />
                  </span>
                  <div>
                    <span className="eyebrow">BETTER TOGETHER</span>
                    <h2>Every quest has its heroes.</h2>
                    <p>
                      Your squad has earned <strong>{m.xp} XP</strong> across{" "}
                      <strong>{m.done} completed quests.</strong>
                    </p>
                  </div>
                  <span className="sprint-chip">{workspace.sprint}</span>
                </div>
                <Panel
                  title="The quality guardians"
                  action={<span className="subtle-label">RANKED BY COMPLETED QUEST XP</span>}
                >
                  {leaderboard(true)}
                </Panel>
                <div className="info-note">
                  <Users size={16} />
                  Rankings use developer assignment labels. Manage team access and invite teammates
                  from Settings → Shared workspaces.
                </div>
              </>
            )}
            {view === "Achievements" && (
              <>
                <div className="achievement-intro">
                  <div>
                    <span className="eyebrow">YOUR TROPHY ROOM</span>
                    <h2>A little progress. A lot of possibility.</h2>
                    <p>Unlock milestones by completing quests and recording test results.</p>
                  </div>
                  <Trophy size={48} className="gold" strokeWidth={1.2} />
                </div>
                <div className="achievement-grid">
                  {[
                    {
                      title: "First blood",
                      description: "Complete your first bug quest.",
                      icon: Bug,
                      count: workspace.issues.filter((i) => i.type === "Bug" && i.status === "Done")
                        .length,
                      goal: 1,
                      color: "orange",
                    },
                    {
                      title: "Quest conqueror",
                      description: "Complete 10 quests in your workspace.",
                      icon: Swords,
                      count: m.done,
                      goal: 10,
                      color: "mint",
                    },
                    {
                      title: "Test pilot",
                      description: "Record results for 10 test cases.",
                      icon: FlaskConical,
                      count: m.run,
                      goal: 10,
                      color: "purple",
                    },
                    {
                      title: "Power surge",
                      description: "Earn a total of 1,000 squad XP.",
                      icon: Zap,
                      count: m.xp,
                      goal: 1000,
                      color: "yellow",
                    },
                    {
                      title: "Green guardian",
                      description: "Have 10 passing test cases.",
                      icon: ShieldCheck,
                      count: m.passed,
                      goal: 10,
                      color: "mint",
                    },
                    {
                      title: "Legendary release",
                      description: "Complete 25 quests. Keep going.",
                      icon: Trophy,
                      count: m.done,
                      goal: 25,
                      color: "yellow",
                    },
                  ].map((a) => (
                    <section
                      className={`achievement-card ${a.count >= a.goal ? "unlocked" : ""}`}
                      key={a.title}
                    >
                      <span className={`achievement-icon ${a.color}`}>
                        <a.icon size={30} strokeWidth={1.4} />
                      </span>
                      <span className={`unlock-badge ${a.count >= a.goal ? "earned" : ""}`}>
                        {a.count >= a.goal ? (
                          <>
                            <Check size={11} />
                            UNLOCKED
                          </>
                        ) : (
                          "IN PROGRESS"
                        )}
                      </span>
                      <h3>{a.title}</h3>
                      <p>{a.description}</p>
                      <div className="achievement-count">
                        <span>
                          {Math.min(a.count, a.goal).toLocaleString()} / {a.goal.toLocaleString()}
                        </span>
                        <span>{Math.min(100, Math.round((a.count / a.goal) * 100))}%</span>
                      </div>
                      <div className="progress-track">
                        <span style={{ width: `${Math.min(100, (a.count / a.goal) * 100)}%` }} />
                      </div>
                    </section>
                  ))}
                </div>
              </>
            )}
            {view === "Integrations" && (
              <>
                <div className="integration-intro">
                  <div className="integration-orbit">
                    <Code2 size={29} />
                  </div>
                  <h2>Built for your favorite stack.</h2>
                  <p>
                    Next.js at the core. GitHub for your code. Vercel for your release.
                    <br />
                    Supabase to make your progress go the distance.
                  </p>
                </div>
                <div className="integration-grid">
                  {[
                    {
                      name: "GitHub",
                      Icon: Github,
                      color: "white",
                      status: "SETUP GUIDE",
                      text: "Version your source, review changes, and run the included CI checks on every pull request.",
                      link: "https://github.com/new",
                      button: "Create a repository",
                      features: [
                        "Git-ready project",
                        "GitHub Actions CI",
                        "Type checks + production build",
                      ],
                    },
                    {
                      name: "Vercel",
                      Icon: TriangleIcon,
                      color: "white",
                      status: "DEPLOYMENT READY",
                      text: "Deploy this Next.js application from GitHub, with preview deployments for every pull request.",
                      link: "https://vercel.com/new",
                      button: "Deploy with Vercel",
                      features: [
                        "Native Next.js deployment",
                        "Environment variable setup",
                        "Automatic deploys after linking",
                      ],
                    },
                    {
                      name: "Supabase",
                      Icon: Zap,
                      color: "mint",
                      status: user ? "SIGNED IN" : supabase ? "CONFIGURED" : "AWAITING SETUP",
                      text: "Sign in to save your QA workspace and collaborate with invited teammates in real time.",
                      link: "https://supabase.com/dashboard",
                      button: "Open Supabase",
                      features: [
                        "Email + password authentication",
                        "Protected team workspaces",
                        "Live updates and conflict-aware saves",
                      ],
                    },
                  ].map((i) => (
                    <section className="integration-card" key={i.name}>
                      <div className="integration-card-top">
                        <span className={`integration-logo ${i.color}`}>
                          <i.Icon size={28} />
                        </span>
                        <span
                          className={`integration-status ${i.status === "SIGNED IN" ? "connected" : ""}`}
                        >
                          <i />
                          {i.status}
                        </span>
                      </div>
                      <h3>{i.name}</h3>
                      <p>{i.text}</p>
                      <ul>
                        {i.features.map((f) => (
                          <li key={f}>
                            <Check size={13} />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <a
                        className="button secondary"
                        href={i.link}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {i.button}
                        <ArrowUpRight size={14} />
                      </a>
                    </section>
                  ))}
                </div>
                <div className="setup-callout">
                  <span className="setup-icon">
                    <Rocket size={23} />
                  </span>
                  <div>
                    <h3>Your launch checklist is included.</h3>
                    <p>
                      Open README.md in the project for the SQL migration, environment variables,
                      and deployment steps.
                    </p>
                  </div>
                  <button className="button secondary" onClick={() => setHelp(true)}>
                    Setup overview <ArrowRight size={14} />
                  </button>
                </div>
                <div className="info-note">
                  <CircleHelp size={16} />
                  GitHub and Vercel links open setup pages. Repository sync, issue import, and
                  deployments require you to connect your own accounts.
                </div>
              </>
            )}
            {view === "Deployment Tracker" && (
              <DeploymentTracker
                projects={workspace.projects ?? []}
                deployments={workspace.deployments ?? []}
                search={search}
                onChange={(deployments) => setWorkspace((w) => ({ ...w, deployments }))}
                onNotice={notify}
                onManageProjects={() => navigate("Project Maintenance")}
              />
            )}
            {view === "Project Maintenance" && (
              <ProjectMaintenance
                projects={workspace.projects ?? []}
                search={search}
                onChange={(projects) => setWorkspace((w) => updateProjects(w, projects))}
                onNotice={notify}
              />
            )}
            {view === "Settings" && (
              <div className="settings-layout">
                <Panel title="Workspace details" eyebrow="MAKE IT YOURS">
                  <WorkspaceSettings
                    key={owner ?? "local"}
                    workspace={workspace}
                    onSave={(sprint, sprintGoal) => {
                      setWorkspace((w) => ({ ...w, sprint, sprintGoal }));
                      notify("Workspace settings saved");
                    }}
                  />
                </Panel>
                <Panel title="Account & data">
                  <div className="settings-account">
                    <span className="eyebrow">CURRENT MODE</span>
                    <h3>
                      {user
                        ? owner === user.id
                          ? "My cloud workspace"
                          : "Shared team workspace"
                        : "Local workspace"}
                    </h3>
                    <p>
                      {user
                        ? `Signed in as ${user.email}. Changes are saved to the current workspace and update automatically for everyone with access.`
                        : "Your projects and QA records are saved in this browser. Configure Supabase and sign in to share a cloud workspace and see live updates from teammates."}
                    </p>
                    {user ? (
                      <button
                        className="button secondary"
                        onClick={async () => {
                          const result = await supabase?.auth.signOut();
                          if (result?.error) notify(result.error.message);
                          else notify("Signed out. Back to your local workspace.");
                        }}
                      >
                        <LogOut size={15} />
                        Sign out
                      </button>
                    ) : (
                      <button className="button secondary" onClick={() => setAuthModal(true)}>
                        <LogIn size={15} />
                        Connect account
                      </button>
                    )}
                    <div className="settings-divider" />
                    <h3>Keep a copy of your progress</h3>
                    <p>
                      Download your projects, quests, test cases, modifications, deployments, and
                      activity as a JSON backup.
                    </p>
                    <button className="button secondary" onClick={exportWorkspace}>
                      <Download size={15} />
                      Export workspace
                    </button>
                    {!user && hasLocalBackup && (
                      <div className="dashboard-backup-action">
                        <p>
                          Your original local workspace was preserved before untouched sample
                          records were removed.
                        </p>
                        <button className="button secondary" onClick={exportOriginalLocalWorkspace}>
                          <Download size={15} />
                          Export pre-cleanup backup
                        </button>
                      </div>
                    )}
                    <div className="settings-divider" />
                    <label className="toggle-label">
                      <div>
                        <strong>Compact layout</strong>
                        <span>Use less space between quest rows.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={compact}
                        onChange={(e) => setCompact(e.target.checked)}
                      />
                    </label>
                  </div>
                </Panel>
                {user && owner && (
                  <Panel title="Team access">
                    <WorkspaceSharing
                      key={owner}
                      userId={user.id}
                      owner={owner}
                      workspaces={sharedWorkspaces}
                      onSwitch={switchWorkspace}
                      onJoin={joinWorkspace}
                      flush={flush}
                    />
                  </Panel>
                )}
              </div>
            )}
          </fieldset>
          <footer className="app-footer">
            <span>
              <span className={`live-dot ${error ? "error-dot" : ""}`} />
              {sync}
            </span>
            <span>
              CRAFTED FOR BETTER RELEASES <span className="footer-spark">✦</span> VEXA QA
            </span>
          </footer>
        </main>
      </div>
      {issueModal && (
        <IssueDialog
          initialStatus={newStatus}
          initialProjectId={view === "Quest board" ? selectedQuestProject?.id : undefined}
          issue={issueModal}
          projects={workspace.projects ?? []}
          onManageProjects={() => {
            setIssueModal(null);
            navigate("Project Maintenance");
          }}
          onClose={() => setIssueModal(null)}
          onSave={(issue) => {
            const isNew = issueModal === "new";
            setWorkspace((w) => ({
              ...w,
              issues: isNew
                ? [issue, ...w.issues]
                : w.issues.map((i) => (i.id === issue.id ? issue : i)),
              activity: [
                {
                  id: crypto.randomUUID(),
                  text: isNew
                    ? `${issue.id} created: ${issue.title}`
                    : `${issue.id} updated${issue.status === "Done" && !isNew && issueModal.status !== "Done" ? ` · ${issue.xp} XP earned` : ""}`,
                  date: new Date().toISOString(),
                  kind: "issue" as const,
                },
                ...w.activity,
              ].slice(0, 40),
            }));
            setIssueModal(null);
            notify(isNew ? "A new quest awaits. Let’s do this!" : "Quest updated");
          }}
          onDelete={(id) => {
            setWorkspace((w) => ({
              ...w,
              issues: w.issues.filter((i) => i.id !== id),
              activity: [
                {
                  id: crypto.randomUUID(),
                  text: `${id} deleted`,
                  date: new Date().toISOString(),
                  kind: "issue" as const,
                },
                ...w.activity,
              ].slice(0, 40),
            }));
            setIssueModal(null);
            notify("Quest deleted");
          }}
        />
      )}
      {testModal && (
        <TestDialog
          test={testModal}
          initialProjectId={selectedTestProject?.id}
          projects={workspace.projects ?? []}
          onManageProjects={() => {
            setTestModal(null);
            navigate("Project Maintenance");
          }}
          onClose={() => setTestModal(null)}
          onSave={(test) => {
            setWorkspace((w) => ({
              ...w,
              tests:
                testModal === "new"
                  ? [...w.tests, test]
                  : w.tests.map((t) => (t.id === test.id ? test : t)),
            }));
            setTestModal(null);
            notify("Test case saved");
          }}
          onResult={(id, status) => {
            setWorkspace((w) => runTest(w, id, status));
            setTestModal(null);
            notify(`${id}: ${status} result recorded`);
          }}
        />
      )}
      {authModal && <AuthDialog onClose={() => setAuthModal(false)} notify={notify} />}
      {help && (
        <Modal
          title="Welcome to your command center."
          subtitle="A better release is a few quests away."
          onClose={() => setHelp(false)}
          wide
        >
          <div className="help-content">
            <div className="help-step">
              <span>01</span>
              <div>
                <h3>Explore the playground</h3>
                <p>
                  Create quests, drag them across the board, and log manual test results. Completing
                  a quest earns XP. Local changes stay on this device.
                </p>
              </div>
            </div>
            <div className="help-step">
              <span>02</span>
              <div>
                <h3>Connect your database</h3>
                <p>
                  Create a Supabase project. Run the SQL in{" "}
                  <code>supabase/migrations/001_workspace.sql</code> followed by{" "}
                  <code>002_shared_realtime.sql</code>, then add the two public environment
                  variables from <code>.env.example</code> and restart the app.
                </p>
              </div>
            </div>
            <div className="help-step">
              <span>03</span>
              <div>
                <h3>Make it your own</h3>
                <p>
                  Sign up with your email to start a separate, empty cloud workspace. Confirm your
                  email if required by your Supabase settings. In Settings, create an invite code or
                  join a teammate’s workspace to collaborate live. Your local records stay on this
                  device.
                </p>
              </div>
            </div>
            <div className="help-step">
              <span>04</span>
              <div>
                <h3>Ship your command center</h3>
                <p>
                  Push this project to GitHub, import it into Vercel, and add the same public
                  environment variables. Full instructions are in README.md.
                </p>
              </div>
            </div>
            <button className="button primary" onClick={() => setHelp(false)}>
              Let’s get started <ArrowRight size={15} />
            </button>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  color,
  detail,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  detail: string;
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
function TriangleIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3 24 23H0z" />
    </svg>
  );
}

function IssueDialog({
  initialStatus,
  initialProjectId,
  issue,
  projects,
  onManageProjects,
  onClose,
  onSave,
  onDelete,
}: {
  initialStatus: Status;
  initialProjectId?: string;
  issue: Issue | "new";
  projects: Project[];
  onManageProjects: () => void;
  onClose: () => void;
  onSave: (issue: Issue) => void;
  onDelete: (id: string) => void;
}) {
  const isNew = issue === "new";
  const linkedProject = isNew
    ? undefined
    : projects.find((project) =>
        issue.projectId ? project.id === issue.projectId : project.name === issue.title,
      );
  const [projectId, setProjectId] = useState(
    linkedProject?.id ?? (isNew ? (initialProjectId ?? "") : "__saved__"),
  );
  const selectedProject = projects.find((project) => project.id === projectId);
  const title = selectedProject?.name ?? (isNew ? "" : issue.title);
  const [description, setDescription] = useState(isNew ? "" : issue.description);
  const [status, setStatus] = useState<Status>(isNew ? initialStatus : issue.status);
  const [priority, setPriority] = useState<Priority>(isNew ? "Medium" : issue.priority);
  const [type, setType] = useState<Issue["type"]>(isNew ? "Bug" : issue.type);
  const assignee = selectedProject?.developer ?? (isNew ? "" : issue.assignee);
  const [xp, setXp] = useState(isNew ? 75 : issue.xp);
  const [labels, setLabels] = useState(isNew ? "" : issue.labels.join(", "));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (isNew && !selectedProject) return;
    if (!title.trim()) return;
    onSave({
      id: isNew ? `VXA-${crypto.randomUUID().slice(0, 8).toUpperCase()}` : issue.id,
      title: title.trim(),
      projectId: selectedProject?.id ?? (isNew ? undefined : issue.projectId),
      description: description.trim(),
      status,
      priority,
      type,
      assignee,
      xp,
      labels: [
        ...new Set(
          labels
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ].slice(0, 5),
      createdAt: isNew ? new Date().toISOString() : issue.createdAt,
    });
  };
  return (
    <Modal
      title={isNew ? "Your next quest starts here." : issue.id}
      subtitle={
        isNew
          ? "One small task. One step toward a legendary release."
          : "Update the details and keep your release moving."
      }
      onClose={onClose}
      wide
    >
      <form className="dialog-form" onSubmit={submit}>
        <label>
          Project Title
          <select
            autoFocus
            required
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="" disabled>
              Select a project name
            </option>
            {!isNew && !linkedProject && (
              <option value="__saved__" disabled>
                {issue.title} (existing title)
              </option>
            )}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <small>Project names are maintained in Manage → Project Maintenance.</small>
        </label>
        {!projects.length && (
          <div className="info-note">
            <span>Add a project in Project Maintenance to select its name here.</span>
            <button type="button" className="text-button" onClick={onManageProjects}>
              Add project <ArrowRight size={13} />
            </button>
          </div>
        )}
        <label>
          Description
          <textarea
            rows={4}
            maxLength={5000}
            placeholder="Add context, reproduction steps, or acceptance criteria…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            Quest type
            <select value={type} onChange={(e) => setType(e.target.value as Issue["type"])}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Assignee
            <input readOnly value={assignee} placeholder="Select a project first" />
            <small>Filled from the project's Developer in Project Maintenance.</small>
          </label>
          <label>
            Reward (XP)
            <input
              type="number"
              min={0}
              max={1000}
              step={25}
              required
              value={xp}
              onChange={(e) => setXp(Number(e.target.value))}
            />
          </label>
          <label>
            Labels <small>(comma separated)</small>
            <input
              maxLength={120}
              placeholder="Checkout, API"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
            />
          </label>
        </div>
        <div className="modal-footer">
          {!isNew && (
            <button
              type="button"
              className="text-button danger"
              onClick={() => (confirmDelete ? onDelete(issue.id) : setConfirmDelete(true))}
            >
              {confirmDelete ? "Confirm delete quest" : "Delete quest"}
            </button>
          )}
          <span className="flex-spacer" />
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={isNew && !selectedProject}>
            <Check size={15} />
            {isNew ? "Create quest" : "Save quest"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TestDialog({
  test,
  initialProjectId,
  projects,
  onManageProjects,
  onClose,
  onSave,
  onResult,
}: {
  test: TestCase | "new";
  initialProjectId?: string;
  projects: Project[];
  onManageProjects: () => void;
  onClose: () => void;
  onSave: (test: TestCase) => void;
  onResult: (id: string, status: TestCase["status"]) => void;
}) {
  const isNew = test === "new";
  const linkedProject = isNew
    ? undefined
    : projects.find((project) =>
        test.projectId ? project.id === test.projectId : project.name === test.title,
      );
  const [projectId, setProjectId] = useState(
    linkedProject?.id ?? (isNew ? (initialProjectId ?? "") : "__saved__"),
  );
  const selectedProject = projects.find((project) => project.id === projectId);
  const title = selectedProject?.name ?? (isNew ? "" : test.title);
  const [suite, setSuite] = useState(isNew ? "" : test.suite);
  const [steps, setSteps] = useState(isNew ? "" : test.steps);
  const [expected, setExpected] = useState(isNew ? "" : test.expected);
  return (
    <Modal
      title={isNew ? "Create a test case" : test.id}
      subtitle="Clear steps. Clear expectations. Confident releases."
      onClose={onClose}
      wide
    >
      <form
        className="dialog-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (isNew && !selectedProject) return;
          if (!title.trim() || !suite.trim() || !steps.trim() || !expected.trim()) return;
          onSave({
            id: isNew ? `TC-${crypto.randomUUID().slice(0, 8).toUpperCase()}` : test.id,
            title: title.trim(),
            projectId: selectedProject?.id ?? (isNew ? undefined : test.projectId),
            suite: suite.trim(),
            steps: steps.trim(),
            expected: expected.trim(),
            status: isNew ? "Not Tested" : test.status,
            lastRun: isNew ? null : test.lastRun,
          });
        }}
      >
        <label>
          Test title (Project Name)
          <select
            autoFocus
            required
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="" disabled>
              Select a project name
            </option>
            {!isNew && !linkedProject && (
              <option value="__saved__" disabled>
                {test.title} (existing title)
              </option>
            )}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <small>Project names are maintained in Manage → Project Maintenance.</small>
        </label>
        {!projects.length && (
          <div className="info-note">
            <span>Add a project in Project Maintenance to select its name here.</span>
            <button type="button" className="text-button" onClick={onManageProjects}>
              Add project <ArrowRight size={13} />
            </button>
          </div>
        )}
        <label>
          Module
          <input required maxLength={60} value={suite} onChange={(e) => setSuite(e.target.value)} />
        </label>
        <label>
          Steps to execute
          <textarea
            required
            rows={4}
            maxLength={5000}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="1. Open the application…"
          />
        </label>
        <label>
          Expected result
          <textarea
            required
            rows={2}
            maxLength={3000}
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            placeholder="Describe the successful outcome…"
          />
        </label>
        {!isNew && (
          <div className="test-run-section">
            <div>
              <strong>Record a manual result</strong>
              <p>Execute the saved steps in your application before recording.</p>
              {test.lastRun && (
                <small>
                  Last run:{" "}
                  {new Date(test.lastRun).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} ·{" "}
                  {test.status}
                </small>
              )}
            </div>
            <div className="test-run-actions">
              {TEST_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`button ${status === "Passed" ? "pass-button" : status === "Failed" ? "fail-button" : "secondary"}`}
                  onClick={() => onResult(test.id, status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="modal-footer">
          <span className="flex-spacer" />
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={isNew && !selectedProject}>
            Save test case
            <Check size={15} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AuthDialog({
  onClose,
  notify,
}: {
  onClose: () => void;
  notify: (message: string) => void;
}) {
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  return (
    <Modal
      title={
        supabase
          ? signup
            ? "Join the quest."
            : "Welcome back, explorer."
          : "Connect your cloud workspace."
      }
      subtitle={
        supabase
          ? "Your personal QA progress, wherever you work."
          : "A little setup. A whole new level."
      }
      onClose={onClose}
    >
      {!supabase ? (
        <div className="help-content">
          <div className="auth-setup-icon">
            <Database size={32} />
          </div>
          <p>
            Supabase isn’t configured yet. Your local workspace is ready to use, and changes stay in
            this browser.
          </p>
          <ol>
            <li>
              Create your project at{" "}
              <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
                Supabase <ExternalLink size={12} />
              </a>
              .
            </li>
            <li>
              Run <code>supabase/migrations/001_workspace.sql</code> then{" "}
              <code>supabase/migrations/002_shared_realtime.sql</code> in its SQL Editor.
            </li>
            <li>
              Copy <code>.env.example</code> to <code>.env.local</code>, enter your project URL and
              publishable key, then restart Next.js.
            </li>
          </ol>
          <button className="button primary" onClick={onClose}>
            Continue locally <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <form
          className="dialog-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!supabase) return;
            setBusy(true);
            setError("");
            setMessage("");
            try {
              const result = signup
                ? await supabase.auth.signUp({ email, password })
                : await supabase.auth.signInWithPassword({ email, password });
              if (result.error) setError(result.error.message);
              else if (signup && !result.data.session)
                setMessage("Check your inbox to confirm your email, then return here to sign in.");
              else {
                notify("Cloud workspace connected");
                onClose();
              }
            } catch {
              setError("Unable to reach Supabase. Check your connection and try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourteam.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="form-success" role="status">
              {message}
            </p>
          )}
          <button disabled={busy} className="button primary full-width" type="submit">
            {busy ? <LoaderCircle className="spin" size={16} /> : <LogIn size={16} />}
            {signup ? "Create account" : "Sign in"}
          </button>
          <button
            className="text-button auth-switch"
            type="button"
            onClick={() => {
              setSignup(!signup);
              setError("");
              setMessage("");
            }}
          >
            {signup ? "Already an explorer? Sign in" : "New here? Create an account"}
            <ArrowRight size={13} />
          </button>
          <p className="auth-note">
            Cloud workspaces start empty. Your local records remain saved on this device.
          </p>
        </form>
      )}
    </Modal>
  );
}

function WorkspaceSettings({
  workspace,
  onSave,
}: {
  workspace: Workspace;
  onSave: (sprint: string, goal: string) => void;
}) {
  const [sprint, setSprint] = useState(workspace.sprint);
  const [goal, setGoal] = useState(workspace.sprintGoal);
  return (
    <form
      className="settings-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (sprint.trim() && goal.trim()) onSave(sprint.trim(), goal.trim());
      }}
    >
      <label>
        Sprint name
        <input maxLength={40} required value={sprint} onChange={(e) => setSprint(e.target.value)} />
      </label>
      <label>
        Sprint goal
        <textarea
          maxLength={200}
          required
          rows={3}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </label>
      <button className="button primary" type="submit">
        <Check size={15} />
        Save changes
      </button>
    </form>
  );
}
