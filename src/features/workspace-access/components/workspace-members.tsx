"use client";

import { useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { OptionCombobox } from "@/components/forms/option-combobox";
import { Button } from "@/components/ui/button";
import { memberRoleOptions, memberRoleSchema, type MemberRole } from "../lib/workspace-access";

export type WorkspaceMember = { member_id: string; member_email: string; role: MemberRole };

export function WorkspaceMembers({ members, onRemove, onRefresh, onRoleChange }: {
  members: WorkspaceMember[];
  onRemove: (member: WorkspaceMember) => void;
  onRefresh: () => void;
  onRoleChange: (member: WorkspaceMember, role: MemberRole) => void;
}) {
  const [change, setChange] = useState<{ member: WorkspaceMember; role: MemberRole } | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <strong className="text-sm font-medium">Workspace members</strong>
      <ul className="divide-y divide-border rounded-lg border border-border">
        <li className="px-3 py-2 text-sm text-muted-foreground">You (owner)</li>
        {members.map((member) => (
          <li key={member.member_id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{member.member_email}</span>
            <OptionCombobox
              id={`member-role-${member.member_id}`}
              label={`Access for ${member.member_email}`}
              placeholder="Select member access"
              options={memberRoleOptions}
              value={member.role}
              onChange={(value) => {
                const role = memberRoleSchema.parse(value);
                if (role !== member.role) setChange({ member, role });
              }}
            />
            <Button type="button" size="sm" variant="ghost" aria-label={`Remove ${member.member_email}`} onClick={() => onRemove(member)}>
              <X aria-hidden="true" /> Remove
            </Button>
          </li>
        ))}
      </ul>
      <Button type="button" variant="outline" className="self-start" onClick={onRefresh}>
        <RefreshCw aria-hidden="true" /> Refresh members
      </Button>
      <ConfirmDialog
        open={!!change}
        title={`Change access for ${change?.member.member_email ?? "this member"}?`}
        description={change?.role === "developer" ? "Developer access allows viewing modifications and editing only Developer remarks in Test Lab." : "Editor access allows creating, changing, and deleting all QA records."}
        confirmLabel="Change access"
        onCancel={() => setChange(null)}
        onConfirm={() => {
          if (change) onRoleChange(change.member, change.role);
          setChange(null);
        }}
      />
    </div>
  );
}
