import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * The one status badge in the product. Tones are named by tone, not by domain
 * meaning; each feature maps its own statuses onto a tone in its `lib/`.
 *
 * Colour never carries the meaning on its own: every badge renders a filled
 * dot and a word alongside the tone.
 */
const statusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-4xl px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        positive: "bg-status-positive-subtle text-status-positive",
        attention: "bg-status-attention-subtle text-status-attention",
        critical: "bg-status-critical-subtle text-status-critical",
        info: "bg-status-info-subtle text-status-info",
        neutral: "bg-status-neutral-subtle text-status-neutral",
      },
      size: {
        default: "h-5.5",
        sm: "h-5 px-1.5 text-[0.6875rem]",
      },
    },
    defaultVariants: { tone: "neutral", size: "default" },
  },
);

export type StatusTone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

export type StatusPresentation = {
  tone: StatusTone;
  label: string;
};

export function StatusBadge({
  tone,
  size,
  label,
  className,
}: VariantProps<typeof statusBadgeVariants> & { label: string; className?: string }) {
  return (
    <span className={cn(statusBadgeVariants({ tone, size }), className)}>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}

export { statusBadgeVariants };
