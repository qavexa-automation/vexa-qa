<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# VEXA project rules

These rules are specific to this repository and override the general preferences below.

- The path alias is `@/*` → `./src/*`. Everything the general structure below places at the
  project root (`components/`, `hooks/`, `lib/`) lives under `src/` here, and features import as
  `@/features/<name>`, not `@/src/features/<name>`.
- Tailwind v4 and the design tokens live in `src/styles/design-system.css`. `src/app/` has two
  root layouts: `(design-system)/` (the `/design-system` reference) loads only that file, and
  `(workspace)/` (the product) loads it through `workspace.css`, which puts the legacy
  stylesheets `globals.css`, `auth.css`, and `theme.css` in a `legacy` cascade layer between
  Tailwind's reset and its utilities. Add new workspace styling as Tailwind classes, not legacy
  CSS, and delete legacy rules once the markup that used them is gone.
- The legacy stylesheets name their own text and brand colors `--text-muted` and
  `--accent-base`; `--muted` and `--accent` are the design-system tokens.
- Tables use `DataTable` (TanStack Table v9) through `useClientTable` for in-memory workspace
  lists. Workspace tables live in `src/components/workspace-tables/`; status colors come from
  `src/lib/status-tones.ts`. Give every data column a header filter: set `filterFn` and
  `meta.filter` from `column-filter-fns.ts` (text, options, or date range); option and date
  columns expose their label or `YYYY-MM-DD` value and sort with `sortByRank` or `"text"`.
- Forms use `Field`, `Input`, `Textarea`, and `OptionCombobox` (selects) from the design system.
  List filters use `FilterCombobox`, whose "All …" option is the empty string; project pickers
  build their options with `projectOptions`. Deletes and permission changes confirm through
  `ConfirmDialog`. Priority and status in tables and tiles edit in place with
  `InlineStatusSelect`. All of these live in `src/components/forms/`. Dialogs use the Base UI
  `Dialog`, never a native `<dialog>`: its top layer hides portaled Combobox and menu popups.
- Row actions (Edit, Delete) and the Columns control are icon-only buttons with tooltips
  (`IconButton`, `RowActions`), overriding the general "one ellipsis menu" rule below. Table text
  is display-limited (`TextCell` one line, `LongTextCell` two lines, full text on hover); record
  inputs have no `maxLength`.
- Legacy element rules for `button`, `input`, `select`, and `textarea` skip anything with a
  `data-slot` attribute, so they never restyle design-system controls.
- New shared UI uses the design system in `src/components/ui/` (shadcn, Base UI, `base-nova`)
  and the tokens documented in [DESIGN.md](DESIGN.md). [ADOPTING.md](ADOPTING.md) tracks the
  migration of the existing screens.
- The theme is VEXA's own: `src/lib/theme.ts` sets `data-theme="light" | "dark"` on `<html>` and
  `src/components/theme-provider.tsx` exposes `useTheme()`. Do not add `next-themes`.
- Product scope and setup live in [README.md](README.md). Run `npm run typecheck`, `npm test`, and
  `npm run build` before handing off; CI runs the same three.

# Reusable Next.js Coding Preferences

Use these instructions as the default working agreement for Next.js projects. Adapt them to the
repository in front of you; never assume that a package, integration, or command exists.

## Authoritative project guides

Read the guides that match the work before changing code:

1. `node_modules/next/dist/docs/` contains the documentation for the installed Next.js version.
   Read the relevant local guide before using or changing a framework API or convention.
2. [DESIGN.md](DESIGN.md) governs visual tokens, typography, spacing, radii, components, responsive
   behavior, interaction, and the `/design-system` reference route. Read it before UI work.
3. [FEATURE-GUIDE.md](FEATURE-GUIDE.md) defines the repeatable workflow and file boundaries for a
   new product feature. Read it before adding a feature or route family.
4. [README.md](README.md) describes the product scope, setup, and data model. Read it before
   implementing or changing product functionality.

Next.js documentation governs framework behavior. This file governs architecture and engineering
practice. `DESIGN.md` governs appearance and interaction. The user's current request has highest
precedence, and a more specific repository rule overrides a general one.

