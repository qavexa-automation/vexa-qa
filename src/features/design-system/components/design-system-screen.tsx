import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ButtonsStatusSection } from "@/features/design-system/components/buttons-status-section";
import { ChartsSection } from "@/features/design-system/components/charts-section";
import { FeedbackSection } from "@/features/design-system/components/feedback-section";
import { FormsSection } from "@/features/design-system/components/forms-section";
import { FoundationsSection } from "@/features/design-system/components/foundations-section";
import { OverlaysSection } from "@/features/design-system/components/overlays-section";
import { PagePatternsSection } from "@/features/design-system/components/page-patterns-section";
import { ResourcePatternSection } from "@/features/design-system/components/resource-pattern-section";

export function DesignSystemScreen() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Design system</h1>
            <Badge variant="outline">VEXA QA</Badge>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            The shared visual and interaction contract for VEXA. Everything below uses the installed
            component, not a separate mockup, styled with the Graphite &amp; Teal tokens of the
            workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link className={buttonVariants({ variant: "outline" })} href="/">
            Workspace
          </Link>
        </div>
      </header>

      <Tabs className="mt-8" defaultValue="foundations">
        <TabsList aria-label="Design system sections">
          <TabsTrigger value="foundations">Foundations</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>
        <TabsContent className="space-y-8 pt-6" value="foundations">
          <FoundationsSection />
        </TabsContent>
        <TabsContent className="space-y-8 pt-6" value="components">
          <ButtonsStatusSection />
          <FormsSection />
          <OverlaysSection />
        </TabsContent>
        <TabsContent className="space-y-8 pt-6" value="patterns">
          <PagePatternsSection />
          <ResourcePatternSection />
          <FeedbackSection />
        </TabsContent>
        <TabsContent className="space-y-8 pt-6" value="charts">
          <ChartsSection />
        </TabsContent>
      </Tabs>
    </main>
  );
}
