"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { startThemeSync, type ThemePreference, type ThemeSync } from "@/lib/theme";

type ThemeContextValue = {
  preference: ThemePreference;
  ready: boolean;
  setPreference: (preference: ThemePreference) => void;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);
  const sync = useRef<ThemeSync | null>(null);
  useEffect(() => {
    sync.current = startThemeSync((next) => {
      setPreference(next);
      setReady(true);
    });
    return () => {
      sync.current?.dispose();
      sync.current = null;
    };
  }, []);
  return (
    <ThemeContext.Provider
      value={{ preference, ready, setPreference: (next) => sync.current?.setPreference(next) }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("Theme controls must be inside ThemeProvider.");
  return theme;
}
