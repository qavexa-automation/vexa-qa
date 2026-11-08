"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, NotebookPen, Plus, X } from "lucide-react";
import { PRIORITIES, STATUSES, type Modification, type Project } from "@/lib/model";
import { modificationDatesProblem, toModificationDate } from "@/lib/modifications";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { FilterCombobox, valueOptions } from "@/components/forms/filter-combobox";
import { OptionCombobox } from "@/components/forms/option-combobox";
import { projectOptions } from "@/components/forms/project-options";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Panel } from "@/components/app-shell/panel";
import { ModificationTable } from "@/components/workspace-tables/modification-table";
import { supabase } from "@/lib/supabase";
import {
  downloadAttachment,
  formatBytes,
  rejectAttachment,
  rejectionMessage,
  removeAttachments,
  uploadAttachment,
  type Attachment,
} from "@/features/attachments";

type Details = Omit<
  Modification,
  "id" | "projectName" | "developer" | "requestedAt" | "modifiedAt"
> & {
  requestedAt: string;
  modifiedAt: string;
};
const blankDetails = (): Details => ({
  projectId: "",
  module: "",
  description: "",
  priority: "Medium",
  status: "Backlog",
  notes: "",
  requestedAt: "",
  modifiedAt: "",
});

async function loadAttachment(attachment: Attachment): Promise<Blob> {
  if (!supabase) throw new Error("Sign in to preview attachments in your cloud workspace.");
  return downloadAttachment(supabase, attachment);
}

