# Design System

This project has two surfaces with one shared token system:

- The **back office** is a quiet, dense tool. Staff look at it for hours, so it stays near-neutral and prioritizes legibility and scanning over personality.
- The **public site** is a marketing and listing surface. It carries the brand, leads with photography, and is judged in the first three seconds.

Both surfaces use the same tokens and the same primitives. Branding is introduced by changing
semantic tokens, never by replacing component markup or scattering color utilities across features.

The live reference is available at `/design-system`. Update that route whenever a shared token or
primitive changes so documentation and implementation remain aligned.

The route is organized into three levels:

- **Foundations** documents semantic color, type, radius, and elevation.
- **Components** exercises real buttons, badges, validated fields, Comboboxes, dialogs, sheets,
  confirmations, and notification behavior.
- **Patterns** demonstrates page hierarchy, application-shell anatomy, responsive resource lists,
  loading feedback, empty states, and recovery messages.

## Source of truth

- `app/globals.css` owns color, radius, and global typography tokens.
- `components/ui/` contains installed shadcn primitives.
- `components/data-table/` contains the shared shadcn and TanStack rendering shell.
- `components/theme/` contains the smallest client boundary for theme behavior.
- `components.json` records the shadcn style, aliases, and icon library.
- Feature components compose primitives and must not redefine the base visual system.

Use semantic utilities such as `bg-background`, `bg-card`, `text-foreground`,
`text-muted-foreground`, `border-border`, and `ring-ring`. Do not place raw hex, RGB, HSL, or OKLCH
values in feature components.

## Surfaces

The back office uses the default token values. The public site opts into a branded variant by
applying `surface-public` on the public route group's layout element:

```tsx
<div className="surface-public">{children}</div>
```

That class rebinds four tokens and nothing else:

| Token | Back office | Public site |
| --- | --- | --- |
| `--primary` | near-black | `--brand` |
| `--primary-foreground` | near-white | `--brand-foreground` |
| `--ring` | neutral | `--brand` |
| `--radius` | `0.4375rem` | `0.75rem` |

Because the token indirection lives in `@theme inline`, every installed shadcn primitive inside the
public tree picks up the brand and the softer radius automatically. No component is forked, no
variant is added, and the back office is unaffected.

The **tenant portal** (`/portal`) is customer-facing, so it uses `surface-public` too, but it is a
working tool rather than a marketing page: no photography, the back office's `PageHeader`,
`SectionCard`, and `StatusBadge`, and lists instead of tables because most tenants open it on a
phone. Its sections sit in one row of tabs under the header that scrolls sideways on narrow
screens.

Never hand-color a button to make it look branded. Put it inside the public surface, or use the
`brand` tokens deliberately.

## Color system

### Neutrals

Neutrals carry a small amount of warm chroma at hue 92. Pure `oklch(1 0 0)` white and pure gray read
as cold and generic; a warm paper base makes photography look better and makes the interface feel
considered rather than defaulted.

`--card` is pure white while `--background` is warm off-white. That difference is deliberate: cards
lift off the page without needing a border or a shadow, which is the mechanism the listing grid
relies on.

### Brand

The brand is a deep, low-chroma forest green at hue 156. Almost all proptech is blue; green reads as
land, value, and permanence, and it differentiates without being loud.

| Token | Use |
| --- | --- |
| `--brand` | Primary actions, active states, brand marks on public surfaces. |
| `--brand-foreground` | Content on a `--brand` fill. |
| `--brand-strong` | Brand-colored text below 16px, where `--brand` alone is too light. |
| `--brand-subtle` | Tinted section backgrounds and badge fills. |
| `--brand-border` | Borders and dividers on tinted brand surfaces. |

### Status

The product has many statuses and they must not each invent a color. Status tokens are named by
**tone**, not by domain meaning, and domain statuses map onto tones:

