import { SingleStackedBar, Sparkline } from "@/components/charts";
import { ChartDemoPlot } from "@/features/design-system/components/chart-demo-plot";
import { DesignSystemSection } from "@/features/design-system/components/design-system-section";

const CATEGORICAL = [
  { token: "--chart-1", className: "bg-chart-1", label: "Slot 1", use: "Green. First or only series." },
  { token: "--chart-2", className: "bg-chart-2", label: "Slot 2", use: "Indigo." },
  { token: "--chart-3", className: "bg-chart-3", label: "Slot 3", use: "Pink." },
  { token: "--chart-4", className: "bg-chart-4", label: "Slot 4", use: "Amber. Failures against passes." },
  { token: "--chart-5", className: "bg-chart-5", label: "Slot 5", use: "Cyan." },
];

const AGING = [
  { token: "--chart-age-1", className: "bg-chart-age-1", label: "Not yet due" },
  { token: "--chart-age-2", className: "bg-chart-age-2", label: "1 to 30 days" },
  { token: "--chart-age-3", className: "bg-chart-age-3", label: "31 to 60 days" },
  { token: "--chart-age-4", className: "bg-chart-age-4", label: "61 to 90 days" },
  { token: "--chart-age-5", className: "bg-chart-age-5", label: "Over 90 days" },
];

const SPARK = [82, 88, 91, 90, 77, 70];

export function ChartsSection() {
  return (
    <div className="space-y-8">
      <DesignSystemSection
        description="Every chart colour does one job. Identity takes the categorical slots in a fixed order, a position in a sequence takes a one-hue ordinal ramp, and a state takes the status tones."
        rule="The order of the categorical slots is the colourblind-safety mechanism. It is computed, not chosen, and it never changes."
        title="Chart colour"
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              Categorical, assigned in this order and never cycled
            </h3>
            <ul className="space-y-1.5">
              {CATEGORICAL.map((slot) => (
                <li className="flex items-center gap-3 text-sm" key={slot.token}>
                  <span aria-hidden="true" className={`size-6 shrink-0 rounded-[4px] ${slot.className}`} />
                  <span className="w-28 shrink-0 font-mono text-xs">{slot.token}</span>
                  <span className="text-muted-foreground">{slot.use}</span>
                </li>
              ))}
            </ul>
            <p className="max-w-2xl text-xs leading-5 text-muted-foreground">
              Validated on the card surface in both modes: worst adjacent pair 10.9 ΔE under
              protanopia and 17.9 ΔE at normal vision in light, 10.5 and 17.1 in dark, every slot
              above 3:1 contrast. A sixth series is never a new hue.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground">
              Ordinal, for buckets whose order carries meaning
            </h3>
            <SingleStackedBar
              ariaLabel="The aging ramp, light to dark as a receivable gets older"
              formatValue={(value) => `${value}%`}
              segments={AGING.map((step, index) => ({
                key: step.token,
                label: step.label,
                value: [8, 26, 30, 20, 16][index],
                className: step.className,
              }))}
            />
          </div>
        </div>
      </DesignSystemSection>

      <DesignSystemSection
        description="A plotted chart is the shadcn chart component over Recharts. A figure that is really a proportion, a meter, or a trend beside a number is plain markup, because a plotting library adds weight without adding meaning."
        rule="Marks are thin and capped with a rounded data end, gridlines are solid hairlines on one axis, and every chart carries a table view of the same figures."
        title="Chart anatomy"
      >
        <div className="grid gap-8 @3xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <h3 className="mb-3 text-xs font-medium text-muted-foreground">
              Bars for the inputs, a line for the conclusion
            </h3>
            <ChartDemoPlot />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Money in and money out mean good and bad, so they wear the status tones. The result
              is a line rather than a third bar, because it is the answer to the other two and not
              a peer of them. All three share one axis: a second scale would invent a relationship
              that is not in the data.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-medium text-muted-foreground">
              Sparkline, for a stat tile
            </h3>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Issues closed this month</p>
              <p className="mt-1 text-2xl font-semibold">128</p>
              <span className="mt-2 block text-chart-1">
                <Sparkline ariaLabel="Six months of issues closed" values={SPARK} />
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              A sparkline carries shape, not values, so it takes no axes and no labels. The number on the
              tile is the reading.
            </p>
          </div>
        </div>
      </DesignSystemSection>
    </div>
  );
}
