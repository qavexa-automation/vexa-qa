"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useDelayedPending } from "@/hooks/use-delayed-pending";

/** A navigation that never lands (cancelled, failed) must not pin the bar. */
const GIVE_UP_MS = 10_000;

/** The internal page a click is about to open, or null if it opens nothing new. */
function navigationTarget(event: MouseEvent): string | null {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;
  // Same page with new search params is a list refinement; the table's own bar covers it.
  if (url.pathname === window.location.pathname) return null;
  // Stored files open through a redirect, not a page.
  if (url.pathname.startsWith("/files/")) return null;
  return url.pathname;
}

/**
 * A slim bar at the top of the viewport while the next page loads. It supplements the route's
 * loading skeleton. Next has no global navigation event, so it starts on a click of an internal
 * link and ends when the pathname changes; instant, prefetched navigations never show it.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [startedFrom, setStartedFrom] = useState<string | null>(null);
  const [landedOn, setLandedOn] = useState(pathname);

  // Landed: forget the start, or going back to that page would revive the bar.
  if (pathname !== landedOn) {
    setLandedOn(pathname);
    setStartedFrom(null);
  }

  useEffect(() => {
    let giveUp: ReturnType<typeof setTimeout> | undefined;
    function onClick(event: MouseEvent) {
      if (!navigationTarget(event)) return;
      setStartedFrom(window.location.pathname);
      clearTimeout(giveUp);
      giveUp = setTimeout(() => setStartedFrom(null), GIVE_UP_MS);
    }
    // Capture: next/link prevents the default, so a bubbling listener cannot tell a client
    // navigation from a cancelled click.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimeout(giveUp);
    };
  }, []);

  const visible = useDelayedPending(startedFrom === pathname);
  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-60 h-0.5 overflow-hidden bg-primary/15"
    >
      <div className="h-full w-1/3 bg-primary motion-safe:animate-pulse" />
    </div>
  );
}
