import { cn } from "@/lib/utils";

/**
 * A twelve-point-or-fewer trend for a stat tile. It carries shape, not values,
 * so it takes no axes and no labels: the tile's own number is the reading, and
 * the chart beside it says which way that number has been moving.
 */
export function Sparkline({
  values,
  className,
  ariaLabel,
}: {
  values: number[];
  className?: string;
  ariaLabel: string;
}) {
  if (values.length < 2) return null;

  const width = 100;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 2 - ((value - min) / span) * (height - 4);
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg
      aria-label={ariaLabel}
      className={cn("h-7 w-full", className)}
      fill="none"
      preserveAspectRatio="none"
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={path}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {/* The current period gets the end dot, with a surface ring so it stays
          legible where it meets the line. */}
      <circle
        cx={lastX}
        cy={lastY}
        fill="currentColor"
        r="2.5"
        stroke="var(--card)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