| Tone | Token pair |
| --- | --- |
| Positive | `--status-positive` / `--status-positive-subtle` |
| Attention | `--status-attention` / `--status-attention-subtle` |
| Critical | `--status-critical` / `--status-critical-subtle` |
| Info | `--status-info` / `--status-info-subtle` |
| Neutral | `--status-neutral` / `--status-neutral-subtle` |

The positive tone shares the brand hue on purpose. In this product green means available, paid, and
active, and nothing else competes for that meaning.

| Domain status | Tone |
| --- | --- |
| Unit available | Positive |
| Unit reserved | Attention |
| Unit occupied | Info |
| Unit maintenance | Attention |
| Unit unavailable | Neutral |
| Lease active | Positive |
| Lease ending soon | Attention |
| Lease draft, ended, cancelled | Neutral |
| Payment paid | Positive |
| Payment partially paid | Attention |
| Payment overdue | Critical |
| Payment unpaid, waived | Neutral |
| Priority urgent | Critical |
| Priority high | Attention |
| Priority normal | Info |
| Priority low | Neutral |
| Maintenance in progress | Info |
| Maintenance completed | Positive |
| Document expiring | Attention |
| Document expired | Critical |

The `-subtle` value is the fill and the base value is the text and icon on it. A status badge always
carries a shape and a word in addition to color: a filled dot plus the label. Color alone never
communicates status, and roughly one in twelve men cannot separate the positive and critical tones.

### Charts

Every chart colour does exactly one job, and the ramps were computed rather than chosen by eye.

**Categorical, for identity.** `--chart-1` through `--chart-5`, assigned in that fixed order and
never cycled. The order is the colourblind-safety mechanism, so it does not change: it was picked
by enumerating orderings of the five hue families and keeping the one with the widest worst
adjacent pair. Slot 1 holds the brand hue so a chart reads as part of the product.

| Slot | Hue | Used for |
| --- | --- | --- |
| `--chart-1` | Brand green, 156 | The first or only series. Income, rent collected. |
| `--chart-2` | Indigo, 268 | Second series. |
| `--chart-3` | Pink, 350 | Third series. |
| `--chart-4` | Amber, 62 | Fourth series. Operating cost, where it sits against income. |
| `--chart-5` | Cyan, 205 | Fifth series. |

Measured on the `--card` surface, both modes pass: lightness inside the mode's band, chroma above
the floor that stops a hue reading as grey, worst adjacent pair 10.9 ΔE under protanopia and
17.9 ΔE at normal vision in light mode (10.5 and 17.1 in dark), and every slot above 3:1 contrast.
Dark mode is stepped for the dark surface rather than flipped from the light values.

A sixth series is never a new hue. Fold the tail into a single "Other", split into small multiples,
or change the form.

**Ordinal, for a position in a sequence.** `--chart-age-1` through `--chart-age-5`: one hue, the
critical red at 27, stepping darker as a receivable ages. Reach for it whenever reordering the
categories would change their meaning, which is exactly when a categorical ramp would be wrong.
The ramp inverts on the dark surface, so older debt is brighter there.

**Status, for state.** Occupied, reserved, and available are states, not series, so occupancy
charts use the status tones from the table above rather than the categorical slots. A status colour
never stands in for "series 4".

**Chrome.** `--chart-grid` for gridlines and axes, `--chart-track` for the unfilled part of a
track or meter.

### Chart implementation

Plotted charts use the shadcn `chart` component over Recharts: `ChartContainer` supplies the
responsive box and binds a `ChartConfig` to the tokens above, and `ChartTooltip` supplies the
hover reading. Reach for it whenever the chart has axes, a baseline, or a tooltip worth having.

A figure that is not really a plot stays plain markup: proportion bars, meters, and the sparkline
beside a stat tile. A plotting library adds client JavaScript without adding meaning to a bar that
is one `width` away from being correct.

Recharts renders nothing on the server and costs around a hundred kilobytes compressed, so every
plot is loaded with `next/dynamic` and `ssr: false` behind a skeleton of its final height. Nothing
shifts when the chart arrives, and the plot stays out of the page's initial payload.

