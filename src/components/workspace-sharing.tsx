"use client";
import { useEffect, useState } from "react";
import { Copy, Users } from "lucide-react";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { OptionCombobox } from "@/components/forms/option-combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import type { SharedWorkspace } from "@/lib/use-workspace";
import { memberRoleOptions, memberRoleSchema, WorkspaceMembers, type MemberRole, type WorkspaceMember, type WorkspaceRole } from "@/features/workspace-access";

type Invite = { code: string; expires_at: string; role: string };

export default function WorkspaceSharing({
  userId,
  owner,
  workspaces,
  onSwitch,
  onJoin,
  flush,
  role,
}: {
  userId: string;
  owner: string;
  workspaces: SharedWorkspace[];
  onSwitch: (owner: string) => Promise<void>;
  onJoin: (code: string) => Promise<void>;
  flush: () => Promise<void>;
  role: WorkspaceRole;
}) {
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState<Invite | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [removing, setRemoving] = useState<WorkspaceMember | null>(null);
  const [inviteRole, setInviteRole] = useState<MemberRole>("developer");
  const [confirmInvite, setConfirmInvite] = useState(false);
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
        .select("code, expires_at, role")
        .eq("workspace_owner", userId)
        .maybeSingle(),
      supabase
        .from("qa_workspace_members")
        .select("member_id, member_email, role")
        .eq("workspace_owner", userId),
    ]).then(([invitation, team]) => {
      if (!active) return;
      if (invitation.error || team.error)
        setProblem(
          invitation.error?.message ?? team.error?.message ?? "Unable to load team access.",
        );
      else {
        setInvite(invitation.data);
        setMembers((team.data ?? []).map((member) => ({ ...member, role: memberRoleSchema.parse(member.role) })));
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

  const removeMember = (member: WorkspaceMember) =>
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
        Editors manage QA records. Developers view modifications and edit only Developer remarks
        in Test Lab. Saved changes appear automatically for teammates.
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
              <OptionCombobox id="invite-role" label="Invite access" placeholder="Select invite access" options={memberRoleOptions} value={inviteRole} onChange={(value) => setInviteRole(memberRoleSchema.parse(value))} />
              <p className="text-sm text-muted-foreground">
                Share an invite code with your team. Codes expire after 7 days. Creating a new code
                replaces the previous one; existing members keep access.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmInvite(true)}
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
                    {invite.role === "developer" ? "Developer access" : "Editor access"} · Expires {new Date(invite.expires_at).toLocaleString()}
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
            <WorkspaceMembers
              members={members}
              onRemove={setRemoving}
              onRefresh={() => void run(async () => {
                const result = await supabase!.from("qa_workspace_members").select("member_id, member_email, role").eq("workspace_owner", userId);
                if (result.error) throw new Error(result.error.message);
                setMembers((result.data ?? []).map((member) => ({ ...member, role: memberRoleSchema.parse(member.role) })));
                setMessage("Member list refreshed.");
              })}
              onRoleChange={(member, nextRole) => void run(async () => {
                const result = await supabase!.rpc("set_qa_workspace_member_role", { member_id: member.member_id, member_role: nextRole });
                if (result.error) throw new Error(result.error.message);
                setMembers((previous) => previous.map((entry) => entry.member_id === member.member_id ? { ...entry, role: nextRole } : entry));
                setMessage(`Access updated for ${member.member_email}.`);
              })}
            />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {role === "developer" ? "You have Developer access: view modifications and edit only Developer remarks in Test Lab." : "You have Editor access to this team workspace."} The owner manages invitations and members.
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
        open={confirmInvite}
        title={`Create a code with ${inviteRole === "developer" ? "Developer" : "Editor"} access?`}
        description={inviteRole === "developer" ? "Anyone signed in with this code can view modifications and edit Developer remarks in Test Lab. Existing members keep their current access." : "Anyone signed in with this code can create, change, and delete all QA records. Existing members keep their current access."}
        confirmLabel="Create invite code"
        onCancel={() => setConfirmInvite(false)}
        onConfirm={() => {
          setConfirmInvite(false);
          void run(async () => {
            if (!supabase) return;
            await flush();
            const result = await supabase.rpc("create_qa_workspace_invite", { member_role: inviteRole });
            if (result.error) throw new Error(result.error.message);
            const saved = await supabase.from("qa_workspace_invites").select("code, expires_at, role").eq("workspace_owner", userId).single();
            if (saved.error) throw new Error(saved.error.message);
            setInvite(saved.data);
            setMessage(`Invite code ready with ${inviteRole === "developer" ? "Developer" : "Editor"} access.`);
          });
        }}
      />
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
