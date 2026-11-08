# Feature Guide

Use this guide when adding a product capability. Create only the folders the feature needs.

## Recommended shape

```text
src/features/<feature-name>/
  actions/       # Server Action mutation boundaries
  components/    # Feature screens and UI
  hooks/         # Feature-only client hooks
  lib/           # Pure policy, calculations, and transformations
  schemas/       # Shared Zod input contracts
  services/      # Server-only database and external API access
  types/         # Serializable domain-facing types
  index.ts       # Public feature API
```

Routes remain in `app/` and import only from the feature's public `index.ts` when practical. Keep
route files focused on route inputs, metadata, authorization entry checks, and screen composition.

## Build sequence

1. Name the capability and its domain terms before naming files.
2. Define plain serializable types and the shared input schema.
3. Put business policy and calculations in pure `lib/` functions.
4. Put provider-specific reads and writes in server-only `services/` modules.
5. Add Server Actions that authorize, parse, delegate, and return typed outcomes.
6. Build the Server Component screen, then isolate interactive client leaves.
7. Add the thin route, metadata, loading boundary, and meaningful error boundary.
8. Add tests at the layer where the behavior lives.
9. Export the supported public surface from `index.ts`.

## Boundaries

- UI never imports database clients or server-only services into a Client Component.
- Services map provider records into feature types. Provider response types do not escape.
- Actions orchestrate validation and mutation. They do not contain business rules.
- Client components receive serializable props and call actions or navigate.
- Persisted state belongs to the server, shareable state belongs to the URL, unsaved values belong to
  the form, and temporary interaction belongs to the nearest component.
- Authorization is enforced at the server or data boundary even when the UI also hides an action.

## Route checklist

- `page.tsx` is thin and uses the installed Next.js route input types correctly.
- Dynamic or data-dependent routes include a structure-matching `loading.tsx`.
- Expected not-found and redirect outcomes use the framework APIs.
- Independently slow panels stream through separate Suspense boundaries.
- Independent reads start together and request only fields needed by the current view.
- Public routes include accurate metadata when applicable.

## Mutation checklist

- The server reparses input with the shared schema.
- Authorization and business policy run before persistence.
- The result distinguishes success, field errors, expected form errors, and unexpected failures.
- A successful mutation refreshes or invalidates every affected view precisely.
- Money, inventory, permissions, and other authoritative values are not optimistically misrepresented.
- Consequential actions ask for confirmation immediately before execution.

## Completion checklist

- Observable behavior has focused tests.
- `npm run check` passes.
- `npm run build` passes.
- Relevant keyboard and responsive paths were manually reviewed.
- The final diff contains no unrelated work or secrets.
