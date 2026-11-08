export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export const THEME_STORAGE_KEY = "vexa-color-theme";
export const THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  return preference === "system" ? (prefersDark ? "dark" : "light") : preference;
}

// Runs in <head> before the page paints; React adopts this preference after hydration.
export const THEME_INIT_SCRIPT = `(()=>{let p="system";try{const v=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(v==="light"||v==="dark")p=v;}catch{}let d=false;try{d=window.matchMedia(${JSON.stringify(THEME_MEDIA_QUERY)}).matches;}catch{}const t=p==="system"?(d?"dark":"light"):p;const r=document.documentElement;r.dataset.theme=t;r.dataset.themePreference=p;r.style.colorScheme=t;})();`;

export type ThemeSync = {
  setPreference: (preference: ThemePreference) => void;
  dispose: () => void;
};

// Browser-only lifecycle. Preferences are device-local, separate from workspace data.
export function startThemeSync(changed: (preference: ThemePreference) => void): ThemeSync {
  const media = window.matchMedia(THEME_MEDIA_QUERY);
  let current: ThemePreference = "system";
  try {
    current = parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // The theme still works when the browser blocks local storage.
  }
  function apply(preference: ThemePreference) {
    current = preference;
    const resolved = resolveTheme(preference, media.matches);
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.themePreference = preference;
    root.style.colorScheme = resolved;
    changed(preference);
  }
  function onSystemChange() {
    if (current === "system") apply(current);
  }
  function onStorage(event: StorageEvent) {
    if (event.key === THEME_STORAGE_KEY || event.key === null)
      apply(parseThemePreference(event.newValue));
  }
  apply(current);
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);
  return {
    setPreference(preference) {
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, preference);
      } catch {
        // Keep the selection for this page even if it cannot be persisted.
      }
      apply(preference);
    },
    dispose() {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener("storage", onStorage);
    },
  };
}
