"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Trash2,
  Palette,
  Pause,
  Play,
  Code2,
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
  deleteTest,
  moveIssue,
  PRIORITIES,
  runTest,
  STATUSES,
  TYPES,
  TEST_STATUSES,
  updateProjects,
  type Issue,
  type Modification,
  type Project,
  type Priority,
  type Status,
  type TestCase,
  type Workspace,
} from "@/lib/model";
import { LOCAL_WORKSPACE_BACKUP_KEY, useWorkspace } from "@/lib/use-workspace";
import { firstBloodAchievement } from "@/lib/achievements";
import { AchievementIcon } from "@/components/brand/achievement-icon";
import { ProfileSettings } from "@/features/profile";
import {
  MODIFICATION_XP,
  modificationForQuest,
  questBoardIssues,
} from "@/lib/modification-quests";
import { supabase } from "@/lib/supabase";
import ProjectMaintenance from "@/components/project-maintenance";
import TestCaseTable from "@/components/test-case-table";
import { EmptyState, Panel, StatCard as Stat } from "@/components/app-shell/panel";
import { IssueTable } from "@/components/workspace-tables/issue-table";
import { IconButton } from "@/components/app-shell/icon-button";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { FilterCombobox, valueOptions } from "@/components/forms/filter-combobox";
import { OptionCombobox } from "@/components/forms/option-combobox";
import { projectOptions } from "@/components/forms/project-options";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import DeploymentTracker from "@/components/deployment-tracker";
import ModificationTracker from "@/components/modification-tracker";
import WorkspaceDashboard from "@/components/workspace-dashboard";
import { workspaceContributors } from "@/lib/dashboard";
import WorkspaceSharing from "@/components/workspace-sharing";
import ThemeSwitcher from "@/components/theme-switcher";
import { ActivityCalendarScreen } from "@/features/activity-calendar";

