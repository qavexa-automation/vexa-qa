import type { LucideIcon } from "lucide-react";
import { Sparkle } from "lucide-react";
import { cn } from "@/lib/utils";
import styles from "./achievement-icon.module.css";

type Motion = "float" | "scuttle" | "swing" | "tilt" | "charge" | "shield";

/** Decorative motion stays separate from the saved data that earns each achievement. */
export function AchievementIcon({
  icon: Icon,
  motion = "float",
  unlocked = false,
  paused = false,
  size = 30,
  className,
}: {
  icon: LucideIcon;
  motion?: Motion;
  unlocked?: boolean;
  paused?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative isolate inline-grid shrink-0 place-items-center",
        paused && styles.paused,
        className,
      )}
    >
      {unlocked && (
        <>
          <span
            className={cn(
              "pointer-events-none absolute inset-1 rounded-full border border-current opacity-20",
              styles.halo,
            )}
          />
          <Sparkle
            className={cn(
              "pointer-events-none absolute -top-1 -right-1 size-3.5 fill-current",
              styles.sparkle,
            )}
          />
          <Sparkle
            style={{ animationDelay: "1.6s" }}
            className={cn(
              "pointer-events-none absolute -bottom-0.5 -left-1 size-2.5 fill-current",
              styles.sparkle,
            )}
          />
        </>
      )}
      <Icon className={styles[motion]} size={size} strokeWidth={1.5} />
    </span>
  );
}
