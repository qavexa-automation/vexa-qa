import { Fragment } from "react";
import { X } from "lucide-react";

import type { StatusTone } from "@/components/ui/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatTimestamp } from "@/lib/dates";
import type { TimelineStep } from "@/lib/status-timeline";
import { cn } from "@/lib/utils";

const TONE_TEXT: Record<StatusTone, string> = {
  positive: "text-status-positive",
  attention: "text-status-attention",
  critical: "text-status-critical",
  info: "text-status-info",
  neutral: "text-status-neutral",
};

/**
 * Shape carries the state, so the timeline never relies on colour: done is filled, the current
 * step is ringed in its tone, an early end is a cross, upcoming is hollow, and a step the history
 * cannot vouch for is dashed.
 */
function StepMarker({ step, size }: { step: TimelineStep; size: "sm" | "md" }) {
  if (step.state === "current" && step.terminal) {
    return (
      <X
        aria-hidden="true"
        className={cn("shrink-0", size === "sm" ? "size-2.5" : "size-3.5", TONE_TEXT[step.tone])}
        strokeWidth={3}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "shrink-0 rounded-full",
        size === "sm" ? "size-2" : "size-3",
        step.state === "current" && cn("bg-current ring-2 ring-current/30", TONE_TEXT[step.tone]),
        step.state === "done" && "bg-muted-foreground",
        step.state === "upcoming" && "border border-muted-foreground/60",
        (step.state === "skipped" || step.state === "unrecorded") &&
          "border border-dashed border-muted-foreground/60",
      )}
    />
  );
}

function stepDetail(step: TimelineStep): string {
  if (step.state === "upcoming") return "Not reached";
  if (step.state === "skipped") return "Skipped";
  if (step.state === "unrecorded") return "Not recorded";
  return step.at ? `${formatTimestamp(step.at)} · ${step.actorName}` : "Date not recorded";
}

function describeStep(step: TimelineStep): string {
  return [step.label, step.state === "current" ? "current" : null, stepDetail(step)]
    .filter(Boolean)
    .join(", ");
}

function connectorClass(next: TimelineStep): string {
  return next.state === "upcoming" ? "bg-border" : "bg-muted-foreground/60";
}

/**
 * The compact track for a table cell or list tile. It is one focusable control, so a page of rows
 * adds one tab stop each; the tooltip lists every step on hover or focus.
 */
export function StatusTimelineTrack({
  steps,
  className,
}: {
  steps: TimelineStep[];
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "inline-flex h-6 items-center rounded-sm px-1 outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        type="button"
      >
        <span aria-hidden="true" className="flex items-center">
          {steps.map((step, index) => (
            <Fragment key={step.status}>
              {index > 0 ? <span className={cn("h-px w-2", connectorClass(step))} /> : null}
              <StepMarker size="sm" step={step} />
            </Fragment>
          ))}
        </span>
        <span className="sr-only">Status history: {steps.map(describeStep).join("; ")}</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-sm flex-col items-stretch gap-1 py-2">
        {steps.map((step) => (
          <span className="flex items-baseline justify-between gap-4" key={step.status}>
            <span className="font-medium">{step.label}</span>
            <span className="text-right opacity-70">{stepDetail(step)}</span>
          </span>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

/** The full timeline for a record's page: every step with its date and who moved it there. */
export function StatusTimeline({
  steps,
  className,
}: {
  steps: TimelineStep[];
  className?: string;
}) {
  return (
    <ol className={cn("grid gap-3 sm:flex sm:gap-0", className)}>
      {steps.map((step, index) => (
        <li
          aria-current={step.state === "current" ? "step" : undefined}
          className="flex min-w-0 gap-3 sm:flex-1 sm:flex-col sm:gap-2"
          key={step.status}
        >
          <span aria-hidden="true" className="flex h-5 items-center sm:w-full">
            <StepMarker size="md" step={step} />
            {index < steps.length - 1 ? (
              <span
                className={cn("mx-2 hidden h-px flex-1 sm:block", connectorClass(steps[index + 1]))}
              />
            ) : null}
          </span>
          <span className="min-w-0 sm:pr-4">
            <span className="block text-sm font-medium">
              {step.label}
              {step.state === "current" ? <span className="sr-only">, current step</span> : null}
            </span>
            <span className="block text-xs text-muted-foreground">{stepDetail(step)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
