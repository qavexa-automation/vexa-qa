"use client";
import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import { emptyWorkspace, parseWorkspace, type Workspace } from "./model";
import { removeUntouchedDemoData } from "./seed";
import { supabase } from "./supabase";
import { CloudWorkspace } from "./cloud-workspace";
import { relationalBackend } from "./relational-workspace";

const STORAGE_KEY = "vexa-qa-demo-v1";
export const LOCAL_WORKSPACE_BACKUP_KEY = `${STORAGE_KEY}-before-sample-cleanup`;
export type SharedWorkspace = { owner: string; label: string };

export function useWorkspace() {
  const [workspace, updateWorkspace] = useState<Workspace>(emptyWorkspace);
  const current = useRef(workspace);
  const [user, setUser] = useState<User | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [sharedWorkspaces, setSharedWorkspaces] = useState<SharedWorkspace[]>([]);
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState("Loading workspace");
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const [hasLocalBackup, setHasLocalBackup] = useState(false);
  const userRef = useRef<string | null | undefined>(undefined);
  const epoch = useRef(0);
  const blocked = useRef(false);
  const cloud = useRef<CloudWorkspace | null>(null);
  const localSaved = useRef<Workspace | null>(null);

  const display = useCallback((data: Workspace) => {
    current.current = data;
    updateWorkspace(data);
  }, []);

  const load = useCallback(
    async (nextUser: User | null, selectedOwner?: string) => {
      const currentEpoch = ++epoch.current;
      cloud.current?.dispose();
      cloud.current = null;
      setReady(false);
      setLive(false);
      setError("");
      blocked.current = false;
      userRef.current = nextUser?.id ?? null;
      setUser(nextUser);
      try {
        let data: Workspace;
        if (nextUser && supabase) {
          const client = supabase;
          setSync("Loading cloud workspace");
          const membership = await client
            .from("qa_workspace_members")
            .select("workspace_owner")
            .eq("member_id", nextUser.id);
          if (membership.error)
            throw new Error(
              `${membership.error.message}. Run the relational workspace migration in supabase/migrations.`,
            );
          if (epoch.current !== currentEpoch) return;
          const shared = (membership.data ?? []).map((m) => ({
            owner: m.workspace_owner as string,
            label: `Team workspace ${String(m.workspace_owner).slice(0, 8)}`,
          }));
          setSharedWorkspaces(shared);
          const savedOwner = selectedOwner ?? localStorage.getItem(`vexa-workspace-${nextUser.id}`);
          const workspaceOwner =
            savedOwner && shared.some((m) => m.owner === savedOwner) ? savedOwner : nextUser.id;
          setOwner(workspaceOwner);
          const backend = relationalBackend(client, workspaceOwner, nextUser.id);
          const snapshot = await backend.read();
          if (epoch.current !== currentEpoch) return;
          data = snapshot.workspace;
          cloud.current = new CloudWorkspace(
            snapshot,
            backend,
            (updated, pending) => {
              display(updated);
              setSync(pending ? "Saving to cloud…" : "Cloud synced");
            },
            (message) => {
              blocked.current = true;
              setError(message);
              setSync("Changes not saved — export a backup");
            },
          );
          localStorage.setItem(`vexa-workspace-${nextUser.id}`, workspaceOwner);
        } else {
          setOwner(null);
          setSharedWorkspaces([]);
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            let parsed: unknown;
            try {
              parsed = JSON.parse(saved);
            } catch {
              throw new Error(
                "Local workspace data could not be read. Export a backup before clearing this site's storage.",
              );
            }
            const loaded = parseWorkspace(parsed);
            if (!loaded)
              throw new Error(
                "Local workspace data has an unsupported format. Export a backup before clearing this site's storage.",
              );
            data = removeUntouchedDemoData(loaded);
            if (data !== loaded) {
              if (!localStorage.getItem(LOCAL_WORKSPACE_BACKUP_KEY))
                localStorage.setItem(LOCAL_WORKSPACE_BACKUP_KEY, saved);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            }
          } else data = emptyWorkspace();
        }
        if (epoch.current !== currentEpoch) return;
        setHasLocalBackup(!nextUser && !!localStorage.getItem(LOCAL_WORKSPACE_BACKUP_KEY));
        localSaved.current = data;
        display(data);
        setSync(nextUser ? "Cloud synced" : "Saved on this device");
        setReady(true);
      } catch (e) {
        if (epoch.current !== currentEpoch) return;
        blocked.current = true;
        setError(e instanceof Error ? e.message : "Unable to load workspace");
        setSync("Connection needs attention");
      }
    },
    [display],
  );

  const setWorkspace = useCallback(
    (action: SetStateAction<Workspace>) => {
      if (blocked.current) return;
      const next = typeof action === "function" ? action(current.current) : action;
      if (cloud.current) cloud.current.edit(next);
      else display(next);
    },
    [display],
  );

  useEffect(() => {
    if (!supabase) {
      void load(null);
      return () => {
        epoch.current++;
      };
    }
    let cancelled = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      if (userRef.current !== (next?.id ?? null)) {
        epoch.current++;
        cloud.current?.dispose();
        blocked.current = true;
        setReady(false);
        // Database calls must run outside Supabase's auth callback lock.
        setTimeout(() => {
          if (!cancelled) void load(next);
        }, 0);
      }
    });
    return () => {
      cancelled = true;
      epoch.current++;
      cloud.current?.dispose();
      userRef.current = undefined;
      subscription.unsubscribe();
    };
  }, [load]);

  useEffect(() => {
    if (!ready || blocked.current) return;
    const session = cloud.current;
    if (session) {
      if (!session.pending) return;
      const timer = setTimeout(() => {
        void session.save();
      }, 450);
      return () => clearTimeout(timer);
    }
    if (localSaved.current === workspace) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
      localSaved.current = workspace;
      setSync("Saved on this device");
    } catch {
      blocked.current = true;
      setError("Local save failed. Export your workspace to keep a backup.");
    }
  }, [workspace, ready]);

  useEffect(() => {
    if (!ready || !user || !owner || !supabase || !cloud.current) return;
    const session = cloud.current;
    const refresh = () => {
      void session.refresh();
    };
    let active = true;
    const channel = supabase
      .channel(`qa-workspace-${owner}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "qa_workspaces", filter: `user_id=eq.${owner}` },
        refresh,
      )
      .subscribe((status) => {
        if (!active) return;
        setLive(status === "SUBSCRIBED");
        // Refetch after subscribing/reconnecting to close the initial fetch/subscribe gap.
        if (status === "SUBSCRIBED") refresh();
      });
    const timer = setInterval(refresh, 10000);
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", visible);
      void supabase?.removeChannel(channel);
    };
  }, [ready, user, owner]);

  useEffect(() => {
    const warnPending = (event: BeforeUnloadEvent) => {
      if (cloud.current?.pending || (!user && localSaved.current !== current.current)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warnPending);
    return () => window.removeEventListener("beforeunload", warnPending);
  }, [user]);

  const switchWorkspace = async (workspaceOwner: string) => {
    if (!user) return;
    await cloud.current?.save();
    if (cloud.current && !cloud.current.canSwitch)
      throw new Error(
        "Export your unsaved changes and resolve the save error before switching workspaces.",
      );
    await load(user, workspaceOwner);
  };

  const joinWorkspace = async (code: string) => {
    if (!user || !supabase) throw new Error("Sign in before joining a team workspace.");
    await cloud.current?.save();
    if (cloud.current && !cloud.current.canSwitch)
      throw new Error("Save or export your current changes before joining another workspace.");
    const result = await supabase.rpc("join_qa_workspace", { invite_code: code.trim() });
    if (result.error) throw new Error(result.error.message);
    await load(user, String(result.data));
  };

  return {
    workspace,
    setWorkspace,
    user,
    owner,
    sharedWorkspaces,
    ready,
    error,
    hasLocalBackup,
    sync:
      user && sync === "Cloud synced"
        ? live
          ? "Cloud synced · Live updates on"
          : "Cloud synced · Reconnecting live updates"
        : sync,
    reload: () => load(user, owner ?? undefined),
    switchWorkspace,
    joinWorkspace,
    flush: async () => {
      await cloud.current?.save(true);
      if (cloud.current && !cloud.current.canSwitch)
        throw new Error("Resolve the save error before sharing this workspace.");
    },
  };
}
