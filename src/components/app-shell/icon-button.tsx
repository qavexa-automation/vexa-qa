"use client";

import type { ComponentProps, ReactElement, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * An icon-only action. The tooltip names it for sighted users; `ariaLabel` can add the record it
 * acts on for screen readers ("Delete modification: Portal, Login").
 */
export function IconButton({
  label,
  ariaLabel,
  icon: Icon,
  destructive = false,
  className,
  render,
  badge,
  ...props
}: Omit<ComponentProps<typeof Button>, "children" | "render"> & {
  label: string;
  ariaLabel?: string;
  icon: LucideIcon;
  destructive?: boolean;
  /** Wraps the button in another trigger, such as a menu trigger. */
  render?: (button: ReactElement) => ReactElement;
  /** A small count or dot over the icon, e.g. how many columns are hidden. */
  badge?: ReactNode;
}) {
  const button = (
    <Button
      aria-label={ariaLabel ?? label}
      className={cn(
        "relative text-muted-foreground hover:text-foreground",
        destructive && "hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
      size="icon-sm"
      variant="ghost"
      {...props}
    />
  );
  return (
    <Tooltip>
      <TooltipTrigger render={render ? render(button) : button}>
        <Icon aria-hidden="true" />
        {badge !== undefined && badge !== null && badge !== false && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[0.625rem] leading-4 font-semibold text-brand-foreground"
          >
            {badge}
          </span>
        )}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
