# VEXA QA

A game-inspired QA workspace built with **Next.js App Router, React, TypeScript, and Supabase**, prepared for **GitHub and Vercel**.

## Run locally

Use Node.js 22 or newer.

```powershell
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:3000**. On macOS/Linux, use `npm` instead of `npm.cmd`. On Windows, `npm.cmd` works when PowerShell blocks `npm.ps1`.

The app works without environment variables in **local mode**, using your browser's saved workspace. New workspaces start empty. On loading an older local workspace, untouched built-in sample quests and sample activity are removed, while edited quests, project-linked records, and personal data are preserved. The original local workspace is backed up first; use **Settings → Export pre-cleanup backup** to download it when available. Your existing storage key is retained, so previously saved projects, tests, modifications, and deployments remain accessible. Use **Settings → Export workspace** for a current JSON backup.

## Included workflows

- Overview calculates project totals, quests, open bugs, test status counts and pass rate, modifications, deployment statuses, and completed-quest XP from the saved workspace. It includes a project portfolio, work/delivery breakdown, critical-quest progress with actual XP values, and recorded quest/test activity. Developer contributions come from maintained project developers and saved quest/modification assignments, merged by name without case sensitivity. Quest Board filters do not limit dashboard totals or its active-quest list; dashboard search only filters that list.
- Kanban quest board with drag-and-drop, list view, search, type, priority, assignment, and project title filters. The Project Title dropdown sits beside All types and uses Project Maintenance names. It filters both board and list views; All project titles or Clear filters restores the full project selection. New quests prefill the selected project and its developer.
- Workspace → Modification Tracker appears directly below Quest board. Add, edit, delete, search, and filter project-linked modifications with Module, Modification Details, Priority, Status, Developer, and Notes. Project selection fills the developer from Project Maintenance; the value remains editable. Records start empty, save with the workspace, and require no database migration. Project renames update linked names while deleted projects retain their modification history.
- Create, edit, and delete quests; specify bug/task/story, status, assignee, labels, and XP.
- Quest Board's Project Title selects a Project Name from Project Maintenance and stores its project link. Assignee automatically fills from that project's Developer field. Updating a project's name or developer in Project Maintenance updates linked quests; removing the project preserves their saved titles and assignees. New quests require a project, with a shortcut to Project Maintenance when none exist.
- Create and edit manual test cases with steps, expected results, and recorded pass/fail outcomes.
- Test Lab displays Project Name, Module, Steps to Execute, Expected Result, and Status in a table. Change Status directly using each row's Passed / Failed / Not Applicable / Not Tested dropdown; updates save with the workspace and recalculate summary counts. New tests default to Not Tested. Not Applicable and Not Tested clear the last-run timestamp and are excluded from pass-rate calculations. Existing Not run records load as Not Tested. Click a project name to edit the full test case. Long steps and results wrap with their original line breaks; smaller screens can scroll the table horizontally.
- Test Lab's Test Title selects a Project Name from Project Maintenance. Add a project first when creating a test case. Linked titles follow project renames; existing test titles remain readable if a project is removed or the test predates this lookup.
- Test Lab's project dropdown beside New test case filters its library and summary counts by project. Combine it with status and text search; choose All projects to restore the full library, including personal tests without a current project. A new test case starts with the selected project prefilled.
- Reports with current status/priority distributions and a bounded activity log.
- Rankings use saved developers and assignments; achievement progress uses completed quests and recorded test results. There are no fixed squad names or seeded XP totals.
- Editable sprint name and goal, compact rows, JSON export, and a setup guide.
- Manage → Project Maintenance: add, edit, search, and delete project records with Project Name, Department/Section, and Developer fields. Department/Section is one field. Older separate values appear together without losing either value; matching values are shown once. Records use the existing workspace storage and need no database migration.
- Manage → Deployment Tracker: add, edit, delete, search, and filter deployment records. Select a project from Project Maintenance, an environment (Development / Staging / Production), a version, deployment date, and status (Planned / In progress / Deployed / Failed / Rolled back), with optional notes. Records use the existing workspace storage and require no database migration. Project renames update linked deployment names; removing a project preserves its deployment history. The tracker records deployment details manually; it does not trigger GitHub or Vercel deployments.
- Supabase email/password sign-up and sign-in, shared team workspaces, invite codes, and live updates across browsers. Owners manage membership in Settings → Team access.

XP is derived from quests currently marked Done. Reopening or deleting a completed quest removes its XP. It cannot be repeatedly farmed by toggling status. Pass rate counts only executed tests. Test outcomes are **manually entered**, not generated by an automated test runner. Release readiness is quest completion, not a guarantee of release quality.

## Set up Supabase

1. Create a project at [Supabase](https://supabase.com/dashboard).
2. On a fresh database, open **SQL Editor** and run [`supabase/migrations/20261031143252_relational_workspace.sql`](supabase/migrations/20261031143252_relational_workspace.sql), followed by [`20261031143409_harden_rls_auto_enable.sql`](supabase/migrations/20261031143409_harden_rls_auto_enable.sql), once each. The baseline creates ten relational tables, access policies, transactional save/read functions, team invitations, and the Realtime publication. The second migration restricts client access to Supabase's optional privileged RLS setup helper. The old JSON migrations have been removed. If you already applied them, this baseline will stop on existing tables; it does not erase or convert an existing database. See [the database guide](supabase/README.md) before changing an existing installation.
3. Under Authentication, enable the Email provider. Configure confirmation email delivery for production. Set the Site URL to your Vercel domain and allow your local URL for development. This app uses browser-side auth; there is no server-rendered protected content or server-side cookie session.
4. Copy `.env.example` to `.env.local`:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

5. Use your project URL and **publishable key** from the Supabase project settings. Never put a secret or service-role key in a `NEXT_PUBLIC_` variable.
6. Restart the dev server. Choose **Settings → Connect account**, create an account, and confirm your email if required. Return to the app and sign in.
7. A signed-in account starts with an **empty personal workspace**, separate from your local records. Create a project and quest, wait for Cloud synced, and refresh to verify the cloud save. Local records are not automatically uploaded.

### Share and update in real time

1. All team members must use the same deployed app and Supabase project. Each person signs in with their own account.
2. The owner opens **Settings → Team access → Create invite code**. Copy the code and send it to the intended teammates. Anyone signed in with the code can join with full view/edit access, so share it privately.
3. Teammates open **Settings → Team access**, paste the code under **Join a team workspace**, and select **Join workspace**. The app switches to that owner's shared records.
4. Create or change a project, quest, test result, modification, deployment, or sprint. After saving, the change appears in the other signed-in browsers automatically. The footer shows **Cloud synced · Live updates on** when the subscription is connected.
5. Use **Current workspace** to switch between your own workspace and teams you have joined. The selected workspace is remembered per account in this browser. Pending changes are saved before switching; a save conflict prevents switching until you export/reload.
6. Invite codes expire after seven days. Creating a new code replaces the previous one. **Disable code** prevents further joins, while existing members keep access. Owners can refresh the member list and remove members. Disable or rotate the code as well if a removed member must not rejoin.

The app subscribes to authorized workspace changes through [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes). It also checks every ten seconds and when the browser regains focus or connectivity, including after a realtime reconnection, to recover missed updates. Changes require a network connection; this is not an offline editing queue.

### Persistence and access model

Each account owns one workspace and can join other owners' workspaces. Projects, quests, labels, test cases, modifications, deployments, and activity are stored as typed rows in separate relational tables; there are no JSON/JSONB columns in the application schema. Foreign keys prevent links between different workspaces, and database constraints validate statuses, dates, XP, and test execution state. Workspaces remain private until their owner shares an invite code. Row-level security permits reading only owned or joined workspaces. All cloud content writes use a revision-checked transaction that checks membership and rolls back the entire save on failure. Members can edit all workspace records, but only the owner can manage invite codes and remove members. JSON is only the RPC request/response format and the downloadable backup format. See [the schema and access model](supabase/README.md).

Cloud saves compare revision numbers and retry competing saves after fetching the latest data. Independent changes, including different fields of the same record, merge automatically. Competing changes to the same field or deleting a record another user edited produce an explicit conflict. Unsaved data remains visible for JSON export; export it before reloading to review the saved version. Save failures also preserve the visible workspace. Data is debounced briefly before cloud saves; wait for **Cloud synced** before closing the tab. Local workspaces save in this browser on each edit. Local storage is specific to a browser profile and origin; another browser, hostname, or port has separate records.

Developers are **assignment labels** from your records, separate from invited accounts. The signed-in profile uses your Supabase account name or email; local mode does not assume a personal identity. Assigned to me is available when signed in and matches the account's name, email, or email prefix against saved assignee names. Members share full editing access; granular read-only/project roles, attachments, comments, Jira import, and two-way GitHub issue synchronization are not implemented. GitHub and Vercel cards provide account setup links; they do not imply an established connection. JSON backups are downloadable; there is no in-app backup import yet.

### Verify the database before launch

Using two distinct test accounts:

1. Sign in as account A, create a quest, wait for Cloud synced, and refresh. Verify it persists.
2. Sign out. Verify your separate local workspace reappears and does not contain A's cloud quest.
3. Sign in as account B. Verify the workspace is empty and A's data is not visible.
4. Account A creates an invite code. Account B joins with it. Verify A's existing records appear for B. Change a test result in B and a quest status in A; verify both update in the other browser without reloading.
5. Make independent changes before both browsers finish saving. Verify both survive. Change the same field to different values before saving; verify the losing save reports a conflict and retains its unsaved data for export.
6. Switch B back to My workspace and verify its separate data remains. Remove B from A's member list and disable A's invite code. B must lose read/write access; after the next refresh/check its shared workspace reports an access error. Previously displayed/exported data cannot be recalled.
7. Verify that unauthenticated requests cannot read/write any of the ten `qa_*` tables or call the read/sharing/save functions. An unrelated signed-in account must not read or save A's data, enumerate invite codes, or insert its own membership. Direct content-table writes must be denied, even for owners; saves must go through the RPC.
8. Disconnect and reconnect a browser's network. Reconnecting the live subscription must fetch changes made while it was disconnected. A failed save must retain the user's data and show an export/reload error.

These checks require your provisioned Supabase project. Local mode does not verify database policies or email delivery.

## Push to GitHub

Create an **empty** GitHub repository, then run from this directory:

```powershell
git init
git add .
git commit -m "Build VEXA QA command center"
git branch -M main
git remote add origin https://github.com/YOUR-ACCOUNT/vexa-qa.git
git push -u origin main
```

Replace `YOUR-ACCOUNT` with your username. `.gitignore` excludes secrets, dependency folders, build output, and local tooling caches. Review the staged files before your first commit. If already initialized or linked, reuse the existing Git repository and remote.

`.github/workflows/ci.yml` installs locked dependencies, checks TypeScript, runs the domain-rule tests, and builds on main pushes and pull requests. Give the repository the branch protection rules appropriate for your team.

## Deploy to Vercel

1. Open [New Project](https://vercel.com/new) and import the GitHub repository.
2. Keep the detected **Next.js** framework, root directory, and the included `vercel.json` build configuration.
3. Add both `NEXT_PUBLIC_SUPABASE_*` environment variables to the intended environments. Use a separate Supabase project for untrusted preview branches if needed.
4. Deploy. Public browser variables are embedded at build time, so redeploy after changing them.
5. Add the resulting production URL to Supabase Authentication settings, then verify sign-up, sign-in, saving, and sign-out.

Without Supabase variables, Vercel will deploy the functional local workspace. Hosting, domain setup, live repository creation, and database provisioning require your own accounts; no external project is provisioned by this source tree.

## Development checks

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
```