## Instruction precedence

1. Follow the user's current request.
2. Follow the closest repository-local `AGENTS.md` and its linked authoritative guides.
3. Follow established project conventions, tests, configuration, and package scripts.
4. Use this file for choices the project does not already settle.

When instructions conflict, obey the higher-precedence source and mention the conflict in the
handoff. Treat stale documentation as a problem to surface, not a rule to silently work around.

## Start with evidence

Before changing code:

1. Read the applicable instruction files completely.
2. Inspect the repository structure, package manifest, scripts, configuration, and target files.
3. Check the working tree and preserve all unrelated user changes.
4. Identify the smallest coherent change that satisfies the request.
5. For work spanning more than about three files, changing architecture, or adding a feature,
   state a short implementation plan before editing.

Use the versions installed in the repository as the source of truth. Read version-matched local
documentation before using a framework API whose behavior or convention is uncertain. Search the
codebase before introducing a new pattern, dependency, abstraction, or component.

## Implementation principles

- Prefer simple, explicit code over speculative abstraction.
- Make surgical changes. Keep unrelated formatting, refactors, and dependency upgrades out of
  the patch.
- Follow the repository's naming, file organization, import, error-handling, and testing patterns.
- Keep modules cohesive and give each layer one clear responsibility.
- Keep presentation thin: business rules, authorization, validation, calculations, and data access
  belong outside UI components.
- Keep server-only code and secrets out of client bundles. Put client boundaries on the smallest
  interactive leaf that needs them.
- Model domain rules explicitly. Use named states and transitions instead of scattered boolean
  checks when a workflow has meaningful status changes.
- Derive sensitive or authoritative values on the server. Treat client input as untrusted.
- Represent money, dates, time zones, identifiers, and permissions deliberately; do not rely on
  convenient implicit conversions.
- Write comments for intent, constraints, or surprising tradeoffs—not to narrate obvious code.
- Add a dependency only when the existing stack cannot solve the problem cleanly and the value
  outweighs its maintenance cost.
- Treat 250 lines as a review signal and 300 lines as a strong decomposition threshold for a
  component or module. Split by responsibility, state ownership, or reuse—not merely to satisfy a
  line count. Generated files, declarative data, and cohesive schemas may justify exceptions.

## Reuse before invention

Before building or installing a UI primitive:

1. Search the existing project components and utilities.
2. Search the shadcn MCP registry first.
3. If the MCP is unavailable, search with `npx shadcn@latest search @shadcn -q <term>`.
4. Compose or install the registry primitive when it meets the requirement.
5. Create a local primitive only after verifying that shadcn and the installed UI stack do not
   provide a suitable accessible option.

Installing a suitable shadcn registry component is pre-approved. Inspect the resulting diff and
report every file and dependency the command adds or modifies. Preserve the primitive's keyboard,
focus, and screen-reader behavior when styling or composing it.

## Canonical folder structure

Use a feature-first structure for new Next.js projects. Existing projects may keep an established
structure when migration is outside the task, but all newly created features should move toward
this shape.

```text
app/                              # App Router artifacts only
  layout.tsx                      # root shell, fonts, providers, html/body
  globals.css                     # global styles and design tokens
  (public)/                       # public route group when needed
  (auth)/                         # authentication route group when needed
  (protected)/                    # authenticated application routes when needed
  api/                            # Route Handlers for HTTP boundaries only
components/                       # shared UI used by multiple features
  ui/                             # design-system primitives, including shadcn/ui
  app-shell/                      # navigation and application shell composites
  brand/                          # shared brand components
  data-table/                     # shared shadcn/TanStack table primitives
hooks/                            # genuinely cross-feature client hooks
lib/                              # genuinely cross-feature non-UI code
  auth/                           # shared authentication and authorization helpers
  db/                             # database clients and shared persistence helpers
  env/                            # validated environment access
  utils.ts                        # small universal helpers such as cn()
public/                           # static assets
scripts/                          # maintenance and one-off scripts
src/
  features/
    <feature-name>/
      actions/                    # 'use server' mutation entry points
      components/                 # feature UI, including screen components
      hooks/                      # feature-scoped client hooks
      lib/                        # pure business rules and helpers
      schemas/                    # validation schemas and input contracts
      services/                   # server-only queries and external data access
      types/                      # plain serializable feature types
      index.ts                    # the feature's public API
```

