"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Pencil, Plus, Rocket, Trash2, X } from "lucide-react";
import {
  DEPLOYMENT_ENVIRONMENTS,
  DEPLOYMENT_STATUSES,
  type Deployment,
  type Project,
} from "@/lib/model";

type Details = {
  projectId: string;
  environment: Deployment["environment"] | "";
  version: string;
  deploymentDate: string;
  status: Deployment["status"];
  notes: string;
};
const blankDetails = (): Details => ({
  projectId: "",
  environment: "",
  version: "",
  deploymentDate: "",
  status: "Planned",
  notes: "",
});

export default function DeploymentTracker({
  projects,
  deployments,
  search,
  onChange,
  onNotice,
  onManageProjects,
}: {
  projects: Project[];
  deployments: Deployment[];
  search: string;
  onChange: (deployments: Deployment[]) => void;
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
  const editing = deployments.find((deployment) => deployment.id === editingId);
  const selectedProject = projects.find((project) => project.id === details.projectId);
  const projectName =
    selectedProject?.name ?? (editing?.projectId === details.projectId ? editing.projectName : "");
  const activeProjectFilter = projects.some((project) => project.id === projectFilter)
    ? projectFilter
    : "";
  const query = search.trim().toLowerCase();
  const filtered = deployments.filter(
    (deployment) =>
      (!activeProjectFilter || deployment.projectId === activeProjectFilter) &&
      (!statusFilter || deployment.status === statusFilter) &&
      [
        deployment.projectName,
        deployment.environment,
        deployment.version,
        deployment.deploymentDate,
        deployment.status,
        deployment.notes,
      ].some((value) => value.toLowerCase().includes(query)),
  );
  const deleting = deployments.find((deployment) => deployment.id === deletingId);

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
      !details.environment ||
      !details.version.trim() ||
      !details.deploymentDate
    ) {
      setError("Select a project and environment, then enter the version and deployment date.");
      return;
    }
    const deployment: Deployment = {
      id: editingId ?? crypto.randomUUID(),
      projectId: details.projectId,
      projectName,
      environment: details.environment,
      version: details.version.trim(),
      deploymentDate: details.deploymentDate,
      status: details.status,
      notes: details.notes.trim(),
    };
    onChange(
      editingId
        ? deployments.map((entry) => (entry.id === editingId ? deployment : entry))
        : [deployment, ...deployments],
    );
    onNotice(editingId ? "Deployment updated" : "Deployment added");
    reset();
    projectInput.current?.focus();
  }

  return (
    <div className="deployment-layout">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">RELEASE CONTROL</span>
            <h2>{editingId ? "Edit deployment" : "Add deployment"}</h2>
          </div>
          <Rocket size={19} className="muted" />
        </div>
        <form className="settings-form deployment-form" onSubmit={save}>
          <div className="deployment-fields">
            <label>
              Project Name
              <select
                ref={projectInput}
                required
                value={details.projectId}
                onChange={(event) =>
                  setDetails((value) => ({ ...value, projectId: event.target.value }))
                }
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
              Environment
              <select
                required
                value={details.environment}
                onChange={(event) =>
                  setDetails((value) => ({
                    ...value,
                    environment: event.target.value as Details["environment"],
                  }))
                }
              >
                <option value="" disabled>
                  Select an environment
                </option>
                {DEPLOYMENT_ENVIRONMENTS.map((environment) => (
                  <option key={environment}>{environment}</option>
                ))}
              </select>
            </label>
            <label>
              Version / Release
              <input
                required
                maxLength={100}
                placeholder="e.g. v1.0.0"
                value={details.version}
                onChange={(event) =>
                  setDetails((value) => ({ ...value, version: event.target.value }))
                }
              />
            </label>
            <label>
              Deployment Date
              <input
                required
                type="date"
                min="0001-01-01"
                max="9999-12-31"
                value={details.deploymentDate}
                onChange={(event) =>
                  setDetails((value) => ({ ...value, deploymentDate: event.target.value }))
                }
              />
            </label>
            <label>
              Status
              <select
                value={details.status}
                onChange={(event) =>
                  setDetails((value) => ({
                    ...value,
                    status: event.target.value as Deployment["status"],
                  }))
                }
              >
                {DEPLOYMENT_STATUSES.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Notes <small>(optional)</small>
              <textarea
                rows={2}
                maxLength={3000}
                placeholder="Release details or deployment notes"
                value={details.notes}
                onChange={(event) =>
                  setDetails((value) => ({ ...value, notes: event.target.value }))
                }
              />
            </label>
          </div>
          {!projects.length && !editing && (
            <div className="info-note">
              <span>Add a project in Project Maintenance before recording a deployment.</span>
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
              {editingId ? "Save deployment" : "Add deployment"}
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
        <div className="panel-heading deployment-record-heading">
          <h2>
            Deployment records <span className="subtle-label">({filtered.length})</span>
          </h2>
          <div className="deployment-filters">
            <select
              aria-label="Filter deployments by project"
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
              aria-label="Filter deployments by status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              {DEPLOYMENT_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
        {deleting && (
          <div className="project-delete-notice" role="alert">
            <p>
              Delete deployment <strong>{deleting.version}</strong> for{" "}
              <strong>{deleting.projectName}</strong>?
            </p>
            <div className="project-form-actions">
              <button
                type="button"
                className="button fail-button"
                onClick={() => {
                  onChange(deployments.filter((deployment) => deployment.id !== deletingId));
                  if (editingId === deletingId) reset();
                  setDeletingId(null);
                  onNotice("Deployment deleted");
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
          <table className="project-table deployment-table">
            <thead>
              <tr>
                <th scope="col">Project Name</th>
                <th scope="col">Environment</th>
                <th scope="col">Version / Release</th>
                <th scope="col">Deployment Date</th>
                <th scope="col">Status</th>
                <th scope="col">Notes</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((deployment) => (
                <tr key={deployment.id}>
                  <th scope="row">{deployment.projectName}</th>
                  <td>{deployment.environment}</td>
                  <td>{deployment.version}</td>
                  <td className="deployment-date">{deployment.deploymentDate}</td>
                  <td>
                    <span
                      className={`status deployment-status ${deployment.status.toLowerCase().replaceAll(" ", "-")}`}
                    >
                      <i />
                      {deployment.status}
                    </span>
                  </td>
                  <td className="deployment-notes">{deployment.notes || "—"}</td>
                  <td>
                    <div className="project-record-actions">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Edit deployment ${deployment.version} for ${deployment.projectName}`}
                        onClick={() => {
                          setEditingId(deployment.id);
                          setDetails({
                            projectId: deployment.projectId,
                            environment: deployment.environment,
                            version: deployment.version,
                            deploymentDate: deployment.deploymentDate,
                            status: deployment.status,
                            notes: deployment.notes,
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
                        aria-label={`Delete deployment ${deployment.version} for ${deployment.projectName}`}
                        onClick={() => setDeletingId(deployment.id)}
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
            <Rocket size={30} />
            <h3>{deployments.length ? "No matching deployments" : "No deployments yet"}</h3>
            <p>
              {deployments.length
                ? "Adjust your project, status, or search filters."
                : "Record your first deployment using the form above."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
