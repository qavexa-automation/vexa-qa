"use client";
import { useEffect, useState } from "react";
import { Copy, RefreshCw, Users, X } from "lucide-react";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { OptionCombobox } from "@/components/forms/option-combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
  const [removing, setRemoving] = useState<Member | null>(null);
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

  const removeMember = (member: Member) =>
    run(async () => {
      const result = await supabase!
        .from("qa_workspace_members")
        .delete()
        .eq("workspace_owner", userId)
        .eq("member_id", member.member_id);
      if (result.error) throw new Error(result.error.message);
      setMembers((previous) => previous.filter((m) => m.member_id !== member.member_id));
      setMessage(
        "Member removed. Disable or replace the invite code to prevent them from rejoining.",
      );
    });

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
      <fieldset className="mt-4 flex min-w-0 flex-col gap-5 border-0 p-0" disabled={busy}>
        <OptionCombobox
          id="sharing-workspace"
          label="Current workspace"
          options={[
            { value: userId, label: "My workspace" },
            ...workspaces.map((w) => ({ value: w.owner, label: w.label })),
          ]}
          placeholder="Select a workspace"
          value={owner}
          onChange={(next) => {
            if (next !== owner) void run(() => onSwitch(next));
          }}
        />
        {own ? (
          <>
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-muted-foreground">
                Share an invite code with your team. Codes expire after 7 days. Creating a new code
                replaces the previous one; existing members keep access.
              </p>
              <Button
                type="button"
                variant="outline"
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
              </Button>
            </div>
            {invite && (
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-3">
                <Field>
                  <FieldLabel htmlFor="sharing-invite-code">Invite code</FieldLabel>
                  <Input
                    id="sharing-invite-code"
                    readOnly
                    className="font-mono"
                    value={invite.code}
                    onFocus={(e) => e.target.select()}
                  />
                  <FieldDescription>
                    Expires {new Date(invite.expires_at).toLocaleString()}
                  </FieldDescription>
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      void run(async () => {
                        await navigator.clipboard.writeText(invite.code);
                        setMessage("Invite code copied.");
                      })
                    }
                  >
                    <Copy aria-hidden="true" /> Copy code
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
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
                  </Button>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <strong className="text-sm font-medium">Workspace members</strong>
              <ul className="divide-y divide-border rounded-lg border border-border">
                <li className="px-3 py-2 text-sm text-muted-foreground">You (owner)</li>
                {members.map((member) => (
                  <li
                    key={member.member_id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">{member.member_email}</span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${member.member_email}`}
                      onClick={() => setRemoving(member)}
                    >
                      <X aria-hidden="true" /> Remove
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                className="self-start"
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
                <RefreshCw aria-hidden="true" />
                Refresh members
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            You have edit access to this team workspace. The owner manages invitations and members.
          </p>
        )}
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await onJoin(code);
              setCode("");
            });
          }}
        >
          <Field>
            <FieldLabel htmlFor="sharing-join-code">Join a team workspace</FieldLabel>
            <Input
              id="sharing-join-code"
              required
              className="font-mono"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Paste an invite code"
              pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
              title="Enter the full invite code supplied by the workspace owner."
            />
          </Field>
          <Button className="self-start" type="submit">
            Join workspace
          </Button>
        </form>
      </fieldset>
      <div aria-live="polite" className="mt-3 flex flex-col gap-2">
        {busy && <p className="text-sm text-muted-foreground">Updating team workspace…</p>}
        {message && <p className="text-sm">{message}</p>}
      </div>
      {problem && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{problem}</AlertDescription>
        </Alert>
      )}
      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remove ${removing?.member_email ?? "this member"}?`}
        description="They lose access to this workspace. Disable or replace the invite code to stop them from rejoining."
        confirmLabel="Remove member"
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          const member = removing;
          setRemoving(null);
          if (member) void removeMember(member);
        }}
      />
    </div>
  );
}
