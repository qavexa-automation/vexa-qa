import { Bell, LayoutDashboard, Search, Settings, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { DesignSystemSection } from "@/features/design-system/components/design-system-section";

const navigation = [
  ["Overview", LayoutDashboard],
  ["People", Users],
  ["Settings", Settings],
] as const;

export function PagePatternsSection() {
  return (
    <div className="space-y-8">
      <DesignSystemSection
        description="Every resource page starts with a concise title, supporting context, and one clearly ranked page action."
        rule="Frequent filters stay left, page actions stay right, and secondary controls move into overflow when space is tight."
        title="Page header and toolbar"
      >
        <div className="space-y-6">
          <div className="flex flex-col gap-4 @2xl:flex-row @2xl:items-end @2xl:justify-between">
            <div><h3 className="text-2xl font-semibold tracking-tight">Records</h3><p className="mt-1 text-sm text-muted-foreground">Review and manage the records available to this workspace.</p></div>
            <Button>Add record</Button>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <InputGroup className="h-9 w-full @2xl:max-w-sm"><InputGroupAddon><Search /></InputGroupAddon><InputGroupInput aria-label="Search example" placeholder="Search records" /></InputGroup>
            <Button variant="outline">Status</Button>
            <Button className="@2xl:ml-auto" variant="outline">More filters</Button>
          </div>
        </div>
      </DesignSystemSection>

      <DesignSystemSection
        description="The shell keeps navigation stable while route content changes. Navigation data should feed the sidebar, breadcrumbs, and command palette."
        rule="Active state uses shape and weight in addition to color. Icon-only shell controls always have accessible labels."
        title="Application shell anatomy"
      >
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid min-h-72 md:grid-cols-[13rem_1fr]">
            <aside className="hidden border-r border-border bg-muted/50 p-3 md:block">
              <div className="mb-5 px-2"><p className="font-semibold">Product name</p><p className="text-xs text-muted-foreground">Workspace</p></div>
              <nav aria-label="Example navigation" className="space-y-1">
                {navigation.map(([label, Icon], index) => (
                  <div className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm ${index === 0 ? "bg-background font-medium shadow-xs" : "text-muted-foreground"}`} key={label}>
                    <Icon aria-hidden="true" className="size-4" />{label}
                  </div>
                ))}
              </nav>
            </aside>
            <div className="min-w-0">
              <header className="flex h-14 items-center gap-3 border-b border-border px-4"><span className="text-sm text-muted-foreground">Workspace</span><span aria-hidden="true" className="text-muted-foreground">/</span><span className="text-sm font-medium">Overview</span><Button aria-label="Notifications" className="ml-auto" size="icon-sm" variant="ghost"><Bell /></Button></header>
              <div className="space-y-3 p-5"><SkeletonBlock className="h-7 w-40" /><SkeletonBlock className="h-20 w-full" /><div className="grid gap-3 sm:grid-cols-2"><SkeletonBlock className="h-24" /><SkeletonBlock className="h-24" /></div></div>
            </div>
          </div>
        </div>
      </DesignSystemSection>
    </div>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded-md bg-muted ${className}`} />;
}
