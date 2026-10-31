"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, FolderKanban, Pencil, Plus, Trash2, X } from "lucide-react";
import { getDepartmentSection, type Project } from "@/lib/model";

type ProjectDetails = Omit<Project, "id" | "section">;
const blankProject = (): ProjectDetails => ({
  name: "",
  department: "",
  developer: "",
});

export default function ProjectMaintenance({
  projects,
  search,
  onChange,
  onNotice,
}: {
  projects: Project[];
  search: string;
  onChange: (projects: Project[]) => void;
  onNotice: (message: string) => void;
}) {
  const [details, setDetails] = useState<ProjectDetails>(blankProject);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);
  const query = search.trim().toLowerCase();
  const filtered = projects.filter((project) =>
    [project.name, getDepartmentSection(project), project.developer].some((value) =>
      value.toLowerCase().includes(query),
    ),
  );
  const deletingProject = projects.find((project) => project.id === deletingId);

  function reset() {
    setDetails(blankProject());
    setEditingId(null);
    setError("");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = {
      name: details.name.trim(),
      department: details.department.trim(),
      developer: details.developer.trim(),
    };
    if (Object.values(values).some((value) => !value)) {
      setError("Enter a project name, department/section, and developer.");
      return;
    }
    const project: Project = { id: editingId ?? crypto.randomUUID(), ...values };
    onChange(
      editingId
        ? projects.map((entry) => (entry.id === editingId ? project : entry))
        : [project, ...projects],
    );
    onNotice(editingId ? "Project updated" : "Project added");
    reset();
    nameInput.current?.focus();
  }

  return (
    <div className="project-maintenance">
      <section className="panel project-editor">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">PROJECT DIRECTORY</span>
            <h2>{editingId ? "Edit project" : "Add project"}</h2>
          </div>
          <FolderKanban size={19} className="muted" />
        </div>
        <form className="settings-form" onSubmit={save}>
          <label>
            Project Name
            <input
              ref={nameInput}
              required
              maxLength={120}
              placeholder="Enter project name"
              value={details.name}
              onChange={(event) => setDetails((value) => ({ ...value, name: event.target.value }))}
            />
          </label>
          <label>
            Department/Section
            <input
              required
              maxLength={240}
              placeholder="Enter department or section"
              value={details.department}
              onChange={(event) =>
                setDetails((value) => ({ ...value, department: event.target.value }))
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
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="project-form-actions">
            <button type="submit" className="button primary">
              {editingId ? <Check size={15} /> : <Plus size={15} />}
              {editingId ? "Save project" : "Add project"}
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

      <section className="panel project-directory">
        <div className="panel-heading">
          <h2>Project records</h2>
          <span className="subtle-label">
            {query ? `${filtered.length} OF ` : ""}
            {projects.length} PROJECT{projects.length === 1 ? "" : "S"}
          </span>
        </div>
        {deletingProject && (
          <div className="project-delete-notice" role="alert">
            <p>
              Delete <strong>{deletingProject.name}</strong> from Project Maintenance?
            </p>
            <div className="project-form-actions">
              <button
                type="button"
                className="button fail-button"
                onClick={() => {
                  onChange(projects.filter((project) => project.id !== deletingId));
                  if (editingId === deletingId) reset();
                  setDeletingId(null);
                  onNotice("Project deleted");
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
        {filtered.length ? (
          <div className="issue-table-wrap">
            <table className="project-table">
              <thead>
                <tr>
                  <th scope="col">Project Name</th>
                  <th scope="col">Department/Section</th>
                  <th scope="col">Developer</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((project) => (
                  <tr key={project.id}>
                    <th scope="row">{project.name}</th>
                    <td>{getDepartmentSection(project)}</td>
                    <td>{project.developer}</td>
                    <td>
                      <div className="project-record-actions">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`Edit ${project.name}`}
                          onClick={() => {
                            setEditingId(project.id);
                            setDetails({
                              name: project.name,
                              department: getDepartmentSection(project),
                              developer: project.developer,
                            });
                            setDeletingId(null);
                            setError("");
                            nameInput.current?.focus();
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-button danger"
                          aria-label={`Delete ${project.name}`}
                          onClick={() => setDeletingId(project.id)}
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
        ) : (
          <div className="empty">
            <FolderKanban size={30} />
            <h3>{query ? "No matching projects" : "No projects yet"}</h3>
            <p>
              {query
                ? "Search by project name, department/section, or developer."
                : "Add your first project using the form."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
