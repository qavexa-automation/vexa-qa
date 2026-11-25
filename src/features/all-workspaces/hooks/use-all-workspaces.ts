import { useCallback, useEffect, useRef, useState } from "react";

import { ownWorkspaceLabel } from "@/features/profile";
import {
  listSharedWorkspaces,
  readRelationalWorkspace,
  readTeamCalendarWorkspace,
} from "@/lib/relational-workspace";
import { supabase } from "@/lib/supabase";

import type { WorkspaceSource } from "../lib/workspace-records";

const REFRESH_INTERVAL = 10_000;

export function useAllWorkspaces(userId: string, scope: "all" | "team-calendar" = "all") {
  const [sources, setSources] = useState<WorkspaceSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const refreshRef = useRef<() => void>(() => {});
  const refresh = useCallback(() => refreshRef.current(), []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    let inFlight = false;
    let refreshQueued = false;

    async function load() {
      if (!client || inFlight) return;
      inFlight = true;
      setRefreshing(true);
      try {
        const { data: auth } = await client.auth.getSession();
        const ownLabel = ownWorkspaceLabel(auth.session?.user);
        const workspaces =
          scope === "team-calendar"
            ? [await readTeamCalendarWorkspace(client, userId, ownLabel)]
            : [
                { owner: userId, label: ownLabel },
                ...(await listSharedWorkspaces(client, userId)),
              ];
        if (!active) return;
        const results = await Promise.allSettled(
          workspaces.map(async (workspace): Promise<WorkspaceSource> => {
            const { snapshot, role } = await readRelationalWorkspace(
              client,
              workspace.owner,
              userId,
            );
            return { ...workspace, role, workspace: snapshot.workspace };
          }),
        );
        if (!active) return;
        const available = results.flatMap((result) =>
          result.status === "fulfilled" ? [result.value] : [],
        );
        setSources(available);
        setError(
          available.length === workspaces.length
            ? ""
            : available.length
              ? "Some workspaces couldn’t be loaded."
              : "Workspaces couldn’t be loaded.",
        );
      } catch {
        if (!active) return;
        setSources([]);
        setError("Workspace access couldn’t be checked.");
      } finally {
        inFlight = false;
        if (active) {
          setLoading(false);
          setRefreshing(false);
          if (refreshQueued) {
            refreshQueued = false;
            void load();
          }
        }
      }
    }

    function refreshVisible() {
      if (document.visibilityState === "visible") void load();
    }

    refreshRef.current = () => {
      if (inFlight) refreshQueued = true;
      else void load();
    };
    void load();
    const interval = window.setInterval(refreshVisible, REFRESH_INTERVAL);
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("online", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      active = false;
      refreshRef.current = () => {};
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("online", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [userId, scope]);

  return { sources, loading, refreshing, error, refresh };
}
