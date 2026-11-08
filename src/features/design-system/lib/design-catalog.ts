export const colorGroups = [
  {
    title: "Surfaces",
    swatches: [
      ["Background", "bg-background", "Page ground"],
      ["Card", "bg-card", "Raised content"],
      ["Muted", "bg-muted", "Quiet fills"],
      ["Border", "bg-border", "Hairlines"],
    ],
  },
  {
    title: "Actions and meaning",
    swatches: [
      ["Primary", "bg-primary", "Primary action"],
      ["Secondary", "bg-secondary", "Secondary action"],
      ["Accent", "bg-accent", "Hover and selection"],
      ["Destructive", "bg-destructive", "Failure and removal"],
    ],
  },
] as const;

export const typeRows = [
  ["Page title", "text-3xl font-semibold tracking-tight", "Workspace records"],
  ["Section title", "text-base font-semibold", "Recent activity"],
  ["Body and cell", "text-sm", "A concise line of interface copy"],
  ["Secondary", "text-xs text-muted-foreground", "Updated 12 minutes ago"],
  ["Identifier", "font-mono text-sm tabular-nums", "REC-20841"],
] as const;

export const radiusRows = [
  ["rounded-sm", "Badges and compact affordances"],
  ["rounded-md", "Nested controls and skeletons"],
  ["rounded-lg", "Buttons and inputs"],
  ["rounded-xl", "Cards, popovers, and dialogs"],
] as const;
