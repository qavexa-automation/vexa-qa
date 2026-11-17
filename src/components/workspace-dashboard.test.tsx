import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import WorkspaceDashboard from "@/components/workspace-dashboard";
import { manilaToday } from "@/features/activity-calendar";
import type { CalendarEvent } from "@/features/activity-calendar";
import { emptyWorkspace, type Workspace } from "@/lib/model";

const today = manilaToday();
const tomorrow = new Date(`${today}T00:00:00Z`);
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
const nextDay = tomorrow.toISOString().slice(0, 10);

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "e1",
    title: "Sprint planning",
    kind: "Meeting",
    status: "Scheduled",
    startDate: today,
    endDate: today,
    allDay: false,
    startTime: "09:00",
    endTime: "10:00",
    projectId: "",
    location: "Meeting room 2",
    notes: "",
    ...overrides,
  };
}

const render = (calendarEvents: CalendarEvent[]) => {
  const workspace: Workspace = { ...emptyWorkspace(), calendarEvents };
  return renderToStaticMarkup(
    <WorkspaceDashboard
      workspace={workspace}
      search=""
      renderIssues={() => null}
      renderContributors={() => null}
      onNavigate={vi.fn()}
      onCriticalQuests={vi.fn()}
    />,
  );
};

describe("Overview today's schedule", () => {
  it("lists today's activities with their time, kind and location", () => {
    const html = render([event()]);
    expect(html).toContain("Today’s schedule");
    expect(html).toContain("Sprint planning");
    expect(html).toContain("Meeting room 2");
    expect(html).toContain("Open calendar");
  });

  it("leaves out activities on other days and cancelled ones", () => {
    const html = render([
      event({ id: "e2", title: "Tomorrow standup", startDate: nextDay, endDate: nextDay }),
      event({ id: "e3", title: "Dropped review", status: "Cancelled" }),
    ]);
    expect(html).not.toContain("Tomorrow standup");
    expect(html).not.toContain("Dropped review");
    expect(html).toContain("Nothing scheduled today");
  });

  it("keeps a multi-day activity visible on each day it spans", () => {
    const earlier = new Date(`${today}T00:00:00Z`);
    earlier.setUTCDate(earlier.getUTCDate() - 2);
    const html = render([
      event({ id: "e4", title: "Release window", startDate: earlier.toISOString().slice(0, 10), endDate: nextDay }),
    ]);
    expect(html).toContain("Release window");
  });
});
