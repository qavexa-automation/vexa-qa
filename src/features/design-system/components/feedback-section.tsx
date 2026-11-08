import { Inbox, Info, TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { DesignSystemSection } from "@/features/design-system/components/design-system-section";
import { FeedbackActions } from "@/features/design-system/components/feedback-actions";

export function FeedbackSection() {
  return (
    <DesignSystemSection
      description="Initial content, local refinement, submission, and completed background work each use a different feedback signal."
      rule="Keep existing content visible during refinement. Skeletons mirror final dimensions and toasts never replace actionable errors."
      title="Loading, empty, and error states"
    >
      <div className="space-y-6">
        <div className="grid gap-3 @3xl:grid-cols-2">
          <Alert>
            <Info aria-hidden="true" />
            <AlertTitle>Background processing scheduled</AlertTitle>
            <AlertDescription>Updated values may take a few minutes to appear.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>Connection unavailable</AlertTitle>
            <AlertDescription>Reconnect, then retry the failed section.</AlertDescription>
          </Alert>
        </div>

        <div className="space-y-3">
          <FeedbackActions />
          <div className="space-y-2">
            <Progress className="h-0.5 rounded-none" value={42} />
            <p className="text-xs text-muted-foreground">A reserved progress slot avoids layout shift during list refinement.</p>
          </div>
        </div>

        <div className="space-y-2" aria-label="Example loading skeleton">
          {[0, 1, 2].map((row) => (
            <div className="flex h-12 items-center gap-3" key={row}>
              <Skeleton className="h-4 w-48 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="ml-auto h-4 w-16 rounded-md" />
            </div>
          ))}
        </div>

        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Inbox aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>No records yet</EmptyTitle>
            <EmptyDescription>Create the first record to begin tracking work in this area.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Button>Add record</Button></EmptyContent>
        </Empty>
      </div>
    </DesignSystemSection>
  );
}
