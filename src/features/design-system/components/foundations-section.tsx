import { DesignSystemSection } from "@/features/design-system/components/design-system-section";
import { colorGroups, radiusRows, typeRows } from "@/features/design-system/lib/design-catalog";

export function FoundationsSection() {
  return (
    <div className="space-y-8">
      <DesignSystemSection
        description="Every feature resolves color through semantic variables in app/globals.css. Rebrand by changing token values, not component markup."
        rule="Feature code uses semantic utilities. Color literals stay in globals.css."
        title="Color tokens"
      >
        <div className="grid gap-6 @3xl:grid-cols-2">
          {colorGroups.map((group) => (
            <div className="space-y-3" key={group.title}>
              <h3 className="text-xs font-medium text-muted-foreground">{group.title}</h3>
              <ul className="space-y-2">
                {group.swatches.map(([label, className, usage]) => (
                  <li className="flex items-center gap-3" key={label}>
                    <span aria-hidden="true" className={`size-9 shrink-0 rounded-md border border-border ${className}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-muted-foreground">{usage}</span>
                    </span>
                    <code className="text-xs text-muted-foreground">{className}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DesignSystemSection>

      <DesignSystemSection
        description="Geist carries interface text while Geist Mono is reserved for identifiers, code, timestamps, and tabular numbers."
        rule="Use the shared scale before introducing one-off text sizes or another font family."
        title="Typography"
      >
        <dl className="divide-y divide-border">
          {typeRows.map(([role, utility, sample]) => (
            <div className="grid gap-2 py-3 first:pt-0 last:pb-0 @2xl:grid-cols-[9rem_1fr_auto] @2xl:items-center" key={role}>
              <dt className="text-xs text-muted-foreground">{role}</dt>
              <dd className={utility}>{sample}</dd>
              <dd><code className="text-xs text-muted-foreground">{utility}</code></dd>
            </div>
          ))}
        </dl>
      </DesignSystemSection>

      <DesignSystemSection
        description="The radius scale stays compact and elevation communicates a real layer change."
        rule="Nested surfaces use a smaller radius and never stack shadows."
        title="Shape and elevation"
      >
        <div className="grid gap-6 @3xl:grid-cols-2">
          <ul className="space-y-2">
            {radiusRows.map(([utility, usage]) => (
              <li className="flex items-center gap-3" key={utility}>
                <span aria-hidden="true" className={`size-10 border border-border bg-accent ${utility}`} />
                <span>
                  <span className="block font-mono text-xs">{utility}</span>
                  <span className="text-xs text-muted-foreground">{usage}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-2 gap-4">
            {[["shadow-xs", "Card"], ["shadow-sm", "Raised"], ["shadow-md", "Popover"], ["shadow-lg", "Overlay"]].map(([shadow, label]) => (
              <div className={`grid min-h-20 place-items-center rounded-lg border border-border bg-card ${shadow}`} key={shadow}>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </DesignSystemSection>
      <DesignSystemSection
        description="The public site carries the brand and is judged in the first three seconds, so its display sizes are fluid while the back office stays on the fixed Tailwind scale."
        rule="Apply surface-public on the public route group. It rebinds primary, primary-foreground, ring, and radius, and nothing else."
        title="Public surface"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              Fluid display type
            </h3>
            <p className="text-display font-semibold tracking-tight">Display heading</p>
            <p className="text-display-sm font-semibold tracking-tight">Section heading</p>
            <p className="text-xs text-muted-foreground">
              <code className="font-mono">.text-display</code> clamps between 2.25rem and 3.75rem.{" "}
              <code className="font-mono">.text-display-sm</code> clamps between 1.75rem and 2.5rem.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">Brand rebinding</h3>
            <div className="grid gap-4 @3xl:grid-cols-2">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Back office</p>
                <button className="mt-2 h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground" type="button">
                  Primary action
                </button>
              </div>
              <div className="surface-public rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground">Inside surface-public</p>
                <button className="mt-2 h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground" type="button">
                  Primary action
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">Photo scrim</h3>
            <div className="relative grid h-32 items-end overflow-hidden rounded-xl bg-[oklch(0.62_0.03_92)]">
              <div aria-hidden="true" className="photo-scrim absolute inset-0" />
              <p className="relative p-4 text-sm font-medium text-white">
                Text over photography always sits on a scrim
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              <code className="font-mono">.photo-scrim</code> builds its gradient from the
              foreground token, so it follows the theme instead of hard-coded black.
            </p>
          </div>
        </div>
      </DesignSystemSection>
    </div>
  );
}