Create only the directories a feature actually needs; never scaffold empty folders. Feature names
and source files use `kebab-case`; React components and exported types use `PascalCase`; functions
use `camelCase`. Colocate unit tests with pure logic as `*.test.ts` or follow the repository's
existing test convention.

### Folder responsibilities

- `app/` contains routes, layouts, metadata, loading/error boundaries, and thin composition. Keep
  domain logic, queries, and substantial screen markup out of routing files.
- `components/ui/` contains reusable design-system primitives. Shared composites belong in a named
  folder under `components/`; feature-specific UI belongs inside its feature.
- `services/` is the only feature folder that directly queries a database or external data source.
  Its modules are server-only, contain no JSX, and map provider-specific records into feature types.
- `actions/` contains Server Action mutation boundaries. Each action validates input, delegates
  policy and data work, and returns a serializable result. It does not contain business rules.
- `lib/` contains pure, framework-light business rules and helpers. Keep these functions easy to
  unit test.
- `schemas/` contains validation schemas shared by forms, actions, and service boundaries.
- `types/` contains plain serializable TypeScript types. Database row types and SDK response types
  do not escape the service boundary.
- `components/` contains the feature's screens and UI. Server components may orchestrate reads via
  services; client components call actions and never import server-only modules.
- `hooks/` contains hooks needed only by that feature. Promote a hook to root `hooks/` only when
  multiple unrelated features use it.
- `index.ts` defines the feature's public surface. Routes and other features import from the barrel,
  not from another feature's internal folders.

Reserve `src/features/shared/` for behavior that is truly shared across features. Prefer a clear
owner over a miscellaneous shared folder, and do not move code there based on anticipated reuse.

### App Router boundaries

- Keep `page.tsx` thin: read and await route inputs, then render a screen imported from a feature's
  public API. Aim for about 20 lines when practical.
- Keep `layout.tsx` focused on shells, providers, and shared route composition.
- Use route groups for organization and shared shells without changing URLs.
- Place `error.tsx` and `not-found.tsx` at the route-family level where their state is meaningful.
  Reuse shared state components instead of duplicating their markup.
- Load dynamic records from URL identifiers so refreshes and deep links work. Do not pass whole
  entities through navigation state.
- Use `Link` and `useRouter` for client navigation and `redirect` for server redirects.
- Treat `params`, `searchParams`, cookies, headers, caching, metadata, and request interception as
  version-sensitive APIs. Confirm their current behavior in the installed Next.js documentation.
- Put `'use client'` on the smallest interactive leaf. Pages, layouts, and feature screens remain
  server components unless their actual responsibility requires a client boundary.
- Enforce protected access twice: an early request-level check for navigation and an authoritative
  server/data-layer authorization check. The early check is never the security boundary.

### Loading, streaming, and navigation performance

Navigation must never appear frozen.

- Every dynamic or data-dependent route family has an appropriate `loading.tsx` boundary. A parent
  boundary may cover multiple routes only when its skeleton accurately represents all of them.
- The loading UI is a lightweight skeleton matching the destination's structure and dimensions;
  keep shared layouts visible and avoid blank pages, generic full-page spinners, and layout shift.
- Use a slim top navigation progress indicator when a transition does not resolve immediately. It
  supplements the route skeleton and never replaces `loading.tsx`.
- Use `<Link>` so Next.js can prefetch routes. Keep default prefetching unless measurement shows a
  destination is unusually expensive or unlikely to be visited.
- Wrap independently slow sections in meaningful `Suspense` boundaries so useful content streams
  before secondary sections finish. Avoid one oversized boundary around unrelated page data.
