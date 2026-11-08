# Adopting This Design System in an Existing App

Use this guide when an app is already built and you want to replace its current design system
with this starter kit. For a brand-new project, follow `README.md` instead.

Migrate in phases. Each phase leaves the app working, so you can stop, ship, and continue later.
Do not swap everything in one big commit.

## Before you start

Check the app against these requirements. Fix any mismatch first, because the rest of the guide
assumes them.

| Requirement | Starter kit | How to check your app |
| --- | --- | --- |
| Next.js | 16 (App Router) | `package.json` → `next` |
| React | 19 | `package.json` → `react` |
| Tailwind | v4 (`@import "tailwindcss"`, `@theme`, no `tailwind.config.js`) | Does a `tailwind.config.*` file exist? If yes, you're on v3: run `npx @tailwindcss/upgrade` first |
| Path alias | `@/*` → `./*` (project root) | `tsconfig.json` → `paths`. If yours is `@/*` → `./src/*`, see "Path alias" below |
| Component base | Base UI (`@base-ui/react`), shadcn style `base-nova` | `components.json` → `style`. Most older shadcn apps use Radix (`new-york` or `default`) |

Work on a branch, and take screenshots of the main screens so you can compare later.

## Phase 1: Install without changing anything visible

1. Install the dependencies:

   ```bash
   npm i @base-ui/react @hookform/resolvers @tanstack/react-table class-variance-authority cmdk cn \
     lucide-react next-themes react-hook-form recharts sonner zod shadcn tw-animate-css
   ```

2. Copy in the docs: `AGENTS.md`, `CLAUDE.md`, `DESIGN.md`, `FEATURE-GUIDE.md`. If the app
   already has an `AGENTS.md` or `CLAUDE.md`, merge them. Keep the app's own rules, add these, and
   resolve any conflicts on purpose.
3. Copy `lib/utils.ts`, `lib/dates.ts`, `lib/search-params.ts`, `lib/status-timeline.ts`, and
   `hooks/`. If files with these names already exist, compare them and keep both sets of exports.
4. Copy `src/features/design-system/` and `app/design-system/page.tsx`. **Don't copy
   `components/` yet** (see Phase 3).

Nothing in the app changes yet. The app should still build.

## Phase 2: Replace the tokens (`app/globals.css`)

This is the step that changes how the whole app looks.

1. List the tokens your app uses today: CSS variables, `tailwind.config` colors, and any
   hard-coded hex values (`grep -rnE "#[0-9a-fA-F]{3,6}|rgb\(" app components src`).
2. Replace your `globals.css` with the starter's. Keep any app-specific global rules from the old
   file and put them back at the bottom.
3. Map old token names to the starter's tokens. The standard shadcn names (`--background`,
   `--foreground`, `--primary`, `--muted`, `--border`, `--ring`, `--destructive`, `--sidebar-*`,
   `--chart-*`) carry over directly. The starter adds:
   - `--brand`, `--brand-strong`, `--brand-subtle`, `--brand-foreground`, `--brand-border`
   - `--status-{positive,attention,critical,info,neutral}` and `-subtle`, for statuses
   - `--event-*`, for calendar and category colors
   - `--chart-grid`, `--chart-track`, `--chart-age-1…5`
4. Change the colors in `:root` (light) and `.dark` to your brand. Keep the token names.
5. Replace hard-coded colors in components with token classes (`bg-background`,
   `text-muted-foreground`, `bg-status-positive-subtle`, and so on).
6. Delete the `driver.js` import (line 4) and the `.app-tour` block unless you use the product
   tour.
7. Set up fonts and theme in `app/layout.tsx`, as described in `README.md` step 4.

Open `/design-system` and your main screens in light and dark mode, and compare them with the
screenshots.

## Phase 3: Replace the components

### If your app uses Radix-based shadcn (the usual case)

The starter's components are built on Base UI. A few APIs differ, so you can't just overwrite the
files.

| Radix shadcn | This starter (Base UI) |
| --- | --- |
| `<DialogTrigger asChild><Button /></DialogTrigger>` | `<DialogTrigger render={<Button />}>Label</DialogTrigger>` |
| `asChild` on Button, Trigger, or Link wrappers | `render={<Link href="…" />}` |
| `<Select>` dropdowns | `Combobox` (see `AGENTS.md`, "Selection controls") |
| `@radix-ui/react-*` imports | `@base-ui/react/*` imports |

Work through it one component at a time:

1. Pick one primitive, for example `button`.
2. Copy the starter's `components/ui/button.tsx` over yours.
3. Search for usages: `grep -rn "from \"@/components/ui/button\"" app components src`.
4. Update each call site: replace `asChild` with `render`, and rename props or variants that
   changed.
5. Run `npx tsc --noEmit`, check the screens that use it, and commit.
6. Move to the next primitive.

A good order, from fewest dependencies to most: `button`, `badge`, `input`, `textarea`, `label`,
`separator`, `skeleton`, `spinner`, `card`, `alert`, `tooltip`, `popover`, `dialog`, `sheet`,
`alert-dialog`, `dropdown-menu`, `tabs`, `checkbox`, `switch`, `radio-group`, `field`,
`input-group`, `command`, `combobox`, `table`, `sidebar`.

When no Radix packages are imported anymore (`grep -rn "@radix-ui" app components src`),
uninstall them and set `"style": "base-nova"` in `components.json` (or copy the starter's).

### If your app already uses Base UI shadcn (`base-nova`)

Diff each file (`diff -u yours/components/ui/x.tsx starter/components/ui/x.tsx`), take the
starter's version, and reapply any local customizations you need to keep.

### Shared composites

When the primitives are done, copy `components/data-table/`, `components/charts/`,
`components/forms/`, `components/theme/`, and the `components/app-shell/` pieces. Replace your
equivalents and swap in your own `components/brand/logo.tsx`.

## Phase 4: Align screens with `DESIGN.md`

Go through the app one route family at a time and compare it with `DESIGN.md`: spacing, type
scale, radii, table toolbar layout, mobile list tiles, loading skeletons, empty and error states,
and Combobox instead of Select. Fix one route family per commit.

## Path alias

The starter imports with `@/components/...`, `@/lib/...`, and `@/src/features/...`, which assumes
`@/*` → `./*`. If your app maps `@/*` → `./src/*`, either:

- add a second alias and leave the files as they are, or
- find and replace `@/src/features/` with `@/features/` in the copied files, and put
  `components/`, `lib/`, and `hooks/` under `src/`.

## Done when

- `/design-system` renders correctly in light and dark mode.
- No `@radix-ui` imports or hard-coded colors are left in shared components.
- `npx tsc --noEmit`, lint, tests, and `npm run build` pass.
- Main screens match `DESIGN.md` at phone and desktop widths, and keyboard focus is visible.

## Doing it with Claude Code

Copy the starter folder next to the app, then give Claude Code this prompt, one phase at a time:

> Read `ADOPTING.md`, `DESIGN.md`, and `AGENTS.md` in `<path to design-system-starter>`. We're
> migrating this app to that design system. First audit the app: Next, React, and Tailwind
> versions, path alias, `components.json` style, Radix vs Base UI, and the current tokens and
> hard-coded colors. Report the gaps and a plan before editing. Then do Phase <N> only, verify
> with type-check and build, and stop for review.
