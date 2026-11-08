# VEXA relational database

Apply [`migrations/20261031143252_relational_workspace.sql`](migrations/20261031143252_relational_workspace.sql) once in the SQL Editor of a fresh Supabase project. The script runs in a transaction. No application table has a `json` or `jsonb` column.

Then apply [`migrations/20261031143409_harden_rls_auto_enable.sql`](migrations/20261031143409_harden_rls_auto_enable.sql). It revokes client execution of Supabase's optional `public.rls_auto_enable()` event-trigger helper, while retaining automatic RLS setup. It safely skips projects without that helper. Both filenames match the migration versions applied to the VEXA project.

Next apply [`migrations/20261101045702_modification_listing_dates.sql`](migrations/20261101045702_modification_listing_dates.sql). It exposes `qa_modifications.created_at` as Date Requested (`requestedAt`) and `updated_at` as Date Modified (`modifiedAt`) in the read RPC. A private invoker trigger preserves the creation date and only advances the update timestamp for content changes, including remarks, status, and assignments. Updating display order alone does not change the date. No new table columns or backfill are needed, and existing timestamps remain intact. The UI label Remarks continues to use the `notes` column.

Then apply [`migrations/20261101063000_editable_modification_dates.sql`](migrations/20261101063000_editable_modification_dates.sql). It makes Date Requested and Date Modified optional, user-entered calendar dates stored in new nullable `requested_on` and `modified_on` `date` columns. Existing rows are backfilled from `created_at` and `updated_at` as Manila calendar days, so the dates already shown are kept. Either date may be empty; when both are set, a check constraint keeps `modified_on` on or after `requested_on`. The save and read RPCs use the new columns, and `created_at`/`updated_at` remain audit timestamps only.

Then apply [`migrations/20261101070000_rename_done_to_completed.sql`](migrations/20261101070000_rename_done_to_completed.sql). It renames the final quest and modification status from `Done` to `Completed`, updating existing rows and the status checks on `qa_issues` and `qa_modifications`. Deploy the app with it: older builds still send `Done`, which the new checks reject. The app also reads any locally stored `Done` as `Completed`.

Then apply [`migrations/20261107145451_activity_calendar.sql`](migrations/20261107145451_activity_calendar.sql). It adds the Activity Calendar entity as `qa_calendar_events` and extends the save and read RPCs with it. Calendar dates and wall-clock times are the Asia/Manila values a person typed, so they are stored as `date` and `time` columns rather than instants and are never converted on the way in or out. An all-day activity stores NULL times and reads back as empty time strings. Check constraints keep the end on or after the start, require both times on a timed activity, require neither on an all-day one, and reject a timed activity that does not end after it starts. A workspace saved before this migration carries no calendar array, which the save RPC treats as an empty calendar.

Then apply [`migrations/20261108090000_modification_attachments.sql`](migrations/20261108090000_modification_attachments.sql). It adds `qa_modification_attachments` and a private `modification-attachments` Storage bucket with a 10 MB object limit. File bytes live in the bucket; the table keeps only metadata, so the workspace save payload stays small no matter how large the files are. Objects are keyed `<workspace owner>/<modification id>/<attachment id>`, and the bucket policies match on that first path segment, so a caller can only reach workspaces they own or belong to. Deleting a modification cascades its attachment rows away; the client removes the matching objects. The bucket and its policies are wrapped in a guard that skips them when no `storage` schema exists, so the migration also runs against a plain PostgreSQL instance.

Attachments are compressed in the browser before upload: images re-encode to WebP capped at 2000px on the longest edge, everything else is gzipped, and whichever result is not meaningfully smaller than the original is stored unchanged (`encoding` `none`). WebP re-encoding is lossy, so a downloaded image is a `.webp` rather than the original file; gzipped files are expanded on download and come back byte-identical.

The dates are ordinary record content: they sync and merge like any other field, and two people changing the same date on the same record is a conflict. Older stored timestamps load as their Manila calendar day.

Project lifecycle statuses require [`migrations/20261108100247_project_status.sql`](migrations/20261108100247_project_status.sql), applied after the modification attachments migration. It adds a constrained `qa_projects.status` column, defaults existing projects to Not Started, and includes status in transactional saves and reads. An older client that omits status preserves the stored value. Workspace access policies and revision checks remain in force.