Either way the chart sits inside `ChartFrame`, which supplies the title, the legend, and the table
view. All three are server-rendered, so the figures and the identity of each series are readable
before the plot loads and remain readable if it never does.

### Chart rules

- Pick the form before the colour. A single figure is a stat tile, not a one-bar chart; a handful
  of headline numbers is a row of tiles, not a grouped bar chart.
- Never two y-scales on one plot. Two measures of different size become two charts, or one indexed
  to a common base. Bars and a line may share a plot when they share a unit and an axis, which is
  how an input pair and the result derived from them belong together.
- Bars cap at 24px, with a 4px rounded data end and a square baseline. Lines are 2px. Gridlines are
  solid hairlines one step off the surface, never dashed.
- Touching marks are separated by a 2px gap in the surface colour, never by a stroke.
- A legend is present whenever there are two or more series; one series needs none, because the
  title names it. Direct labels are selective: the current period or the extreme, never a number on
  every column.
- Text wears text tokens. A colour lives in the mark beside the label, never in the label.
- Every chart ships a table view of the same figures, so nothing is reachable only by colour or by
  hovering.
- Re-run the validation whenever a chart token changes. The palette is a computed artefact, not a
  preference.

### Calendar events

Calendar colours tell event kinds apart; they carry no status. Each kind takes one of thirteen
named swatches, `--event-<name>` (dot, swatch, and the chip's left edge) with
`--event-<name>-subtle` (the chip fill under foreground text), defined for both themes in
`app/globals.css`. The owner may reassign them for the whole team; every kind starts on its own
swatch, so the defaults never repeat.

- Pick only from the named swatches. A kind never gets a raw colour, and status tokens never mark a
  calendar kind.
- The legend sits above every calendar and doubles as its filter. It names each kind beside its
  swatch, and each chip names its kind to assistive technology, so colour is never the only cue.
- A finished entry is struck through as well as dimmed; a private entry carries a lock icon.

## Changing the theme

Change the values in the `:root` and `.dark` blocks in `app/globals.css`. Keep token names stable so
all installed primitives and product screens update together.

At minimum, review these token pairs in both themes:

| Purpose | Surface token | Content token |
| --- | --- | --- |
| Application | `background` | `foreground` |
| Raised surface | `card` | `card-foreground` |
| Glass chrome | `glass` | `card-foreground` |
| Glass overlay | `glass-strong` | `popover-foreground` |
| Overlay | `popover` | `popover-foreground` |
| Primary action | `primary` | `primary-foreground` |
| Quiet action | `secondary` | `secondary-foreground` |
| Supporting content | `muted` | `muted-foreground` |
| Hover or selected state | `accent` | `accent-foreground` |
| Brand action | `brand` | `brand-foreground` |
| Destructive action | `destructive` | context-dependent |

After a token change, check text contrast, focus rings, disabled states, destructive states, every
status tone, and the light and dark previews on `/design-system`.

## Typography

Geist and Geist Mono are loaded through `next/font` in `app/layout.tsx`. `--font-heading` currently
resolves to the sans family; it exists so a display face can be introduced in one place later
without touching components.

- Use the sans family for interface text and headings.
- Use the mono family only for code and identifiers.
- Prefer weight, spacing, and color for hierarchy before adding another font family.
- Keep body copy readable at 16px where space allows and avoid text below 12px.
- Public display headings use `tracking-tight` and a fluid size, `clamp(2.25rem, 5vw, 3.75rem)` for
  the page title. Back-office headings stay on the fixed Tailwind scale.
- Money and measurements use `tabular-nums` everywhere so columns and cards align.

## Shape, spacing, and elevation

- The back-office radius is intentionally tight. Controls stay at or below 8px and larger surfaces
  stay near 10px.
- The public radius is softer. Cards and media sit near 12px, and the hero search panel may go to
  16px. This comes from the surface token, not from per-component overrides.
- Use the Tailwind spacing scale. Start with `gap-2` inside controls, `gap-4` inside compact
  sections, and `gap-6` between related sections.
- Public sections use a larger rhythm: `py-16` at base and `py-24` from `md` up.
- Use borders and spacing before shadows. Elevation must communicate an actual layer change.
- Do not make every content group a card. A heading, whitespace, or separator may be enough.

### Glass surfaces

Raised chrome is a glass pane: a translucent fill over a blurred backdrop with a lit top edge.
Three classes in `src/styles/design-system.css` carry it. Elevation is not part of them — keep
using the `shadow-*` and `ring-*` utilities for that.

| Class | Use | Fill |
| --- | --- | --- |
| `glass` | Raised chrome — cards, panels, the sidebar, the top bar | `--glass` |
| `glass-strong` | Overlays over arbitrary content — dialogs, popovers, menus, sheets, the combobox popup | `--glass-strong` |
| `glass-inset` | A surface nested inside a pane — a table shell or chart frame in a `Panel`, a mobile list tile | `--glass`, no blur |

The supporting tokens are `--glass-border` (the hairline), `--glass-highlight` (the lit top edge),
`--glass-shadow`, `--glass-blur`, `--glass-blur-strong`, `--glass-saturate`, and `--ambient`.

Rules:

- `--ambient` is the wash painted on `body`. It is what the panes refract — a backdrop blur over a
  flat background is invisible, so do not remove it and expect glass to survive.
- The classes set `background-color` and `background-image` only, so they compose with `ring-*` and
  `shadow-*`. The lit edge is a `background-image` rather than an inset `box-shadow` for exactly
  that reason: `ring-*` and `shadow-*` both compile to `box-shadow` in the utilities layer, which
  sits above `components`, so a `box-shadow` in a glass class loses to any ring or shadow utility
  on the same element. A `bg-*` utility does still win and cancel the fill — `StatTile` relies on
  that deliberately to colour its divider grid.
- One blur per stack. A surface nested inside a pane uses `glass-inset`, which carries the same
  fill and edge with no `backdrop-filter`: a second filter blurs the pane above it rather than the
  page, which reads as muddy instead of layered. `DataTable`, `ChartFrame`, the mobile list tiles,
  and the sidebar's level card and profile row all work this way, as do the cells of a `StatTile`
  grid. Reach for `glass-inset` whenever the surface is not the outermost pane in its stack.
- Keep nested content opaque where it carries dense text. `Alert` and the list skeletons stay on
  `card` on purpose.
- Glass degrades by retargeting the tokens to `card`/`popover`, so every surface follows at once.
  That happens under `@supports not (backdrop-filter: …)`, for browsers that cannot blur at all.
  That block is deliberately unlayered: the `:root` token blocks are unlayered too, and an
  unlayered declaration beats any layered one whatever the source order.
- **There is no `prefers-reduced-transparency` fallback, by decision.** Glass is the product's
  identity and renders for everyone. Windows maps Settings → Personalization → Colors →
  "Transparency effects" onto that query and macOS maps Accessibility → Display → "Reduce
  transparency"; both are off on a fair number of machines, so honouring it would switch the design
  off for a sizeable share of users. The tradeoff is accepted knowingly: contrast is what protects
  readers who set it, which is why the fills are measured rather than chosen by eye. Do not thin
  them without re-measuring, and do not reintroduce the branch without raising it.
- `--ambient` is an opaque gradient on the page, not a translucent layer, so it survives the
  `@supports` fallback and keeps the product recognisable when the panes go solid.
- The fills are set by contrast, not by taste. Measured on the worst-case stack (the strongest
  `--ambient` tint directly under the pane): body text `--foreground` is 16.97:1 light and
  14.39:1 dark, and supporting text `--muted-foreground` is 4.63:1 light and 6.26:1 dark. Light
  muted text is the binding constraint — it is only 4.83:1 on solid white to begin with — so
  thinning the light fill below 82% drops it under AA.
- The workspace shell is still legacy CSS, so its chrome takes the same tokens by hand in
  `src/app/(workspace)/theme.css` rather than the classes. New markup uses the classes.

## Public site

The public site sells a finite portfolio. Under about thirty units, the grid *is* the search: a
visitor can see everything available without a map or a heavy filter rail. Design for browsing,
and let filters narrow rather than gate.

The reference points are deliberate. Layout and restraint follow Airbnb, where the listing is the
product and photography does the selling. Card density follows Zillow, because a visitor comparing
three units in one building needs price, beds, baths, area, and availability without clicking. Take
both; do not take Zillow's map-first chrome, which exists for inventory no human can browse.

### Landing page anatomy

1. **Header.** 64px tall. Transparent over the hero with light content, switching to
   `bg-background/90`, a backdrop blur, and a bottom border once the page scrolls past 80px. Logo
   left, a short link set, and one brand call to action. Below `md` the links collapse into a Sheet.
2. **Hero.** Between 560px and 72vh. A full-bleed priority `next/image` with a scrim gradient from
   the foreground color to transparent so text stays legible over any photograph. One headline of at
   most two lines, one supporting sentence, and an inline filter panel on a `bg-card` surface
   holding area, price, and bedroom Comboboxes plus a brand search button. The panel stacks to full
   width below `md`. Directly beneath it, a live availability line: "12 units available now · 3
   opening next month", read from real data, never hardcoded.
3. **Featured units.** A section heading on the left and a "View all units" link on the right. A
   one, two, then three column grid with `gap-6 md:gap-8`, showing six units.
4. **Browse by property.** Two large tiles per row at 3:2, image with a bottom scrim, the property
   name and a line such as "8 units · Lahug, Cebu City" overlaid. With a small portfolio, property
   is the second most useful axis after availability.
5. **Why rent with us.** Three or four columns, each an icon in a `bg-brand-subtle` circle, a short
   heading, and one sentence. This section is where the product's real differentiators go: verified
   photographs and real availability, tracked maintenance, itemized monthly statements, and a team
   that actually manages the building. It is the answer to "why not just rent from a Facebook
   listing".
6. **How it works.** Four numbered steps in a row on desktop and a vertical sequence on mobile:
   browse, schedule a viewing, apply, move in. This reduces the anxiety that stops an inquiry.
7. **Closing call to action.** A `bg-brand-subtle` band with one heading, one sentence, and a single
   button into the inquiry form, for visitors who found nothing that fit.
8. **Footer.** Contact details, property links, legal, and social.

Sections five through seven are static content and should be cheap. The first four read live data
and must have skeletons that match their final dimensions.

### Unit card

This is the most repeated component on the site. Specify it once and reuse it everywhere, including
the browse page and the property detail page.

- The root is a `Link` wrapping the whole card. No border. `bg-card`, `rounded-xl`, clipped content.
- A 4:3 `next/image` with correct `sizes`, scaling to 1.03 on group hover over 400ms.
- A status pill absolutely positioned at the top left of the image with a backdrop blur, showing a
  dot and a label: "Available now" or "Available Oct 1".
- Below the image, in order: monthly price as the largest element with the period in muted text
  beside it, the unit name, a metadata line reading `2 bd · 1 ba · 45 sqm`, and the location in
  muted text.
- Price and metadata use `tabular-nums`. Amounts are formatted from integer minor units and show no
  decimals when the value is whole.
- Hover raises a shadow. `focus-visible` puts a visible ring on the whole card, not on the image.
- The skeleton reproduces the image aspect ratio and all four text lines at their real heights so
  the grid does not shift when data arrives.

### Photography

Photography carries this site, so it gets rules rather than hopes.

- Cards crop to 4:3 and heroes to 16:9. Source images are at least 1600px on the long edge.
- A unit cannot be published without a cover photo. This is a validation rule, not a guideline.
- Keep lighting consistent across a property: daylight, no flash, doors open, no people, no
  watermarks, no text burned into the image.
- Alternative text describes the space, following the pattern "Living area of Unit 3B at Maple
  Residences". Decorative section images take empty alternative text.
- Every content image uses `next/image` with intrinsic dimensions or a fixed aspect ratio and a
  correct `sizes` value. Only the hero image is eager; everything else is lazy.

### Public page rules

- Every public route has a meaningful title, description, canonical URL, and Open Graph image.
- Listing and detail pages revalidate when a unit is published, unpublished, repriced, or changes
  availability. A stale vacancy is a lost inquiry.
- Filters live in URL search parameters so a filtered view can be shared and linked.
- The inquiry and viewing forms follow the same validation, error, and pending rules as back-office
  forms. A public form is not an excuse for a weaker pattern.
- Prices always show the currency and the period. Never render a bare number.
- The public site respects the theme toggle, so every public section is verified in both themes.

## Components

Search existing project components first. Search the shadcn registry before creating a primitive.
Install and compose the registry component when it meets the requirement.

- Buttons communicate actions. Links navigate, even when styled with `buttonVariants`.
- Every form control has a persistent label and associated help or error text where needed.
- Use a Combobox for hidden selection. Use visible Checkbox, RadioGroup, or Switch controls when the
  options should remain visible.
- A single-select Combobox uses the popover pattern: `ComboboxSelectTrigger` as the field, with
  `ComboboxSearch` and `ComboboxEmpty` at the top of `ComboboxContent`. Give the trigger an `id`
  for its label, or an `aria-label` when it has no visible label. Keep `ComboboxInput` for
  typed-in search boxes and `ComboboxChips` for multi-select.
- For a labelled form field that picks one id from `{ value, label }` options, use
  `OptionCombobox` (`components/forms/option-combobox.tsx`); it wires the pattern above with the
  field label, description, and error. An option's optional `hint` is a muted second line. Leave
  it off where tours or tests pick options by their exact label.
- Use Alert for persistent information that still requires attention. Use Sonner only after it is
  installed and only for completed background actions.
- Consequential actions require an AlertDialog confirmation immediately before execution.
- A status badge is one shared component driven by the tone mapping above. Features do not build
  their own.

## Responsive behavior

Design mobile behavior deliberately. Multi-column layouts collapse below `md`, touch targets remain
comfortable, and primary actions stay reachable. Data tables become focused mobile list tiles rather
than horizontally scrolling tables.

On the public site, assume mobile first and in the majority. The hero must stay legible and the
filter panel usable at 360px, the unit grid drops to one column, and the header action remains
reachable with a thumb.

## Application patterns

- Page headers contain one title, concise context, and one visually dominant page action.
- Resource toolbars place search and frequent filters on the left and page actions on the right.
- Production resource state lives in URL search parameters. The design-system example uses local
  state only because it is an isolated component sandbox with no backing route query.
- Desktop resource views use the shared TanStack table shell with server-owned search, filtering,
  sorting, and pagination. Mobile uses tiles from the same ordered result set.
- Row menus use one accessible ellipsis trigger. Destructive actions appear last and open a
  confirmation before execution.
- Skeletons match final dimensions. List refinement preserves existing rows and uses the reserved
  linear progress slot.

## Accessibility and motion

- Use semantic HTML before ARIA and preserve the behavior supplied by shadcn primitives.
- Every interactive element needs an accessible name, visible focus, and keyboard operation.
- Never communicate status through color alone.
- Text over photography always sits on a scrim sufficient for its contrast ratio. Verify against the
  lightest region of the actual image, not a representative one.
- Motion must explain hierarchy, feedback, or state change. Respect `prefers-reduced-motion` and
  animate only transform and opacity when possible.
- Verify the primary keyboard path and both themes after meaningful UI changes.

## Design review checklist

- Semantic tokens only in feature code.
- Public surfaces get their brand from `surface-public`, not from hand-applied color.
- Status colors come from the tone mapping and are paired with a shape and a label.
- Light and dark contrast remain clear.
- Loading, empty, error, disabled, success, and partial states are represented where relevant.
- Narrow and wide layouts are intentional.
- Labels, focus order, keyboard behavior, and touch targets work.
- `/design-system` reflects shared token and primitive changes.
