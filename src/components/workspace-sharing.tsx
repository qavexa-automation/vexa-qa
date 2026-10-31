"use client";
import { useEffect, useState } from "react";
import { Copy, Users, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { SharedWorkspace } from "@/lib/use-workspace";

type Member = { member_id: string; member_email: string };
type Invite = { code: string; expires_at: string };

export default function WorkspaceSharing({
  userId,
  owner,
  workspaces,
  onSwitch,
  onJoin,
  flush,
}: {
  userId: string;
  owner: string;
  workspaces: SharedWorkspace[];
  onSwitch: (owner: string) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
  flush: () => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState<Invite | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");
  const own = owner === userId;

  useEffect(() => {
    if (!own || !supabase) return;
    let active = true;
    void Promise.all([
      supabase
        .from("qa_workspace_invites")
        .select("code, expires_at")
        .eq("workspace_owner", userId)
        .maybeSingle(),
      supabase
        .from("qa_workspace_members")
        .select("member_id, member_email")
        .eq("workspace_owner", userId),
    ]).then(([invitation, team]) => {
      if (!active) return;
      if (invitation.error || team.error)
        setProblem(
          invitation.error?.message ?? team.error?.message ?? "Unable to load team access.",
        );
      else {
        setInvite(invitation.data);
        setMembers(team.data ?? []);
      }
    });
    return () => {
      active = false;
    };
  }, [own, userId]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setProblem("");
    setMessage("");
    try {
      await action();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Unable to update team access.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="settings-account workspace-sharing">
      <span className="eyebrow">TEAM COLLABORATION</span>
      <h3>
        <Users size={18} /> Shared workspaces
      </h3>
      <p>
        Everyone who joins can view and edit projects, quests, tests, modifications, and
        deployments. Saved changes appear automatically for teammates.
      </p>
      <fieldset className="settings-form sharing-controls" disabled={busy}>
        <label>
          Current workspace
          <select value={owner} onChange={(event) => void run(() => onSwitch(event.target.value))}>
            <option value={userId}>My workspace</option>
            {workspaces.map((w) => (
              <option key={w.owner} value={w.owner}>
                {w.label}
              </option>
            ))}
          </select>
        </label>
        {own ? (
          <>
            <p>
              Share an invite code with your team. Codes expire after 7 days. Creating a new code
              replaces the previous one; existing members keep access.
            </p>
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                void run(async () => {
                  if (!supabase) return;
                  await flush();
                  const result = await supabase.rpc("create_qa_workspace_invite");
                  if (result.error) throw new Error(result.error.message);
                  const saved = await supabase
                    .from("qa_workspace_invites")
                    .select("code, expires_at")
                    .eq("workspace_owner", userId)
                    .single();
                  if (saved.error) throw new Error(saved.error.message);
                  setInvite(saved.data);
                  setMessage(
                    "Invite code ready. Send it to the teammates you want to give edit access.",
                  );
                })
              }
            >
              {invite ? "Create new invite code" : "Create invite code"}
            </button>
            {invite && (
              <div className="sharing-invite">
                <label>
                  Invite code
                  <input readOnly value={invite.code} onFocus={(e) => e.target.select()} />
                </label>
                <span>Expires {new Date(invite.expires_at).toLocaleString()}</span>
                <div className="sharing-actions">
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() =>
                      void run(async () => {
                        await navigator.clipboard.writeText(invite.code);
                        setMessage("Invite code copied.");
                      })
                    }
                  >
                    <Copy size={14} /> Copy code
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() =>
                      void run(async () => {
                        const result = await supabase!
                          .from("qa_workspace_invites")
                          .delete()
                          .eq("workspace_owner", userId);
                        if (result.error) throw new Error(result.error.message);
                        setInvite(null);
                        setMessage("Invite code disabled. Existing members still have access.");
                      })
                    }
                  >
                    Disable code
                  </button>
                </div>
              </div>
            )}
            <div className="sharing-members">
              <strong>Workspace members</strong>
              <p>You (owner)</p>
              {members.map((member) => (
                <div key={member.member_id} className="sharing-member">
                  <span>{member.member_email}</span>
                  <button
                    className="button secondary"
                    type="button"
                    aria-label={`Remove ${member.member_email}`}
                    onClick={() =>
                      void run(async () => {
                        const result = await supabase!
                          .from("qa_workspace_members")
                          .delete()
                          .eq("workspace_owner", userId)
                          .eq("member_id", member.member_id);
                        if (result.error) throw new Error(result.error.message);
                        setMembers((previous) =>
                          previous.filter((m) => m.member_id !== member.member_id),
                        );
                        setMessage(
                          "Member removed. Disable or replace the invite code to prevent them from rejoining.",
                        );
                      })
                    }
                  >
                    <X size={14} /> Remove
                  </button>
                </div>
              ))}
              <button
                className="button secondary"
                type="button"
                onClick={() =>
                  void run(async () => {
                    const result = await supabase!
                      .from("qa_workspace_members")
                      .select("member_id, member_email")
                      .eq("workspace_owner", userId);
                    if (result.error) throw new Error(result.error.message);
                    setMembers(result.data ?? []);
                    setMessage("Member list refreshed.");
                  })
                }
              >
                Refresh members
              </button>
            </div>
          </>
        ) : (
          <p>
            You have edit access to this team workspace. The owner manages invitations and members.
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await onJoin(code);
              setCode("");
            });
          }}
        >
          <label>
            Join a team workspace
            <input
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Paste an invite code"
              pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
              title="Enter the full invite code supplied by the workspace owner."
            />
          </label>
          <button className="button primary" type="submit">
            Join workspace
          </button>
        </form>
      </fieldset>
      {busy && <p role="status">Updating team workspace…</p>}
      {message && <p role="status">{message}</p>}
      {problem && (
        <p className="sharing-error" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