## Tables

| Table                         | Primary key                          | Stored data                                                                                                                                       |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `qa_workspaces`               | `user_id`                            | Owner, current sprint name/goal, revision, creation/update timestamps                                                                             |
| `qa_workspace_members`        | `(workspace_owner, member_id)`       | Invited auth account, email display snapshot, join timestamp                                                                                      |
| `qa_workspace_invites`        | `workspace_owner`                    | Unique invite code, creation time, expiry                                                                                                         |
| `qa_projects`                 | `(workspace_owner, id)`              | Project name, Department/Section, developer display name, lifecycle status                                                                        |
| `qa_issues`                   | `(workspace_owner, id)`              | Project FK, title, description, status, priority, type, assignee display name, integer XP, creation time                                          |
| `qa_issue_labels`             | `(workspace_owner, issue_id, label)` | Individual quest labels with an issue FK                                                                                                          |
| `qa_test_cases`               | `(workspace_owner, id)`              | Project FK, title, module, execution steps, expected result, status, last-run timestamp                                                           |
| `qa_modifications`            | `(workspace_owner, id)`              | Project FK, historical project name, module, details, priority, status, developer display name, notes                                             |
| `qa_deployments`              | `(workspace_owner, id)`              | Project FK, historical project name, environment, version, deployment date, status, notes                                                         |
| `qa_activity`                 | `(workspace_owner, id)`              | Activity description, occurrence timestamp, kind                                                                                                  |
| `qa_calendar_events`          | `(workspace_owner, id)`              | Project FK, title, activity kind, status, Manila start/end dates, all-day flag, start/end times, location, notes                                  |
| `qa_modification_attachments` | `(workspace_owner, id)`              | Modification FK, original and stored file name, media type, original and stored byte size, compression encoding, Storage object path, upload time |

Entity tables retain display order and creation/update timestamps. Labels retain their display order. Foreign keys, membership lookups, and the main status/date filters have indexes.

```mermaid
erDiagram
    AUTH_USERS ||--o| QA_WORKSPACES : owns
    AUTH_USERS ||--o{ QA_WORKSPACE_MEMBERS : joins
    QA_WORKSPACES ||--o{ QA_WORKSPACE_MEMBERS : grants_access
    QA_WORKSPACES ||--o| QA_WORKSPACE_INVITES : invites
    QA_WORKSPACES ||--o{ QA_PROJECTS : contains
    QA_WORKSPACES ||--o{ QA_ISSUES : contains
    QA_WORKSPACES ||--o{ QA_TEST_CASES : contains
    QA_WORKSPACES ||--o{ QA_MODIFICATIONS : contains
    QA_WORKSPACES ||--o{ QA_DEPLOYMENTS : contains
    QA_WORKSPACES ||--o{ QA_ACTIVITY : records
    QA_WORKSPACES ||--o{ QA_CALENDAR_EVENTS : schedules
    QA_MODIFICATIONS ||--o{ QA_MODIFICATION_ATTACHMENTS : attaches
    QA_PROJECTS o|--o{ QA_ISSUES : links
    QA_PROJECTS o|--o{ QA_TEST_CASES : links
    QA_PROJECTS o|--o{ QA_MODIFICATIONS : links
    QA_PROJECTS o|--o{ QA_DEPLOYMENTS : links
    QA_PROJECTS o|--o{ QA_CALENDAR_EVENTS : links
    QA_ISSUES ||--o{ QA_ISSUE_LABELS : labels
```

## Model decisions

- One account owns one workspace, matching the current product. `qa_workspaces.user_id` is both its primary key and a foreign key to `auth.users`.
- Every entity key is scoped to its workspace. Composite project and issue foreign keys reject references into another owner's workspace, even if the caller belongs to both teams.
- Record IDs remain text to preserve existing `VXA-...`, `TC-...`, and local UUID identifiers. Authentication identifiers remain UUIDs.
- Project deletion clears only `project_id`, preserving quests, tests, modifications, deployments, and calendar activities. Titles and explicitly named project snapshots keep the history readable after deletion. Deleting a workspace or its owner cascades through owned records, memberships, and invites.
- Developers and assignees are editable assignment names in this application. They are not auth accounts or authorization roles. Department/Section is a single free-text field. Creating artificial user or department records for these fields would change the product's meaning.
- Labels are rows, with uniqueness per issue. Repeated or blank labels from the UI are normalized before saving.
- Checks constrain quest types, priorities, statuses, environments, nonnegative integer XP, real deployment dates, and valid test-result/timestamp combinations. Passed/Failed tests require a last-run timestamp; Not Applicable/Not Tested require NULL.
- Calendar activities are scheduled in a person's own working day, not at a global instant, so their dates and times are stored as `date` and `time` in Asia/Manila and never as `timestamptz`. Storing them as instants would silently move an activity when a reader's time zone differs. An all-day activity has no times at all rather than midnight placeholders.
- Activity is the existing editable, bounded workspace feed, not an immutable security audit log. The client retains its latest 40 events.