- Start independent server requests together and await them together. Sequential requests are
  allowed only when a later request genuinely depends on an earlier result.
- Fetch only the fields and records required for the current view. Paginate collections and defer
  secondary data until the section that consumes it renders.
- Lazy-load heavy client-only editors, charts, maps, modals, and below-the-fold features with the
  version-appropriate Next.js or React API. Keep the page's primary above-the-fold content eager.
- Prefer Server Components so the initial route ships minimal client JavaScript. A lazy boundary is
  not a reason to turn an otherwise server-rendered tree into a Client Component.
- Test navigation with a production build because route prefetching differs in development.

### Feature dependency rules

- Organize features by domain capability, not by technical layer across the whole application.
- Keep dependencies pointing inward: routes compose features; UI calls actions; actions and server
  components use services and pure rules; services adapt infrastructure.
- Validate every trust boundary and return predictable typed results.
- Pass only serializable values across server/client boundaries. Put behavior in pure functions,
  not methods on class instances sent to the client.
- Keep provider details behind services so domain rules stay independent and testable.
- Use direct imports and functions by default. Add dependency-injection machinery only when runtime
  substitution is a demonstrated requirement.

## State ownership

Put each state in the narrowest durable owner that matches its meaning:

1. URL search parameters own shareable navigation state such as search, filters, sorting, tabs,
   pagination, and deep-linkable overlays.
2. The server and data source own persisted application data.
3. Form state owns unsaved user input and validation feedback.
4. Local component state owns temporary, non-shareable interaction state.
5. Global client state is reserved for genuinely application-wide client concerns that do not fit
   the URL or server. Do not mirror server data into a global store.

## Server data and caching

- Server Components own initial reads. Use client fetching only for continued interaction that
  cannot be expressed through navigation, a Server Action, or streamed server rendering.
- Choose cache behavior deliberately for each read; do not rely on remembered framework defaults.
  Verify caching, tags, lifetimes, and invalidation APIs in the installed Next.js documentation.
- After a mutation, update or invalidate every affected view so the user sees authoritative data.
  Prefer precise invalidation over clearing unrelated caches.
- Deduplicate repeated reads during a render where the framework or data layer does not already do
  so. Keep independent reads parallel and eliminate avoidable waterfalls.
- Keep provider response shapes inside services and send only the fields the consumer needs across
  the server/client boundary.

## UI and interaction defaults

For user-interface work, read the project's design system before editing. Match the established
visual language instead of introducing a second one.

- Use semantic design tokens rather than raw color values.
- Build a clear hierarchy with restrained spacing, typography, radius, shadow, and motion.
- Design all relevant states: loading, empty, error, disabled, success, and partial data.
- Preserve keyboard access, visible focus, labels, contrast, and reduced-motion behavior.
- Give immediate feedback for user actions and use the feedback pattern appropriate to the wait.
- Require confirmation for consequential actions such as delete, archive, permission changes,
  destructive migrations, and sign out.
- Keep responsive behavior intentional; verify narrow and wide layouts when the interface changes.
- Prefer URL-backed state for shareable list controls such as search, filters, sorting, and paging.
- For large or remote datasets, prefer server-side filtering, sorting, and pagination.
- Auto-apply lightweight filters when that matches the product; avoid redundant submit controls.

If the project defines exact tokens, component inventories, radius limits, table behavior, or form
patterns, those rules override these defaults.

## Forms and validation

- Use the current shadcn form and field primitives rather than custom wrappers. Search the shadcn
  MCP for the version-current pattern before implementation.
- Define the input contract once with Zod and reuse it at client-friendly form boundaries and on the
  server. The Server Action always parses again; client validation is feedback, not trust.
- Keep business policy in the feature's pure `lib/` functions and persistence in `services/`.
  Forms collect input; actions orchestrate validation, authorization, policy, and mutation.
- Return a typed serializable result that distinguishes success, field errors, expected form-level
  errors, and unexpected failures. Preserve entered values after a rejected submission.
- Render field errors beside their controls and place a form-level summary where it helps users
  recover. Move focus to the first invalid field or summary after a failed submission.