export default function ModificationTracker({
  projects,
  modifications,
  search,
  onChange,
  onNotice,
  onManageProjects,
  openId,
  onOpened,
  workspaceOwner,
}: {
  projects: Project[];
  modifications: Modification[];
  search: string;
  onChange: (modifications: Modification[]) => void;
  onNotice: (message: string) => void;
  onManageProjects: () => void;
  /** Opens this modification in the edit form, e.g. when chosen on the Quest Board. */
  openId?: string;
  onOpened?: () => void;
  /** The signed-in workspace owner. Without one there is no storage to hold attachments. */
  workspaceOwner?: string | null;
}) {
  const [details, setDetails] = useState<Details>(blankDetails);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const canAttach = !!supabase && !!workspaceOwner;
  // The form opens on demand: Add modification, or Edit from a row.
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const projectInput = useRef<HTMLButtonElement>(null);
  const newButton = useRef<HTMLButtonElement>(null);
  const editing = modifications.find((modification) => modification.id === editingId);
  const selectedProject = projects.find((project) => project.id === details.projectId);
  const projectName =
    selectedProject?.name ?? (editing?.projectId === details.projectId ? editing.projectName : "");
  const developer =
    selectedProject?.developer ??
    (editing?.projectId === details.projectId ? editing.developer : "");

  // Move focus only when the form opens, closes, or switches record, not on page load.
  const lastEditorState = useRef(`${editorOpen}:${editingId}`);
  useEffect(() => {
    const state = `${editorOpen}:${editingId}`;
    if (state === lastEditorState.current) return;
    lastEditorState.current = state;
    if (editorOpen) projectInput.current?.focus();
    else newButton.current?.focus();
  }, [editorOpen, editingId]);
  const activeProjectFilter = projects.some((project) => project.id === projectFilter)
    ? projectFilter
    : "";
  const query = search.trim().toLowerCase();
  const filtered = modifications.filter(
    (modification) =>
      (!activeProjectFilter || modification.projectId === activeProjectFilter) &&
      (!statusFilter || modification.status === statusFilter) &&
      [
        modification.projectName,
        modification.module,
        modification.description,
        modification.priority,
        modification.status,
        modification.developer,
        modification.notes,
      ].some((value) => value.toLowerCase().includes(query)),
  );
  const deleting = modifications.find((modification) => modification.id === deletingId);

  function startEdit(modification: Modification) {
    setEditingId(modification.id);
    setEditorOpen(true);
    setDetails({
      projectId: modification.projectId,
      module: modification.module,
      description: modification.description,
      priority: modification.priority,
      status: modification.status,
      notes: modification.notes,
      requestedAt: toModificationDate(modification.requestedAt) ?? "",
      modifiedAt: toModificationDate(modification.modifiedAt) ?? "",
    });
    setDeletingId(null);
    setError("");
    projectInput.current?.focus();
  }
  // A modification opened from the Quest Board starts in edit mode, once.
  const openedRequest = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!openId || openedRequest.current === openId) return;
    openedRequest.current = openId;
    const requested = modifications.find((modification) => modification.id === openId);
    if (requested) startEdit(requested);
    onOpened?.();
    // startEdit only sets state; re-running for its identity would reopen the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, modifications, onOpened]);

  function reset() {
    setDetails(blankDetails());
    setEditingId(null);
    setError("");
  }
  function closeEditor() {
    reset();
    setEditorOpen(false);
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !details.projectId ||
      !projectName ||
      !details.module.trim() ||
      !details.description.trim()
    ) {
      setError("Select a project and enter the module and modification details.");
      return;
    }
    if (!developer.trim()) {
      setError("Add a developer to this project in Project Maintenance before saving.");
      return;
    }
    const datesProblem = modificationDatesProblem(details.requestedAt, details.modifiedAt);
    if (datesProblem) {
      setError(datesProblem);
      return;
    }
    const modification: Modification = {
      id: editingId ?? crypto.randomUUID(),
      projectId: details.projectId,
      projectName,
      module: details.module.trim(),
      description: details.description.trim(),
      priority: details.priority,
      status: details.status,
      developer: developer.trim(),
      notes: details.notes.trim(),
      requestedAt: details.requestedAt || null,
      modifiedAt: details.modifiedAt || null,
    };
    onChange(
      editingId
        ? modifications.map((entry) => (entry.id === editingId ? modification : entry))
        : [modification, ...modifications],
    );
    onNotice(editingId ? "Modification updated" : "Modification added");
    reset();
    projectInput.current?.focus();
  }

  /** Replaces one record's attachment list, reading from the latest props rather than a copy. */
  function saveAttachments(id: string, next: (current: Attachment[]) => Attachment[]) {
    onChange(
      modifications.map((entry) =>
        entry.id === id ? { ...entry, attachments: next(entry.attachments ?? []) } : entry,
      ),
    );
  }

  async function attachFiles(modification: Modification, files: File[]) {
    if (!supabase || !workspaceOwner || uploadingId) return;
    const existing = modification.attachments ?? [];
    const accepted: File[] = [];
    for (const file of files) {
      const reason = rejectAttachment(file, existing.length + accepted.length);
      if (reason) onNotice(rejectionMessage(reason, file.name));
      else accepted.push(file);
    }
    if (!accepted.length) return;
    setUploadingId(modification.id);
    const uploaded: Attachment[] = [];
    try {
      for (const file of accepted) {
        uploaded.push(await uploadAttachment(supabase, file, workspaceOwner, modification.id));
      }
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "The file could not be attached.");
    } finally {
      setUploadingId(null);
    }
    if (!uploaded.length) return;
    saveAttachments(modification.id, (current) => [...current, ...uploaded]);
    const saved = uploaded.reduce(
      (total, attachment) => total + (attachment.size - attachment.storedSize),
      0,
    );
    onNotice(
      `${uploaded.length === 1 ? uploaded[0].name : `${uploaded.length} files`} attached` +
        (saved > 0 ? ` · ${formatBytes(saved)} saved by compression` : ""),
    );
  }

  async function detachFile(modification: Modification, attachment: Attachment) {
    // The record is updated even when the object cannot be deleted, so a person is never stuck
    // with an attachment they cannot remove; the orphaned object is reported instead.
    saveAttachments(modification.id, (current) =>
      current.filter((entry) => entry.id !== attachment.id),
    );
    try {
      if (supabase) await removeAttachments(supabase, [attachment]);
      onNotice(`${attachment.name} removed`);
    } catch {
      onNotice(`${attachment.name} was removed from the record, but the stored file remains.`);
    }
  }

  return (
    <div className="modification-layout">
      {editorOpen && (
        <Panel
          titleId="modification-editor-heading"
          eyebrow="CHANGE CONTROL"
          title={<>{editingId ? "Edit modification" : "Add modification"}</>}
          action={
            <>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={
                  editingId ? "Close edit modification form" : "Close add modification form"
                }
                title="Close form"
                onClick={closeEditor}
              >
                <X aria-hidden="true" />
              </Button>
            </>
          }
        >
          <form className="flex flex-col gap-4" onSubmit={save}>
            <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <OptionCombobox
                id="modification-project"
                label="Project name"
                options={projectOptions(projects, editing)}
                placeholder="Select a project"
                triggerRef={projectInput}
                value={details.projectId}
                onChange={(value) => setDetails((current) => ({ ...current, projectId: value }))}
              />
              <Field>
                <FieldLabel htmlFor="modification-module">Module</FieldLabel>
                <Input
                  id="modification-module"
                  required
                  placeholder="Enter module"
                  value={details.module}
                  onChange={(event) =>
                    setDetails((value) => ({ ...value, module: event.target.value }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="modification-developer">Developer</FieldLabel>
                <Input
                  id="modification-developer"
                  readOnly
                  className="bg-muted text-muted-foreground"
                  aria-describedby="modification-developer-help"
                  placeholder="Select a project first"
                  value={developer}
                />
                <FieldDescription id="modification-developer-help">
                  {selectedProject
                    ? "Filled automatically from Project Maintenance."
                    : editing
                      ? "Saved developer for this archived project."
                      : "Filled automatically when you select a project."}
                </FieldDescription>
                {selectedProject && !developer.trim() && (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto justify-start p-0"
                    onClick={onManageProjects}
                  >
                    Set project developer <ArrowRight aria-hidden="true" />
                  </Button>
                )}
              </Field>
              <OptionCombobox
                id="modification-priority"
                label="Priority"
                options={valueOptions(PRIORITIES)}
                placeholder="Select a priority"
                value={details.priority}
                onChange={(value) =>
                  setDetails((current) => ({
                    ...current,
                    priority: value as Modification["priority"],
                  }))
                }
              />
              <OptionCombobox
                id="modification-status"
                label="Status"
                options={valueOptions(STATUSES)}
                placeholder="Select a status"
                value={details.status}
                onChange={(value) =>
                  setDetails((current) => ({ ...current, status: value as Modification["status"] }))
                }
              />
              <Field>
                <FieldLabel htmlFor="modification-requested">
                  Date requested{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </FieldLabel>
                <Input
                  id="modification-requested"
                  type="date"
                  min="2000-01-01"
                  max={details.modifiedAt || undefined}
                  value={details.requestedAt}
                  onChange={(event) =>
                    setDetails((value) => ({ ...value, requestedAt: event.target.value }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="modification-modified">
                  Date modified{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </FieldLabel>
                <Input
                  id="modification-modified"
                  type="date"
                  min={details.requestedAt || "2000-01-01"}
                  aria-describedby="modification-modified-help"
                  value={details.modifiedAt}
                  onChange={(event) =>
                    setDetails((value) => ({ ...value, modifiedAt: event.target.value }))
                  }
                />
                <FieldDescription id="modification-modified-help">
                  Cannot be before the date requested.
                </FieldDescription>
              </Field>
            </FieldGroup>
            <Field>
              <FieldLabel htmlFor="modification-details">Modification details</FieldLabel>
              <Textarea
                id="modification-details"
                required
                rows={3}
                placeholder="Describe the requested change"
                value={details.description}
                onChange={(event) =>
                  setDetails((value) => ({ ...value, description: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="modification-remarks">
                Remarks <span className="font-normal text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Textarea
                id="modification-remarks"
                rows={2}
                placeholder="Add supporting remarks or progress notes"
                value={details.notes}
                onChange={(event) =>
                  setDetails((value) => ({ ...value, notes: event.target.value }))
                }
              />
            </Field>
            {!projects.length && !editing && (
              <Alert>
                <AlertDescription className="flex flex-wrap items-center gap-2">
                  Add a project in Project Maintenance before recording a modification.
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0"
                    onClick={onManageProjects}
                  >
                    Add project <ArrowRight aria-hidden="true" />
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {error && <FieldError>{error}</FieldError>}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={!projects.length && !editing}>
                {editingId ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
                {editingId ? "Save modification" : "Add modification"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={closeEditor}>
                  <X aria-hidden="true" />
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Panel>
      )}
      <Panel
        title={
          <>
            Modification records{" "}
            <span className="font-normal text-muted-foreground">({filtered.length})</span>
          </>
        }
        action={
          <>
            {!editorOpen && (
              <Button
                ref={newButton}
                type="button"
                onClick={() => {
                  reset();
                  setEditorOpen(true);
                }}
              >
                <Plus aria-hidden="true" />
                Add modification
              </Button>
            )}
            <div className="flex flex-wrap gap-2">
              <FilterCombobox
                allLabel="All projects"
                label="Filter modifications by project"
                options={projectOptions(projects)}
                value={activeProjectFilter}
                onChange={setProjectFilter}
              />
              <FilterCombobox
                allLabel="All statuses"
                label="Filter modifications by status"
                options={valueOptions(STATUSES)}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </>
        }
      >
        <ConfirmDialog
          open={Boolean(deleting)}
          title="Delete this modification?"
          description={`This removes the ${deleting?.module ?? ""} modification for ${deleting?.projectName ?? "this project"}.`}
          confirmLabel="Delete modification"
          onCancel={() => setDeletingId(null)}
          onConfirm={() => {
            // The record's own attachments go with it, so their stored objects are released too.
            const removed = deleting?.attachments ?? [];
            onChange(modifications.filter((modification) => modification.id !== deletingId));
            if (editingId === deletingId) reset();
            setDeletingId(null);
            if (supabase && removed.length)
              void removeAttachments(supabase, removed).catch(() => {});
            onNotice("Modification deleted");
          }}
        />
        <ModificationTable
          canAttach={canAttach}
          uploadingId={uploadingId}
          onAttach={(modification, files) => void attachFiles(modification, files)}
          onDetach={(modification, attachment) => void detachFile(modification, attachment)}
          onLoadAttachment={loadAttachment}
          modifications={filtered}
          onEdit={startEdit}
          onDelete={(modification) => setDeletingId(modification.id)}
          onUpdate={(modification) => {
            const before = modifications.find((entry) => entry.id === modification.id);
            onChange(
              modifications.map((entry) => (entry.id === modification.id ? modification : entry)),
            );
            // Keep an open edit form in step, so saving it does not undo the inline change.
            if (editingId === modification.id)
              setDetails((value) => ({
                ...value,
                priority: modification.priority,
                status: modification.status,
              }));
            onNotice(
              before?.priority !== modification.priority
                ? `${modification.module}: priority set to ${modification.priority}`
                : `${modification.module}: moved to ${modification.status}`,
            );
          }}
        />
        {!filtered.length && (
          <EmptyState
            icon={NotebookPen}
            title={
              <>{modifications.length ? "No matching modifications" : "No modifications yet"}</>
            }
            description={
              <>
                {modifications.length
                  ? "Adjust your project, status, or search filters."
                  : editorOpen
                    ? "Record your first modification using the form above."
                    : "Choose Add modification to record your first change."}
              </>
            }
          />
        )}
      </Panel>
    </div>
  );
}