## Reads, saves, and sharing

`read_qa_workspace(workspace_owner)` reads all relational tables in one SQL statement under the caller's RLS policies, so the result and revision come from one consistent database snapshot. It returns an HTTP response containing the client workspace shape. JSON is a transport format here; no document is stored in a table.

`save_qa_workspace(payload, expected_revision, workspace_owner)` validates the request, checks the caller, locks membership for a shared save, and locks the workspace revision. It upserts changed rows, removes deleted rows, saves sprint settings, and advances the revision in one transaction. An invalid row rolls back the entire operation. A stale revision raises SQLSTATE `40001`; the existing client fetches the latest version and performs its three-way merge before retrying. New workspace creation uses revision zero and is restricted to the owner.

Each entity is individually queryable through the Data API using authorized SELECT requests. The existing UI still saves a workspace transaction as a unit. It does not issue separate browser writes to each entity table, which would allow partial saves and bypass the concurrency check.

RLS is enabled on all twelve tables, and the attachments bucket has its own storage policies. Owners and members can read workspace content. Only owners can read/disable their invite codes and remove memberships. Content-table INSERT/UPDATE/DELETE privileges are revoked from client roles. Membership inserts and invite creation are also restricted to checked RPCs.

Public RPCs use `SECURITY INVOKER`. The privileged save/invitation implementations live in `vexa_private`, use an empty search path, check `auth.uid()` themselves, and have explicit execution grants. Keep `vexa_private` out of the Data API's exposed schemas. Authorization never uses editable user metadata or the member email display snapshot.

`create_qa_workspace_invite()` creates or rotates the owner's seven-day code. `join_qa_workspace(invite_code)` validates an unexpired code and adds the caller to that workspace. Disabling a code prevents new joins; removing a member revokes subsequent database access. Rotate or disable the code as well to prevent that person from rejoining.

Realtime publishes the workspace revision row. After a committed save, clients fetch the complete relational snapshot. Ten-second checks and focus/reconnect refreshes remain enabled.

## Existing installations

This is a replacement baseline for new installations. The former `001_workspace.sql` and `002_shared_realtime.sql` files were removed. Deleting migration files does not undo SQL already run on a remote project.

The baseline deliberately stops if VEXA tables already exist. It contains no DROP TABLE, no database reset, and no automatic deletion or conversion of existing cloud data. Do not run it over the previous JSON schema. Keep that installation and its backups intact; use a fresh Supabase project for this baseline, or prepare a separately reviewed data-conversion migration before upgrading an installation with records. Point the updated application at the relational project: the old schema does not provide `read_qa_workspace` and is no longer supported by the updated client.

## Verification

Run `npm.cmd run typecheck`, `npm.cmd test`, and `npm.cmd run build` (use `npm` outside Windows). `src/lib/relational-workspace.test.ts` executes this exact migration against embedded PostgreSQL with real roles and RLS, and mocked Supabase auth claims. It checks zero JSON columns, indexed foreign keys, private definer functions, record round trips, history retention, rollback, stale revisions, isolation, invites, and revocation.

The embedded tests do not run Supabase Auth, PostgREST, or the websocket service. After applying the baseline, run the two-account checks in the root README against the actual project. Confirm `public` is exposed through the Data API and `qa_workspaces` is in `supabase_realtime`. The migration grants client SELECT and RPC execution explicitly; it does not rely on automatic table exposure. Run Supabase's security/performance advisors against that project after deployment.

References: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions](https://supabase.com/docs/guides/database/functions), [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).
