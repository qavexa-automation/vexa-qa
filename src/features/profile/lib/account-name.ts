type Account = { email?: string; user_metadata?: Record<string, unknown> };

/** The account's display name, or its email prefix until one is set. */
export function accountName(account: Account | null | undefined): string {
  const fullName = account?.user_metadata?.full_name;
  return (typeof fullName === "string" && fullName.trim()) || (account?.email?.split("@")[0] ?? "");
}

/** "QA-JESSICA" for Jessica Libre: the first word only; a name that already starts with QA- is not prefixed twice. */
export function workspaceLabel(ownerName: string): string {
  const name = ownerName.trim().replace(/^qa-\s*/i, "").split(/\s+/)[0];
  return name ? `QA-${name.toUpperCase()}` : "";
}

/** A person's own workspace carries their name. */
export function ownWorkspaceLabel(account: Account | null | undefined): string {
  return workspaceLabel(accountName(account)) || "My workspace";
}