- Disable duplicate submission while pending and show progress inside the submit control without
  changing its width. Keep the control enabled when correction is still possible.
- Require confirmation immediately before consequential submissions. Warn before dismissing a
  form with meaningful unsaved changes.
- Every control has a persistent accessible label, description when necessary, and a clear required
  or optional state. Placeholders never replace labels.

## Dialogs, sheets, and drawers

- Use shadcn `Dialog` for focused desktop tasks, `Sheet` for complementary side content, `Drawer`
  for touch-friendly mobile workflows, and `AlertDialog` for consequential confirmation.
- Adapt a workflow between Dialog and Drawer when the mobile interaction benefits from it; reuse one
  content implementation and preserve the same validation and action behavior.
- Give every overlay an accessible title and description. Trap focus while open, support Escape
  when safe, and restore focus to the invoking control on close.
- Put deep-linkable overlays in the URL and use App Router interception when the background page
  must remain visible. Temporary utility overlays may use local state.
- Keep primary actions easy to reach on small screens. A close gesture or outside click must not
  discard meaningful unsaved work without warning.

## Async feedback and notifications

- Match feedback to the operation: skeletons for initial content, local progress for a waiting
  section, button pending state for submissions, and a slim indicator for list refreshes.
- Use Sonner as the standard toast system. Toasts acknowledge completed background actions; they do
  not replace inline validation, loading UI, confirmation, or persistent actionable errors.
- Use a persistent Alert or banner when the user must make a decision or the problem remains true
  after the toast would disappear.
- Use optimistic updates only when success is likely, rollback is deterministic, and temporary
  state cannot mislead users about money, permissions, inventory, or other authoritative values.
- Prevent duplicate actions, keep messages specific, and avoid stacking multiple notifications for
  one operation.

## Accessibility acceptance criteria

- Use semantic HTML and correct landmarks before adding ARIA. Every interactive element works by
  keyboard and has an accessible name.
- Preserve visible focus, logical focus order, sufficient contrast, readable zoom behavior, and
  reduced-motion preferences. Never communicate meaning through color alone.
- Associate errors and help text with their controls. Announce asynchronous status changes through
  an appropriate live region without creating repeated chatter.
- Keep touch targets comfortable and avoid hover-only controls. Verify overlays, Comboboxes, menus,
  tables, and infinite lists with keyboard interaction.
- Run the repository's accessibility tooling for changed critical screens and manually verify the
  primary keyboard path. Automated checks supplement rather than replace interaction testing.

## Images, fonts, icons, and metadata

- Use `next/image` for content images when its optimization model applies. Provide intrinsic
  dimensions or a stable aspect ratio, meaningful alternative text, and responsive `sizes`.
- Decorative images use empty alternative text. Do not use important text baked into an image.
- Load application fonts with `next/font` when supported by the installed version and use the
  project's existing type scale. Avoid adding font families without a design-system decision.
- Use one established icon library plus project-owned brand marks. Icon-only controls require an
  accessible label; decorative icons remain hidden from assistive technology.
- Give every public route a meaningful title and description. Use the installed Next.js metadata
  APIs for canonical URLs, Open Graph data, and robots behavior when applicable.
- Add structured data only when it accurately represents visible page content. Validate public
  metadata and sharing images before release.

## Selection controls

Use a shadcn Combobox instead of `Select` whenever the interface needs a dropdown selection. This
is the default for forms, filters, relation pickers, status fields, and both short and long option
lists. Use `Select` only when the user or an authoritative project requirement explicitly demands
it.

- Build the Combobox from the current shadcn registry pattern, normally `Popover` plus `Command`;
  search the shadcn MCP before implementing or installing it.
- Show the selected option's human-readable label in the trigger. When empty, show a specific
  placeholder such as `Select customer`, not a generic `Select option`.
- Open with the search field focused. Filter options as the user types and show clear loading,
  no-results, and failure states when options are remote.
- Mark the selected option with a trailing check icon and close the popover after a single-select
  choice.
- Include a clear action for optional fields. Filters use an explicit `All {items}` option and
  apply immediately without an Apply button.
