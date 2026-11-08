import type { StatusPresentation, StatusTone } from "@/components/ui/status-badge";
import type { IsoTimestamp } from "@/lib/dates";

/** One recorded move between statuses, read from the shared activity log. */
export type StatusTransition = {
  /** Null when the record was created in `to`, or when an older entry did not record it. */
  from: string | null;
  to: string;
  at: IsoTimestamp;
  actorName: string;
};

/**
 * The order a record is expected to move through. A terminal status ends the record early, off
 * the path, the way a cancelled request never reaches completed.
 */
export type StatusLifecycle<TStatus extends string> = {
  path: readonly TStatus[];
  terminals: readonly TStatus[];
  present: (status: TStatus) => StatusPresentation;
};

/**
 * - `done`: reached, with a recorded date.
 * - `skipped`: passed over, and a recorded transition shows it was jumped.
 * - `unrecorded`: passed, but the history does not say whether it was reached or skipped.
 */
export type TimelineStepState = "done" | "skipped" | "unrecorded" | "current" | "upcoming";

export type TimelineStep = {
  status: string;
  label: string;
  tone: StatusTone;
  state: TimelineStepState;
  terminal: boolean;
  at: IsoTimestamp | null;
  actorName: string | null;
};

/**
 * Lays a record's recorded transitions over its lifecycle. Dates come only from the log: a step
 * the log does not cover is shown as unrecorded rather than given an invented date.
 */
export function buildStatusTimeline<TStatus extends string>(
  lifecycle: StatusLifecycle<TStatus>,
  current: TStatus,
  transitions: readonly StatusTransition[],
): TimelineStep[] {
  const path: readonly string[] = lifecycle.path;
  const ordered = [...transitions].sort((left, right) => left.at.localeCompare(right.at));

  // A status entered more than once keeps its latest entry.
  const entries = new Map<string, StatusTransition>();
  for (const transition of ordered) entries.set(transition.to, transition);

  const offPath = !path.includes(current);
  const currentIndex = offPath ? furthestPathIndex(path, ordered) + 1 : path.indexOf(current);

  const step = (status: TStatus, state: TimelineStepState): TimelineStep => {
    const entry = state === "upcoming" ? undefined : entries.get(status);
    const presentation = lifecycle.present(status);
    return {
      status,
      label: presentation.label,
      tone: presentation.tone,
      state,
      terminal: lifecycle.terminals.includes(status),
      at: entry?.at ?? null,
      actorName: entry?.actorName ?? null,
    };
  };

  const passed = lifecycle.path.slice(0, currentIndex).map((status, index) => {
    if (entries.has(status)) return step(status, "done");
    return step(status, wasJumped(path, ordered, index) ? "skipped" : "unrecorded");
  });
  const upcoming = offPath
    ? []
    : lifecycle.path.slice(currentIndex + 1).map((status) => step(status, "upcoming"));

  return [...passed, step(current, "current"), ...upcoming];
}

/** The furthest path step the history shows, so an early end is drawn after it. */
function furthestPathIndex(
  path: readonly string[],
  transitions: readonly StatusTransition[],
): number {
  let furthest = 0;
  for (const transition of transitions) {
    furthest = Math.max(
      furthest,
      path.indexOf(transition.to),
      transition.from ? path.indexOf(transition.from) : -1,
    );
  }
  return furthest;
}

/** True when a recorded transition left a step before `index` for one after it. */
function wasJumped(
  path: readonly string[],
  transitions: readonly StatusTransition[],
  index: number,
): boolean {
  return transitions.some((transition) => {
    if (transition.from === null) return false;
    const from = path.indexOf(transition.from);
    const to = path.indexOf(transition.to);
    return from !== -1 && from < index && to > index;
  });
}

/** The most recent step with a recorded date, for a one-line "last change" summary. */
export function latestRecordedStep(steps: readonly TimelineStep[]): TimelineStep | null {
  let latest: TimelineStep | null = null;
  for (const step of steps) {
    if (step.at && (!latest || step.at > latest.at!)) latest = step;
  }
  return latest;
}