The tests cover XP accounting, test results, stored-data validation, three-way collaboration merges, concurrent save retries, in-flight edits, conflicts, stale-session cleanup, and access errors. Database tests execute the actual migration and queries in PGlite (embedded PostgreSQL), with mocked Supabase auth claims and real database roles/RLS. They verify relational round trips, foreign keys, constraints, rollback, revisions, invitations, and access revocation. The two-account checks above are still required against your provisioned Supabase project to verify real authentication, Data API exposure, email delivery, and websocket delivery.

## Project structure

```text
src/app/                   App Router entry, metadata, global responsive styles
src/components/            Command center and dialogs
src/lib/model.ts           QA data types, validation, metrics, state transitions
src/lib/seed.ts            Recognizes legacy samples for safe local cleanup
src/lib/dashboard.ts       Dashboard totals and saved developer contributions
src/lib/use-workspace.ts   Browser persistence, authentication, cloud saves
src/lib/cloud-workspace.ts Serialized cloud reads/writes and conflict retries
src/lib/relational-workspace.ts Relational RPC adapter and response validation
src/lib/workspace-merge.ts Three-way merge of concurrent changes
src/components/workspace-sharing.tsx Team invites, membership, workspace selection
src/lib/supabase.ts        Optional browser Supabase client
supabase/migrations/       Database, RLS, optimistic revision save function
.github/workflows/         CI checks
vercel.json                Next.js deployment configuration
```

## Official references

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Supabase JavaScript client](https://supabase.com/docs/reference/javascript/initializing)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)

The UI uses Google Fonts with local system fallbacks. Browser font loading requires access to Google's font CDN. No third-party image assets or proprietary Jira branding are included.