- Store and submit stable identifiers while displaying labels. Never use a display label as the
  persisted value when an identifier exists.
- For remote or large datasets, debounce search, fetch matching options from the server, cancel or
  ignore stale requests, and avoid downloading the entire dataset.
- For multi-select fields, keep the list open, show checkboxes, summarize the selection in the
  trigger, and provide an obvious way to clear all selections.
- Preserve full keyboard navigation, labels, focus behavior, and screen-reader announcements from
  the shadcn primitives.
- Use `RadioGroup`, segmented tabs, `Checkbox`, or `Switch` when choices should remain visible or
  represent binary state; the Combobox preference specifically replaces hidden dropdown selects.

## Data tables and responsive lists

Use the shadcn data-table pattern built from the shadcn `Table` primitives and TanStack React Table.
Search the shadcn MCP registry first, then use the shadcn CLI as a fallback. Keep the generic table
shell in `components/data-table/` and keep feature-specific columns, filters, queries, and row
mapping inside the owning feature.

### Desktop and tablet table

- Use the table at the project's desktop breakpoint and above. The table receives only the current
  server page, never the complete remote dataset.
- Put text search and the most frequently used column filters together on the top left. Apply them
  automatically; do not add an Apply or Search button.
- Put page-level action buttons on the top right. Keep the primary action visually strongest and
  move secondary or uncommon controls into an overflow menu when space is constrained.
- Show only filters users need frequently. Put less common filters behind a `More filters` popover
  or sheet so the toolbar remains easy to scan.
- Use the standard shadcn Combobox for every column filter, including small fixed option sets.
- Keep search, filters, sorting, page, and page size in URL search parameters. Changing search,
  filters, sorting, or page size resets the table to the first page.
- Use server-side filtering, sorting, and pagination for remote data. TanStack React Table manages
  rendering and interaction state; it must not filter only the currently loaded server page.
- Place pagination below the table. Show the current range or page, total when available, page-size
  control, and previous/next navigation with correct disabled states.
- Make sortable headers explicit and keep column visibility optional. Do not expose controls for
  columns that users have no reason to sort, filter, or hide.
- Link the primary identifying cell to the record detail view. Keep status, numeric alignment, and
  empty values visually consistent across features.

### Row actions

- Keep one narrow trailing actions column. When a row has multiple actions, render one icon-only
  shadcn `DropdownMenu` trigger using the horizontal-ellipsis icon instead of several action buttons.
- Give the trigger an accessible label that identifies the row. Keep the menu keyboard accessible
  and order actions by frequency, with destructive actions last and visually distinct.
- A consequential row action still requires confirmation. Opening the dropdown never executes an
  action.

### Mobile list tiles and infinite loading

- Below the table breakpoint, replace the table with a vertical list of touch-friendly tiles; do
  not compress the desktop columns or require horizontal scrolling.
- Each tile shows the record's primary identity, status, and only the metadata needed to choose the
  next action. Keep secondary details on the record page.
- Reuse the same search, filters, sorting, authorization, and server query contract as the desktop
  table so both views return the same ordered dataset.
- Use cursor-based server pagination when possible. Place an intersection sentinel near the bottom
  and request the next chunk before the user reaches the end. Do not render page numbers or a Next
  page button on mobile.
- Load only one chunk at a time, deduplicate records by stable identifier, ignore stale responses,
  and stop observing when no next cursor exists.
- Reset accumulated tiles and pagination state whenever search, filters, or sorting changes. Keep
  those controls in the URL; the continuation cursor may remain ephemeral.
- Show a skeleton for the initial load, compact skeleton tiles while loading more, an inline retry
  state after a failed chunk, a true empty state, and a clear end-of-list state.
- Preserve scroll position during successful appends, keep focus stable, and announce loading and
  completion through an accessible live region.
- Lazy-load optional heavy tile content, but keep the identity, status, and primary action eager so
  tiles remain useful immediately.

## Error handling and recovery

- Model expected failures explicitly. Server Actions and service boundaries return typed,
  serializable results instead of throwing for normal validation or business outcomes.
