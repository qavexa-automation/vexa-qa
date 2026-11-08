"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const config = {
  collected: { label: "In", color: "var(--status-positive)" },
  spent: { label: "Out", color: "var(--status-critical)" },
  kept: { label: "Kept", color: "var(--chart-2)" },
} satisfies ChartConfig;

const DATA = [
  { label: "Apr", collected: 62, spent: 20, kept: 42 },
  { label: "May", collected: 68, spent: 17, kept: 51 },
  { label: "Jun", collected: 65, spent: 18, kept: 47 },
  { label: "Jul", collected: 64, spent: 76, kept: -12 },
  { label: "Aug", collected: 52, spent: 19, kept: 33 },
  { label: "Sep", collected: 56, spent: 18, kept: 38 },
];

/**
 * Bars for the inputs, a line for the conclusion, one shared axis. Shown with
 * the tokens and specs a real chart uses: a solid baseline, thin capped bars
 * with a rounded data end, a hairline grid on one axis, and a 2px line whose
 * dots carry a surface ring.
 */
export function ChartDemoPlot() {
  return (
    <ChartContainer className="aspect-auto h-52 w-full" config={config}>
      <ComposedChart accessibilityLayer data={DATA} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis axisLine={false} dataKey="label" tickLine={false} tickMargin={8} />
        <YAxis axisLine={false} tickLine={false} tickMargin={6} width={36} />
        <ReferenceLine stroke="var(--color-border)" strokeWidth={1.5} y={0} />
        <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
        <Bar
          dataKey="collected"
          fill="var(--color-collected)"
          isAnimationActive={false}
          maxBarSize={16}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="spent"
          fill="var(--color-spent)"
          isAnimationActive={false}
          maxBarSize={16}
          radius={[4, 4, 0, 0]}
        />
        <Line
          activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
          dataKey="kept"
          dot={{ fill: "var(--color-kept)", r: 3, stroke: "var(--card)", strokeWidth: 2 }}
          isAnimationActive={false}
          stroke="var(--color-kept)"
          strokeLinecap="round"
          strokeWidth={2}
          type="monotone"
        />
      </ComposedChart>
    </ChartContainer>
  );
}