type View =
  | "Overview"
  | "Activity Calendar"
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
      { name: "Activity Calendar", icon: CalendarDays },
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
  "Activity Calendar": "Plan meetings, test sessions, and releases across the month.",
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
// The sidebar's footer links take the nav item's exact shape, so the sidebar reads as one list
// top to bottom. Only the trailing arrow marks them as leaving the current view.
const sidebarFooterLink =
  "group mb-0.5 flex w-full items-center gap-[11px] rounded-[5px] px-[13px] py-2 text-left text-xs text-(--text-secondary) transition-colors hover:bg-(--surface-muted) hover:text-(--text) focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:translate-y-px";
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
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={`max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
      >
        <DialogHeader className="pr-8">
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            VEXA WORKSPACE
          </span>
          <DialogTitle className="font-heading text-2xl font-semibold wrap-anywhere">
            {title}
          </DialogTitle>
          {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
export default function CommandCenter() {
  const router = useRouter();
  const {
    workspace,
    setWorkspace,
    user,
    saveDisplayName,
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
  const [achievementMotionPaused, setAchievementMotionPaused] = useState(false);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
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
  const [modificationToOpen, setModificationToOpen] = useState<string | null>(null);
  const [deletingTest, setDeletingTest] = useState<TestCase | null>(null);
  const removeTest = (id: string) => {
    setWorkspace((w) => deleteTest(w, id));
    notify(`${id} deleted`);
  };
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  // Pending cloud edits are saved first; the entry route then returns to the login page.
  const signOut = async () => {
    setSigningOut(true);
    try {
      await flush();
      const result = await supabase?.auth.signOut();
      if (result?.error) notify(result.error.message);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to sign out. Try again.");
    } finally {
      setSigningOut(false);
    }
  };
  const [help, setHelp] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [listMode, setListMode] = useState(false);
  const [dropColumn, setDropColumn] = useState<Status | null>(null);
  const [testFilter, setTestFilter] = useState("");
  const [testProjectFilter, setTestProjectFilter] = useState("");
  const [compact, setCompact] = useState(false);
  const m = metrics(workspace);
  const profileFullName =
    typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : "";
  const profileName = profileFullName || (user?.email?.split("@")[0] ?? "Local workspace");
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
      (!testFilter || test.status === testFilter) &&
      `${test.title} ${test.id} ${test.suite}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  // Sonner announces each message politely and dismisses it on its own.
  const notify = (message: string) => toast(message);
  const navigate = (next: View) => {
    setView(next);
    setSearch("");
    setSidebar(false);
    setNotifications(false);
  };
  // Changes to a modification card are saved on the modification itself.
  const updateModification = (
    id: string,
    change: Partial<Pick<Modification, "status" | "priority">>,
  ) => {
    const modification = modificationForQuest(workspace.modifications, id);
    if (!modification) return false;
    if (!ready) return true;
    setWorkspace((w) => ({
      ...w,
      modifications: (w.modifications ?? []).map((entry) =>
        entry.id === modification.id ? { ...entry, ...change } : entry,
      ),
    }));
    if (change.status && change.status !== modification.status) {
      const xp = MODIFICATION_XP[change.status];
      notify(`${modification.module || id} moved to ${change.status}${xp ? ` · ${xp} XP` : ""}`);
    }
    if (change.priority) notify(`${modification.module || id} priority set to ${change.priority}`);
    return true;
  };
  const openQuest = (issue: Issue) => {
    const modification = modificationForQuest(workspace.modifications, issue.id);
    if (!modification) return setIssueModal(issue);
    setModificationToOpen(modification.id);
    navigate("Modification Tracker");
  };
  const updatePriority = (id: string, priority: Priority) => {
    if (!ready) return;
    if (updateModification(id, { priority })) return;
    setWorkspace((w) => ({
      ...w,
      issues: w.issues.map((issue) => (issue.id === id ? { ...issue, priority } : issue)),
    }));
    notify(`${id} priority set to ${priority}`);
  };
  // Inline status edits from a quest table; Completed keeps its XP message from updateStatus.
  const changeStatusInline = (id: string, status: Status) => {
    if (updateModification(id, { status })) return;
    updateStatus(id, status);
    if (status !== "Completed") notify(`${id} moved to ${status}`);
  };
  const updateStatus = (id: string, status: Status) => {
    if (!ready) return;
    const issue = workspace.issues.find((i) => i.id === id);
    setWorkspace((w) => moveIssue(w, id, status));
    if (status === "Completed" && issue?.status !== "Completed")
      notify(`Quest complete! +${issue?.xp ?? 0} XP earned`);
  };
  // The Quest Board also shows every modification as a live quest card.
  const boardIssues = questBoardIssues(workspace);
  const boardDone = boardIssues.filter((issue) => issue.status === "Completed").length;
  const filtered = filterIssuesByProject(
    boardIssues,
    projects,
    view === "Quest board" ? activeQuestProjectFilter : "",
  ).filter(
    (i) =>
      `${i.id} ${i.title} ${i.labels.join(" ")} ${i.assignee}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!priority || i.priority === priority) &&
      (!typeFilter || i.type === typeFilter) &&
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
        <IssueTable
          issues={issues}
          limit={limit}
          onOpen={openQuest}
          onPriorityChange={updatePriority}
          onStatusChange={changeStatusInline}
        />
        {!issues.length && (
          <EmptyState
            icon={Search}
            title={<>No quests found</>}
            description={<>Try another filter or create your first quest.</>}
          />
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
          <EmptyState
            icon={Users}
            title={<>No developers yet</>}
            description={<>Add project developers or assign a quest to see contributions.</>}
          />
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
                  {name === "Achievements" && <span className="new-dot" />}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-theme">
            <span>Color theme</span>
            <ThemeSwitcher
              className="text-(--text-muted) hover:bg-(--panel-hover) hover:text-(--accent-base)"
              variant="ghost"
            />
          </div>
          <div className="mb-3 border-t border-(--border) pt-3">
            <span className="nav-label">RESOURCES</span>
            {/* A plain link: /design-system has its own root layout, so this is a full page load. */}
            <a className={sidebarFooterLink} href="/design-system">
              <Palette aria-hidden="true" className="shrink-0" size={18} />
              <span className="min-w-0 truncate">Design system</span>
              <ArrowUpRight
                aria-hidden="true"
                className="ml-auto shrink-0 text-(--text-muted) transition-colors group-hover:text-(--accent-base)"
                size={14}
              />
            </a>
            <button className={sidebarFooterLink} onClick={() => setHelp(true)}>
              <CircleHelp aria-hidden="true" className="shrink-0" size={18} />
              <span className="min-w-0 truncate">Help &amp; getting started</span>
              <ArrowUpRight
                aria-hidden="true"
                className="ml-auto shrink-0 text-(--text-muted) transition-colors group-hover:text-(--accent-base)"
                size={14}
              />
            </button>
          </div>
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
          <div className="profile">
            <button
              className="profile-link"
              onClick={() => (user ? navigate("Settings") : router.push("/login"))}
            >
              <Avatar name={profileName} />
              <div>
                <strong>{profileName}</strong>
                <small>{user ? "Cloud workspace" : "Saved on this device"}</small>
              </div>
              <ChevronRight size={14} />
            </button>
            {user && (
              <IconButton
                ariaLabel={`Log out ${profileName}`}
                className="shrink-0 text-(--text-muted) hover:bg-(--panel-hover) hover:text-(--accent-base)"
                disabled={signingOut}
                icon={LogOut}
                label="Log out"
                onClick={() => setConfirmSignOut(true)}
              />
            )}
          </div>
        </div>
      </aside>
      <ConfirmDialog
        open={confirmSignOut}
        title="Log out of VEXA?"
        description="Unsaved changes are saved to the cloud first. Sign in again to return to this workspace."
        confirmLabel={signingOut ? "Logging out…" : "Log out"}
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={() => {
          setConfirmSignOut(false);
          void signOut();
        }}
      />
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <Button
              variant="ghost"
              size="icon"
              className="min-[761px]:hidden"
              onClick={() => setSidebar(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </Button>
            <span className="breadcrumb-home">Workspace</span>
            <ChevronRight size={13} />
            <strong>{view}</strong>
          </div>
          <div className="topbar-actions">
            <InputGroup className="global-search-field h-9 w-64 max-w-full bg-glass">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                ref={searchInput}
                aria-label="Search workspace"
                placeholder={
                  view === "Activity Calendar"
                    ? "Search activities…"
                    : view === "Modification Tracker"
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
                      "Activity Calendar",
                      "Project Maintenance",
                      "Deployment Tracker",
                      "Modification Tracker",
                    ].includes(view)
                  )
                    setView("Quest board");
                }}
              />
              <InputGroupAddon align="inline-end">
                <Kbd>/</Kbd>
              </InputGroupAddon>
            </InputGroup>
            <span className="demo-badge">
              <i />
              {user ? "CLOUD" : "LOCAL MODE"}
            </span>
            <div className="notification-wrap">
              <Button
                variant="ghost"
                size="icon"
                className="relative notification-button"
                onClick={() => setNotifications(!notifications)}
                aria-label="Recent activity"
                aria-expanded={notifications}
              >
                <Bell size={19} />
                {workspace.activity.length > 0 && <i />}
              </Button>
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
                  <Button
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => {
                      setNotifications(false);
                      navigate("Reports");
                    }}
                  >
                    View activity <ArrowRight size={13} />
                  </Button>
                </div>
              )}
            </div>
            <div className="topbar-divider" />
            {/* Below 1200px the sidebar carries the theme control instead. */}
            <ThemeSwitcher className="max-[1200px]:hidden" />
            {!user && (
              <Button variant="outline" onClick={() => router.push("/login")}>
                <LogIn size={14} />
                Sign in
              </Button>
            )}
            <Avatar name={profileName} />
          </div>
        </header>
        <main>
          {/* Overview owns its welcome heading; other views use the shared page heading. */}
          {view !== "Overview" && (
          <div className={`page-heading ${view === "Test lab" ? "test-lab-heading" : ""}`}>
            <div>
              <div className="page-eyebrow">
                <span className="tiny-cross">✦</span>{" "}
                VEXA QA WORKSPACE
              </div>
              <h1>
                {view}
              </h1>
              <p>{descriptions[view]}</p>
            </div>
            <div className={`heading-actions ${view === "Test lab" ? "test-lab-actions" : ""}`}>
              {view === "Test lab" && (
                <FilterCombobox
                  allLabel="All projects"
                  className="w-52"
                  label="Filter test cases by project"
                  options={projectOptions(projects)}
                  value={activeTestProjectFilter}
                  onChange={setTestProjectFilter}
                />
              )}
              {view === "Test lab" ? (
                <Button
                  disabled={!ready}

                  onClick={() => setTestModal("new")}
                >
                  <Plus size={17} />
                  Add test case
                </Button>
              ) : view === "Reports" ? (
                <Button variant="outline" onClick={exportWorkspace}>
                  <Download size={16} />
                  Export data
                </Button>
              ) : null}
            </div>
          </div>
          )}
          {error && (
            <div className="error-banner">
              <Shield size={18} />
              <span>
                {error} Your current data is still visible; export a backup before reloading.
              </span>
              <button onClick={exportWorkspace}>Export</button>
              <button onClick={() => void reload()}>Reload</button>
              {user && <button onClick={() => void supabase?.auth.signOut()}>Sign out</button>}
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
                userName={user ? profileName : undefined}
                search={search}
                renderIssues={issueRows}
                renderContributors={leaderboard}
                onNavigate={navigate}
                onCriticalQuests={() => {
                  navigate("Quest board");
                  setPriority("Critical");
                  setTypeFilter("");
                  setQuestProjectFilter("");
                  setMine(false);
                }}
              />
            )}
            {view === "Activity Calendar" && (
              <ActivityCalendarScreen
                events={workspace.calendarEvents ?? []}
                projects={projects}
                search={search}
                disabled={!ready || !!error}
                onChange={(calendarEvents) => setWorkspace((w) => ({ ...w, calendarEvents }))}
                onNotice={notify}
                onManageProjects={() => navigate("Project Maintenance")}
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
                      {boardDone} completed · {boardIssues.length - boardDone} to go · {m.xp} XP
                      earned
                    </p>
                  </div>
                  <div className="board-squad">
                    <div className="avatar-stack">
                      {rank.slice(0, 4).map((t) => (
                        <Avatar key={t.name} name={t.name} />
                      ))}
                    </div>
                    <span>DEVELOPERS</span>
                  </div>
                </div>
                <div className="filter-bar">
                  <div className="filter-controls">
                    <Filter aria-hidden="true" size={15} className="muted" />
                    <FilterCombobox
                      allLabel="All priorities"
                      label="Filter by priority"
                      options={valueOptions(PRIORITIES)}
                      value={priority}
                      onChange={setPriority}
                    />
                    <FilterCombobox
                      allLabel="All types"
                      label="Filter by type"
                      options={valueOptions(TYPES)}
                      value={typeFilter}
                      onChange={setTypeFilter}
                    />
                    <FilterCombobox
                      allLabel="All project titles"
                      className="w-52"
                      label="Filter by project title"
                      options={projectOptions(projects)}
                      value={activeQuestProjectFilter}
                      onChange={setQuestProjectFilter}
                    />
                    <Button
                      type="button"
                      className="h-9"
                      variant={mine ? "secondary" : "outline"}
                      aria-pressed={mine}
                      disabled={!user}
                      title={
                        !user
                          ? "Sign in to match quests to your account name or email"
                          : "Show quests assigned to your account"
                      }
                      onClick={() => setMine(!mine)}
                    >
                      Assigned to me
                    </Button>
                    {(priority || typeFilter || activeQuestProjectFilter || mine || search) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPriority("");
                          setTypeFilter("");
                          setQuestProjectFilter("");
                          setMine(false);
                          setSearch("");
                        }}
                      >
                        Clear filters <X aria-hidden="true" />
                      </Button>
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
                          const id = e.dataTransfer.getData("text/plain");
                          if (!updateModification(id, { status })) updateStatus(id, status);
                          setDropColumn(null);
                        }}
                      >
                        <div className="column-heading">
                          <StatusBadge status={status} />
                          <Button
                            aria-label={`Add quest to ${status}`}
                            variant="ghost"
                            size="icon"
                            onClick={() => setIssueModal("new")}
                          >
                            <Plus size={15} />
                          </Button>
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
                                  onClick={() => openQuest(issue)}
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
                  Drag quests between columns, or open a quest to update its status. Cards tagged
                  Modification come from the Modification Tracker and update it directly.
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
                openId={modificationToOpen ?? undefined}
                onOpened={() => setModificationToOpen(null)}
                workspaceOwner={owner}
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
                    <FilterCombobox
                      allLabel="All tests"
                      label="Filter tests"
                      options={valueOptions(TEST_STATUSES)}
                      value={testFilter}
                      onChange={setTestFilter}
                    />
                  }
                >
                  <div className="test-list">
                    <TestCaseTable
                      tests={visibleTests}
                      onEdit={setTestModal}
                      onDelete={setDeletingTest}
                      onStatusChange={(id, status) => {
                        setWorkspace((w) => runTest(w, id, status));
                        notify(
                          `${id}: ${status === "Not Tested" ? "reset to Not Tested" : `${status} result recorded`}`,
                        );
                      }}
                    />
                    {!visibleTests.length && (
                      <EmptyState
                        icon={FlaskConical}
                        title={<>No matching test cases</>}
                        description={
                          <>Add a test case or adjust your project, status, or search filters.</>
                        }
                      >
                        {(activeTestProjectFilter || testFilter || search) && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setTestProjectFilter("");
                              setTestFilter("");
                              setSearch("");
                            }}
                          >
                            Clear filters
                          </Button>
                        )}
                      </EmptyState>
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
                          (i) => i.priority === p && i.status !== "Completed",
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
                      <EmptyState
                        icon={Activity}
                        title={<>Your story starts here</>}
                        description={<>Quest updates and test results will appear here.</>}
                      />
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
                  <div className="flex shrink-0 items-center gap-3">
                    <IconButton
                      className="motion-reduce:hidden"
                      icon={achievementMotionPaused ? Play : Pause}
                      label={achievementMotionPaused ? "Play achievement animations" : "Pause achievement animations"}
                      onClick={() => setAchievementMotionPaused((paused) => !paused)}
                    />
                    <AchievementIcon
                      icon={Trophy}
                      size={48}
                      className="size-14 text-status-attention max-sm:hidden"
                      paused={achievementMotionPaused}
                    />
                  </div>
                </div>
                <div className="achievement-grid">
                  {[
                    {
                      ...firstBloodAchievement(workspace),
                      icon: Bug,
                      motion: "scuttle" as const,
                      color: "orange",
                    },
                    {
                      title: "Quest conqueror",
                      description: "Complete 10 quests in your workspace.",
                      icon: Swords,
                      motion: "swing" as const,
                      count: m.done,
                      goal: 10,
                      color: "mint",
                    },
                    {
                      title: "Test pilot",
                      description: "Record results for 10 test cases.",
                      icon: FlaskConical,
                      motion: "tilt" as const,
                      count: m.run,
                      goal: 10,
                      color: "purple",
                    },
                    {
                      title: "Power surge",
                      description: "Earn a total of 1,000 squad XP.",
                      icon: Zap,
                      motion: "charge" as const,
                      count: m.xp,
                      goal: 1000,
                      color: "yellow",
                    },
                    {
                      title: "Green guardian",
                      description: "Have 10 passing test cases.",
                      icon: ShieldCheck,
                      motion: "shield" as const,
                      count: m.passed,
                      goal: 10,
                      color: "mint",
                    },
                    {
                      title: "Legendary release",
                      description: "Complete 25 quests. Keep going.",
                      icon: Trophy,
                      motion: "float" as const,
                      count: m.done,
                      goal: 25,
                      color: "yellow",
                    },
                  ].map((a) => (
                    <section
                      className={`achievement-card ${a.count >= a.goal ? "unlocked" : ""}`}
                      key={a.title}
                    >
                      <AchievementIcon
                        icon={a.icon}
                        motion={a.motion}
                        className={`achievement-icon ${a.color}`}
                        unlocked={a.count >= a.goal}
                        paused={achievementMotionPaused}
                      />
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
                        className={buttonVariants({
                          variant: "outline",
                          className: "w-full justify-between",
                        })}
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
                  <Button variant="outline" onClick={() => setHelp(true)}>
                    Setup overview <ArrowRight size={14} />
                  </Button>
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
                {user && (
                  <Panel title="Your profile" eyebrow="MAKE IT PERSONAL">
                    <ProfileSettings
                      key={user.id}
                      initialName={profileFullName}
                      onSave={saveDisplayName}
                      onNotice={notify}
                    />
                  </Panel>
                )}
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
                      <Button
                        variant="outline"
                        disabled={signingOut}
                        onClick={() => setConfirmSignOut(true)}
                      >
                        <LogOut size={15} />
                        {signingOut ? "Signing out…" : "Sign out"}
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => router.push("/login")}>
                        <LogIn size={15} />
                        Sign in / Create account
                      </Button>
                    )}
                    <div className="settings-divider" />
                    <h3>Keep a copy of your progress</h3>
                    <p>
                      Download your projects, quests, test cases, modifications, deployments, and
                      activity as a JSON backup.
                    </p>
                    <Button variant="outline" onClick={exportWorkspace}>
                      <Download size={15} />
                      Export workspace
                    </Button>
                    {!user && hasLocalBackup && (
                      <div className="dashboard-backup-action">
                        <p>
                          Your original local workspace was preserved before untouched sample
                          records were removed.
                        </p>
                        <Button variant="outline" onClick={exportOriginalLocalWorkspace}>
                          <Download size={15} />
                          Export pre-cleanup backup
                        </Button>
                      </div>
                    )}
                    <div className="settings-divider" />
                    <Field orientation="horizontal" className="justify-between">
                      <FieldContent>
                        <FieldLabel htmlFor="settings-compact">Compact layout</FieldLabel>
                        <FieldDescription>Use less space between quest rows.</FieldDescription>
                      </FieldContent>
                      <Switch
                        id="settings-compact"
                        checked={compact}
                        onCheckedChange={(checked) => setCompact(checked)}
                      />
                    </Field>
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
                    : `${issue.id} updated${issue.status === "Completed" && !isNew && issueModal.status !== "Completed" ? ` · ${issue.xp} XP earned` : ""}`,
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
          onDelete={(id) => {
            removeTest(id);
            setTestModal(null);
          }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deletingTest)}
        title={`Delete ${deletingTest?.id ?? "this test case"}?`}
        description={`This removes the ${deletingTest?.title ?? ""} test case, its steps, and its last result.`}
        confirmLabel="Delete test case"
        onCancel={() => setDeletingTest(null)}
        onConfirm={() => {
          if (deletingTest) removeTest(deletingTest.id);
          setDeletingTest(null);
        }}
      />
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
            <Button onClick={() => setHelp(false)}>
              Let’s get started <ArrowRight size={15} />
            </Button>
          </div>
        </Modal>
      )}
    </div>
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
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <OptionCombobox
          id="issue-project"
          label="Project title"
          options={[
            ...(!isNew && !linkedProject
              ? [{ value: "__saved__", label: `${issue.title} (existing title)` }]
              : []),
            ...projectOptions(projects),
          ]}
          placeholder="Select a project name"
          description="Project names are maintained in Manage → Project Maintenance."
          value={projectId}
          onChange={setProjectId}
        />
        {!projects.length && (
          <Alert>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              Add a project in Project Maintenance to select its name here.
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={onManageProjects}
              >
                Add project <ArrowRight aria-hidden="true" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="issue-description">Description</FieldLabel>
          <Textarea
            id="issue-description"
            rows={4}
            placeholder="Add context, reproduction steps, or acceptance criteria…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <OptionCombobox
            id="issue-type"
            label="Quest type"
            options={valueOptions(TYPES)}
            placeholder="Select a type"
            value={type}
            onChange={(value) => setType(value as Issue["type"])}
          />
          <OptionCombobox
            id="issue-priority"
            label="Priority"
            options={valueOptions(PRIORITIES)}
            placeholder="Select a priority"
            value={priority}
            onChange={(value) => setPriority(value as Priority)}
          />
          <OptionCombobox
            id="issue-status"
            label="Status"
            options={valueOptions(STATUSES)}
            placeholder="Select a status"
            value={status}
            onChange={(value) => setStatus(value as Status)}
          />
          <Field>
            <FieldLabel htmlFor="issue-assignee">Assignee</FieldLabel>
            <Input
              id="issue-assignee"
              readOnly
              className="bg-muted text-muted-foreground"
              value={assignee}
              placeholder="Select a project first"
            />
            <FieldDescription>Filled from the project's Developer.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="issue-xp">Reward (XP)</FieldLabel>
            <Input
              id="issue-xp"
              type="number"
              min={0}
              max={1000}
              step={25}
              required
              value={xp}
              onChange={(e) => setXp(Number(e.target.value))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="issue-labels">
              Labels <span className="font-normal text-muted-foreground">(comma separated)</span>
            </FieldLabel>
            <Input
              id="issue-labels"
              placeholder="Checkout, API"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter className="mt-2 sm:items-center">
          {!isNew && (
            <Button
              type="button"
              variant="destructive"
              className="sm:mr-auto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 aria-hidden="true" />
              Delete quest
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isNew && !selectedProject}>
            <Check aria-hidden="true" />
            {isNew ? "Create quest" : "Save quest"}
          </Button>
        </DialogFooter>
      </form>
      {!isNew && (
        <ConfirmDialog
          open={confirmDelete}
          title={`Delete quest ${issue.id}?`}
          description="The quest and its details are removed from this workspace."
          confirmLabel="Delete quest"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => onDelete(issue.id)}
        />
      )}
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
  onDelete,
}: {
  test: TestCase | "new";
  initialProjectId?: string;
  projects: Project[];
  onManageProjects: () => void;
  onClose: () => void;
  onSave: (test: TestCase) => void;
  onResult: (id: string, status: TestCase["status"]) => void;
  onDelete: (id: string) => void;
}) {
  const isNew = test === "new";
  const [confirmDelete, setConfirmDelete] = useState(false);
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
        className="flex flex-col gap-4"
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
        <OptionCombobox
          id="test-project"
          label="Test title (Project name)"
          options={[
            ...(!isNew && !linkedProject
              ? [{ value: "__saved__", label: `${test.title} (existing title)` }]
              : []),
            ...projectOptions(projects),
          ]}
          placeholder="Select a project name"
          description="Project names are maintained in Manage → Project Maintenance."
          value={projectId}
          onChange={setProjectId}
        />
        {!projects.length && (
          <Alert>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              Add a project in Project Maintenance to select its name here.
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={onManageProjects}
              >
                Add project <ArrowRight aria-hidden="true" />
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor="test-module">Module</FieldLabel>
          <Input
            id="test-module"
            required
            value={suite}
            onChange={(e) => setSuite(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="test-steps">Steps to execute</FieldLabel>
          <Textarea
            id="test-steps"
            required
            rows={4}
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="1. Open the application…"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="test-expected">Expected result</FieldLabel>
          <Textarea
            id="test-expected"
            required
            rows={2}
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            placeholder="Describe the successful outcome…"
          />
        </Field>
        {!isNew && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <div>
              <strong className="text-sm font-medium">Record a manual result</strong>
              <p className="text-sm text-muted-foreground">
                Execute the saved steps in your application before recording.
              </p>
              {test.lastRun && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last run:{" "}
                  {new Date(test.lastRun).toLocaleString("en-PH", { timeZone: "Asia/Manila" })} ·{" "}
                  {test.status}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {TEST_STATUSES.map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={
                    status === "Passed"
                      ? "default"
                      : status === "Failed"
                        ? "destructive"
                        : "outline"
                  }
                  onClick={() => onResult(test.id, status)}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        )}
        <DialogFooter className="mt-2 sm:items-center">
          {!isNew && (
            <Button
              type="button"
              variant="destructive"
              className="sm:mr-auto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 aria-hidden="true" />
              Delete test case
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isNew && !selectedProject}>
            Save test case
            <Check aria-hidden="true" />
          </Button>
        </DialogFooter>
      </form>
      {!isNew && (
        <ConfirmDialog
          open={confirmDelete}
          title={`Delete ${test.id}?`}
          description="The test case, its steps, and its last result are removed from this workspace."
          confirmLabel="Delete test case"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => onDelete(test.id)}
        />
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
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (sprint.trim() && goal.trim()) onSave(sprint.trim(), goal.trim());
      }}
    >
      <Field>
        <FieldLabel htmlFor="settings-sprint">Sprint name</FieldLabel>
        <Input
          id="settings-sprint"
          maxLength={40}
          required
          value={sprint}
          onChange={(e) => setSprint(e.target.value)}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="settings-goal">Sprint goal</FieldLabel>
        <Textarea
          id="settings-goal"
          maxLength={200}
          required
          rows={3}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </Field>
      <Button className="self-start" type="submit">
        <Check aria-hidden="true" />
        Save changes
      </Button>
    </form>
  );
}