- Distinguish validation, unauthenticated, forbidden, not-found, conflict, rate-limit, dependency,
  and unexpected failures when the recovery path differs.
- Show users concise recovery-oriented messages and keep infrastructure details, stack traces,
  queries, and sensitive identifiers on the server.
- Provide `error.tsx` at the route-family boundary and an inline retry state for an independently
  failing section. A retry repeats only the failed work when practical.
- Use `notFound()` and redirects for their intended routing outcomes rather than rendering a
  successful page that visually imitates them.
- Log unexpected server failures with enough structured context to diagnose them, then return a
  stable public error code that support can correlate without exposing internals.

## Data, security, and reliability

- Enforce authorization at the server or data boundary, not only by hiding UI.
- Use least privilege and preserve existing row, tenant, or ownership boundaries.
- Never expose secrets, service credentials, private keys, or server-only environment variables to
  the browser, logs, fixtures, or committed files.
- Parameterize database queries and preserve transactional integrity for multi-step writes.
- Make destructive or externally visible operations explicit, confirmed, and recoverable where
  practical.
- Handle failures at the layer that has enough context to act; do not silently swallow them.
- Preserve history for records whose changes matter to users, finance, permissions, or audits.

## Logging and observability

- Use the project's structured logger on server paths. Include event name, operation, relevant
  non-sensitive identifiers, outcome, duration where useful, and a request or correlation ID when
  the platform provides one.
- Redact secrets, tokens, credentials, cookies, personal data, payment details, and raw request
  bodies. Treat logs as externally retained data.
- Send unexpected production failures to the configured monitoring service with source maps and
  release information when available. Do not introduce a second observability stack.
- Keep expected validation failures out of error monitoring unless their rate indicates abuse or a
  product defect. Record security-relevant and destructive actions in an audit trail when required.
- Remove ad-hoc `console.log` debugging from production paths. Keep intentional command-line or
  development diagnostics clearly scoped.

## Testing and verification

Verification is part of implementation, not an optional follow-up.

1. Add or update tests for changed behavior. Every bug fix receives a regression test that fails
   before the fix when the defect can be reproduced deterministically.
2. Unit-test pure domain rules and transformations. Integration-test services, authorization, and
   Server Actions at their real boundaries using the project's configured test stack.
3. Component-test complex keyboard, form, overlay, and responsive behavior. Use Playwright for
   critical end-to-end journeys such as authentication, core creation flows, and consequential
   mutations when the project has browser testing configured.
4. Test observable behavior and contracts rather than private implementation details. Mock only
   external or genuinely expensive boundaries; avoid tests that merely reproduce the source code.
5. Run the narrowest relevant tests during development.
6. Before completion, run the repository's documented aggregate check. If none exists, discover
   and run the relevant format, lint, type-check, test, and production-build commands.
7. Inspect the final diff for accidental changes, leaked secrets, boundary violations, and missing
   states.
8. Report only outcomes supported by commands you actually ran.

Never claim that a check passed if it was not run. If a check cannot run, give the exact command,
the observed failure, and what remains unverified. Do not weaken tests, lint rules, types, or
security controls merely to make validation green.

## Git and change safety

- Treat existing changes as the user's work. Preserve them and avoid overwriting overlapping edits.
- Use non-destructive commands by default. Never discard, reset, clean, or rewrite user work without
  explicit authorization.
- Do not create commits, push branches, open pull requests, deploy, or publish unless requested.
- Follow the project's versioning and changelog convention. Do not invent a version bump when the
  repository has no such rule.
- Keep generated files in sync only when the project's normal tooling produces them.

## Completion standard

A task is complete only when:

- the requested behavior is implemented at the correct layer;
- relevant edge cases, accessibility, authorization, and failure states are handled;
- tests and project checks pass, or remaining failures are accurately reported;
- the final diff contains no unrelated changes; and
- the handoff concisely lists what changed, what was verified, and any genuine follow-up work.

Do not claim completion from inference, visual inspection alone, or the absence of obvious errors.
