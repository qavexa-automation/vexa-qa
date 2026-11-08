"use client";

import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";

import { IconButton } from "@/components/app-shell/icon-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "./theme-provider";
import type { ThemePreference } from "@/lib/theme";

const themes: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/** The color theme as an icon button; the icon shows the current choice. */
export default function ThemeSwitcher({
  className,
  variant = "outline",
}: {
  className?: string;
  variant?: "outline" | "ghost";
}) {
  const { preference, ready, setPreference } = useTheme();
  const current = themes.find((theme) => theme.value === preference) ?? themes[2];

  return (
    <DropdownMenu>
      <IconButton
        ariaLabel={`Color theme: ${current.label}`}
        className={className}
        disabled={!ready}
        icon={current.icon}
        label="Color theme"
        render={(button) => <DropdownMenuTrigger render={button} />}
        variant={variant}
      />
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Color theme</DropdownMenuLabel>
          {themes.map(({ value, label, icon: Icon }) => (
            <DropdownMenuItem key={value} onClick={() => setPreference(value)}>
              <Icon aria-hidden="true" />
              {label}
              {value === preference && (
                <Check aria-label="Selected" className="ml-auto size-4 text-brand" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
