import { ArrowRight, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { StatusTimeline, StatusTimelineTrack } from "@/components/ui/status-timeline";
import type { TimelineStep } from "@/lib/status-timeline";
import { DesignSystemSection } from "@/features/design-system/components/design-system-section";

const TONE_EXAMPLES: { tone: StatusTone; label: string; domains: string }[] = [
  {
    tone: "positive",
    label: "Passed",
    domains: "Test passed, issue done, deployed",
  },
  {
    tone: "attention",
    label: "In review",
    domains: "In review, high priority, planned deployment",
  },
  {
    tone: "critical",
    label: "Failed",
    domains: "Test failed, critical priority, deployment failed",
  },
  { tone: "info", label: "In progress", domains: "Issue in progress, medium priority, deploying" },
  { tone: "neutral", label: "Not tested", domains: "Backlog, not tested, not applicable, rolled back" },
];

const step = (
  status: string,
  label: string,
  tone: StatusTone,
  state: TimelineStep["state"],
  at: string | null = null,
): TimelineStep => ({ status, label, tone, state, terminal: status === "cancelled", at, actorName: at ? "QA Lead" : null });

const TIMELINE_EXAMPLES: { label: string; steps: TimelineStep[] }[] = [
  {
    label: "In progress, assignment skipped",
    steps: [
      step("submitted", "Submitted", "attention", "done", "2026-10-14T01:00:00.000Z"),
      step("assigned", "Assigned", "info", "skipped"),
      step("in_progress", "In progress", "info", "current", "2026-10-15T06:30:00.000Z"),
      step("completed", "Completed", "positive", "upcoming"),
    ],
  },
  {
    label: "Cancelled after assignment",
    steps: [
      step("submitted", "Submitted", "attention", "done", "2026-10-14T01:00:00.000Z"),
      step("assigned", "Assigned", "info", "done", "2026-10-14T03:00:00.000Z"),
      step("cancelled", "Cancelled", "neutral", "current", "2026-10-16T02:15:00.000Z"),
    ],
  },
  {
    label: "Older record with gaps in its history",
    steps: [
      step("submitted", "Submitted", "attention", "unrecorded"),
      step("assigned", "Assigned", "info", "unrecorded"),
      step("in_progress", "In progress", "info", "unrecorded"),
      step("completed", "Completed", "positive", "current"),
    ],
  },
];

export function ButtonsStatusSection() {
  return (
    <DesignSystemSection
      description="Actions use one clear primary treatment. Status combines a readable label with a stable semantic treatment."
      rule="Pending controls keep their label and width. Destructive actions are last and always confirmed."
      title="Actions and status"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">Variants</h3>
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">Icons and states</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Button><Plus aria-hidden="true" />Add record</Button>
            <Button variant="outline">Continue<ArrowRight aria-hidden="true" /></Button>
            <Button disabled><Spinner />Saving</Button>
            <Button aria-label="Delete record" size="icon" variant="destructive"><Trash2 aria-hidden="true" /></Button>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">Generic badges</h3>
          <div className="flex flex-wrap gap-2">
            <Badge>Active</Badge>
            <Badge variant="secondary">Draft</Badge>
            <Badge variant="outline">Pending review</Badge>
            <Badge variant="destructive">Needs attention</Badge>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">Status tones</h3>
          <p className="max-w-2xl text-sm text-muted-foreground">
            One shared <code className="font-mono text-xs">StatusBadge</code> drives every domain
            status. Tones are named by tone, not by domain meaning, and each feature maps its own
            statuses onto a tone in its <code className="font-mono text-xs">lib/</code>. Colour
            never carries the meaning alone: every badge renders a filled dot and a word.
          </p>
          <div className="flex flex-wrap gap-2">
            {TONE_EXAMPLES.map((example) => (
              <StatusBadge key={example.tone} label={example.label} tone={example.tone} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {TONE_EXAMPLES.map((example) => (
              <StatusBadge key={example.tone} label={example.label} size="sm" tone={example.tone} />
            ))}
          </div>
          <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {TONE_EXAMPLES.map((example) => (
              <div className="flex justify-between gap-4 border-b border-border py-1" key={example.tone}>
                <dt className="capitalize text-muted-foreground">{example.tone}</dt>
                <dd className="text-right">{example.domains}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground">Status timeline</h3>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Records with a lifecycle show the steps they moved through, read from the activity log.
            Tables and tiles put the compact track beside the badge, with the dates in a tooltip;
            a record&apos;s page shows the full timeline. Shape carries the state: filled is done,
            ringed is current, a cross is an early end, hollow is upcoming, and dashed is skipped
            or not recorded.
          </p>
          <ul className="space-y-1">
            {TIMELINE_EXAMPLES.map((example) => {
              const current = example.steps.find((item) => item.state === "current")!;
              return (
                <li className="flex flex-wrap items-center gap-2 text-sm" key={example.label}>
                  <StatusBadge label={current.label} tone={current.tone} />
                  <StatusTimelineTrack steps={example.steps} />
                  <span className="text-muted-foreground">{example.label}</span>
                </li>
              );
            })}
          </ul>
          <StatusTimeline className="max-w-2xl pt-2" steps={TIMELINE_EXAMPLES[0].steps} />
        </div>
      </div>
    </DesignSystemSection>
  );
}
