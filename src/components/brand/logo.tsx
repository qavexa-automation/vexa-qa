import { cn } from "@/lib/utils";

// The VEXA mark from app/icon.svg: a peach tile with the teal V. Brand colors are fixed so the
// mark reads the same in both themes and on the dark sidebar.
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-6", className)}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#ffb498" height="64" rx="17" width="64" />
      <path d="M13 17h13l7 17 8-17h12L33 50z" fill="#103f40" />
      <path d="m15 17 8 17h9l-7-17z" fill="#bb7059" />
    </svg>
  );
}

/** The product name beside its mark. The name stays text so it is readable and selectable. */
export function Wordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark className={markClassName} />
      VEXA
    </span>
  );
}
