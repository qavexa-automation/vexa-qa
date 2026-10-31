"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, NotebookPen, Pencil, Plus, Trash2, X } from "lucide-react";
import { PRIORITIES, STATUSES, type Modification, type Project } from "@/lib/model";

type Details = Omit<Modification, "id" | "projectName">;
const blankDetails = (): Details => ({
  projectId: "",
  module: "",
  description: "",
  priority: "Medium",
  status: "Backlog",
  developer: "",
  notes: "",
});

export default function ModificationTracker({
  projects,
  modifications,
  search,
  onChange,
  onNotice,
  onManageProjects,
}: {
  projects: Project[];
  modifications: Modification[];
  search: string;
  onChange: (modifications: Modification[]) => void;
  onNotice: (message: string) => void;
  onManageProjects: () => void;
}) {
  const [details, setDetails] = useState<Details>(blankDetails);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const projectInput = useRef<HTMLSelectElement>(null);
  const editing = modifications.find((modification) => modification.id === editingId);
  const selectedProject = projects.find((project) => project.id === details.projectId);
  const projectName =
    selectedProject?.name ?? (editing?.projectId === details.projectId ? editing.projectName : "");
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

  function reset() {
    setDetails(blankDetails());
    setEditingId(null);
    setError("");
  }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !details.projectId ||
      !projectName ||
      !details.module.trim() ||
      !details.description.trim() ||
      !details.developer.trim()
    ) {
      setError("Select a project and enter the module, modification details, and developer.");
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
      developer: details.developer.trim(),
      notes: details.notes.trim(),
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

  return (
    <div className="modification-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">CHANGE CONTROL</span>
            <h2>{editingId ? "Edit modification" : "Add modification"}</h2>
          </div>
          <NotebookPen size={19} className="muted" />
        </div>
        <form className="settings-form modification-form" onSubmit={save}>
          <div className="modification-fields">
            <label>
              Project Name
              <select
                ref={projectInput}
                required
                value={details.projectId}
                onChange={(event) => {
                  const project = projects.find((entry) => entry.id === event.target.value);
                  setDetails((value) => ({
                    ...value,
                    projectId: event.target.value,
                    developer: project?.developer ?? value.developer,
                  }));
                }}
              >
                <option value="" disabled>
                  Select a project
                </option>
                {editing && !projects.some((project) => project.id === editing.projectId) && (
                  <option value={editing.projectId} disabled>
                    {editing.projectName} (archived)
                  </option>
                )}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Module
              <input
                required
                maxLength={120}
                placeholder="Enter module"
                value={details.module}
                onChange={(event) =>
                  setDetails((value) => ({ ...value, module: event.target.value }))
                }
              />
            </label>
            <label>
              Developer
              <input
                required
                maxLength={120}
                placeholder="Enter developer name"
                value={details.developer}
                onChange={(event) =>
                  setDetails((value) => ({ ...value, developer: event.target.value }))
                }
              />
            </label>
            <label>
              Priority
              <select
                value={details.priority}
                onChange={(event) =>
                  setDetails((value) => ({
                    ...value,
                    priority: event.target.value as Modification["priority"],
                  }))
                }
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </label>
            <label>
              Status
              <select
                value={details.status}
                onChange={(event) =>
                  setDetails((value) => ({
                    ...value,
                    status: event.target.value as Modification["status"],
                  }))
                }
              >
                {STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Modification Details
            <textarea
              required
              rows={3}
              maxLength={5000}
              placeholder="Describe the requested change"
              value={details.description}
              onChange={(event) =>
                setDetails((value) => ({ ...value, description: event.target.value }))
              }
            />
          </label>
          <label>
            Notes <small>(optional)</small>
            <textarea
              rows={2}
              maxLength={3000}
              placeholder="Add supporting details or progress notes"
              value={details.notes}
              onChange={(event) => setDetails((value) => ({ ...value, notes: event.target.value }))}
            />
          </label>
          {!projects.length && !editing && (
            <div className="info-note">
              <span>Add a project in Project Maintenance before recording a modification.</span>
              <button type="button" className="text-button" onClick={onManageProjects}>
                Add project <ArrowRight size={13} />
              </button>
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="project-form-actions">
            <button
              type="submit"
              className="button primary"
              disabled={!projects.length && !editing}
            >
              {editingId ? <Check size={15} /> : <Plus size={15} />}
              {editingId ? "Save modification" : "Add modification"}
            </button>
            {editingId && (
              <button type="button" className="button secondary" onClick={reset}>
                <X size={15} />
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-heading modification-record-heading">
          <h2>
            Modification records <span className="subtle-label">({filtered.length})</span>
          </h2>
          <div className="modification-filters">
            <select
              aria-label="Filter modifications by project"
              value={activeProjectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter modifications by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              {STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
        {deleting && (
          <div className="project-delete-notice" role="alert">
            <p>
              Delete this modification for <strong>{deleting.projectName}</strong>, module{" "}
              <strong>{deleting.module}</strong>?
            </p>
            <div className="project-form-actions">
              <button
                type="button"
                className="button fail-button"
                onClick={() => {
                  onChange(modifications.filter((modification) => modification.id !== deletingId));
                  if (editingId === deletingId) reset();
                  setDeletingId(null);
                  onNotice("Modification deleted");
                }}
              >
                Confirm delete
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setDeletingId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="issue-table-wrap">
          <table className="project-table modification-table">
            <thead>
              <tr>
                <th scope="col">Project Name</th>
                <th scope="col">Module</th>
                <th scope="col">Modification</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
                <th scope="col">Developer</th>
                <th scope="col">Notes</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((modification) => (
                <tr key={modification.id}>
                  <th scope="row">{modification.projectName}</th>
                  <td>{modification.module}</td>
                  <td className="modification-long-text">{modification.description}</td>
                  <td>
                    <span className={`priority ${modification.priority.toLowerCase()}`}>
                      {modification.priority}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status modification-status ${modification.status.toLowerCase().replaceAll(" ", "-")}`}
                    >
                      <i />
                      {modification.status}
                    </span>
                  </td>
                  <td>{modification.developer}</td>
                  <td className="modification-long-text">{modification.notes || "—"}</td>
                  <td>
                    <div className="project-record-actions">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Edit modification for ${modification.projectName}: ${modification.module}`}
                        onClick={() => {
                          setEditingId(modification.id);
                          setDetails({
                            projectId: modification.projectId,
                            module: modification.module,
                            description: modification.description,
                            priority: modification.priority,
                            status: modification.status,
                            developer: modification.developer,
                            notes: modification.notes,
                          });
                          setDeletingId(null);
                          setError("");
                          projectInput.current?.focus();
                        }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button danger"
                        aria-label={`Delete modification for ${modification.projectName}: ${modification.module}`}
                        onClick={() => setDeletingId(modification.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <div className="empty">
            <NotebookPen size={30} />
            <h3>{modifications.length ? "No matching modifications" : "No modifications yet"}</h3>
            <p>
              {modifications.length
                ? "Adjust your project, status, or search filters."
                : "Record your first modification using the form above."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
