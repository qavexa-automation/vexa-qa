import { runInNewContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseThemePreference,
  resolveTheme,
  startThemeSync,
  THEME_INIT_SCRIPT,
  THEME_MEDIA_QUERY,
  THEME_STORAGE_KEY,
} from "./theme";

function browser(stored: string | null = null, dark = false, blocked = false) {
  const dataset: Record<string, string> = {};
  const style = { colorScheme: "" };
  const storage = new Map<string, string>();
  if (stored !== null) storage.set(THEME_STORAGE_KEY, stored);
  const localStorage = {
    getItem(key: string) {
      if (blocked) throw new Error("Storage blocked");
      return storage.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (blocked) throw new Error("Storage blocked");
      storage.set(key, value);
    },
  };
  const mediaListeners = new Set<() => void>();
  const storageListeners = new Set<(event: Pick<StorageEvent, "key" | "newValue">) => void>();
  const media = {
    matches: dark,
    addEventListener: (_event: string, handler: () => void) => mediaListeners.add(handler),
    removeEventListener: (_event: string, handler: () => void) => mediaListeners.delete(handler),
  };
  const document = { documentElement: { dataset, style } };
  const window = {
    localStorage,
    matchMedia(query: string) {
      expect(query).toBe(THEME_MEDIA_QUERY);
      return media;
    },
    addEventListener: (
      _event: string,
      handler: (event: Pick<StorageEvent, "key" | "newValue">) => void,
    ) => storageListeners.add(handler),
    removeEventListener: (
      _event: string,
      handler: (event: Pick<StorageEvent, "key" | "newValue">) => void,
    ) => storageListeners.delete(handler),
  };
  vi.stubGlobal("window", window);
  vi.stubGlobal("document", document);
  return {
    dataset,
    style,
    storage,
    mediaListeners,
    storageListeners,
    prepaint: () => runInNewContext(THEME_INIT_SCRIPT, { window, document, localStorage }),
    systemChange(dark: boolean) {
      media.matches = dark;
      mediaListeners.forEach((handler) => handler());
    },
    storageChange(key: string | null, newValue: string | null) {
      storageListeners.forEach((handler) => handler({ key, newValue }));
    },
  };
}
afterEach(() => vi.unstubAllGlobals());

describe("theme preference", () => {
  it("defaults missing or invalid preferences to system, while explicit choices override the device", () => {
    for (const invalid of [null, undefined, "invalid", "DARK", {}, 1])
      expect(parseThemePreference(invalid)).toBe("system");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it.each([
    ["light", true, "light"],
    ["dark", false, "dark"],
    ["system", true, "dark"],
    [null, false, "light"],
    ["invalid", true, "dark"],
  ])(
    "applies %s before paint and preserves the same appearance after hydration",
    (stored, dark, expected) => {
      const b = browser(stored as string | null, dark as boolean);
      b.prepaint();
      expect(b.dataset.theme).toBe(expected);
      const before = { ...b.dataset };
      const changed = vi.fn();
      const sync = startThemeSync(changed);
      expect(b.dataset).toEqual(before);
      expect(b.style.colorScheme).toBe(expected);
      sync.dispose();
    },
  );

  it("follows device changes only in System mode and persists explicit selections", () => {
    const b = browser(null, false);
    const sync = startThemeSync(vi.fn());
    b.systemChange(true);
    expect(b.dataset.theme).toBe("dark");
    expect(b.storage.has(THEME_STORAGE_KEY)).toBe(false);
    sync.setPreference("light");
    expect(b.storage.get(THEME_STORAGE_KEY)).toBe("light");
    b.systemChange(false);
    b.systemChange(true);
    expect(b.dataset.theme).toBe("light");
    sync.setPreference("system");
    expect(b.dataset.theme).toBe("dark");
    b.systemChange(false);
    expect(b.dataset.theme).toBe("light");
    sync.dispose();
    b.prepaint();
    expect(b.dataset.themePreference).toBe("system");
  });

  it("synchronizes another tab's preference and falls back to the device when storage is cleared", () => {
    const b = browser("light", true);
    const changed = vi.fn();
    const sync = startThemeSync(changed);
    b.storageChange("other-setting", "dark");
    expect(b.dataset.theme).toBe("light");
    b.storageChange(THEME_STORAGE_KEY, "dark");
    expect(b.dataset.theme).toBe("dark");
    expect(changed).toHaveBeenLastCalledWith("dark");
    b.storageChange(null, null);
    expect(b.dataset.themePreference).toBe("system");
    expect(b.dataset.theme).toBe("dark");
    sync.dispose();
    expect(b.mediaListeners.size).toBe(0);
    expect(b.storageListeners.size).toBe(0);
  });

  it("keeps theme switching usable when localStorage access fails", () => {
    const b = browser(null, true, true);
    expect(() => b.prepaint()).not.toThrow();
    expect(b.dataset.theme).toBe("dark");
    const sync = startThemeSync(vi.fn());
    expect(() => sync.setPreference("light")).not.toThrow();
    expect(b.dataset.theme).toBe("light");
    expect(b.dataset.themePreference).toBe("light");
    sync.dispose();
  });
});
