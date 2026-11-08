"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Plus, Rocket, X } from "lucide-react";
import {
  DEPLOYMENT_ENVIRONMENTS,
  DEPLOYMENT_STATUSES,
  type Deployment,
  type Project,
} from "@/lib/model";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { FilterCombobox, valueOptions } from "@/components/forms/filter-combobox";
import { OptionCombobox } from "@/components/forms/option-combobox";
import { projectOptions } from "@/components/forms/project-options";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, Panel } from "@/components/app-shell/panel";
import { DeploymentTable } from "@/components/workspace-tables/deployment-table";

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
  const projectInput = useRef<HTMLButtonElement>(null);
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
      <Panel
        eyebrow="RELEASE CONTROL"
        title={<>{editingId ? "Edit deployment" : "Add deployment"}</>}
        action={
          <>
            <Rocket aria-hidden="true" className="size-5 text-muted-foreground" />
          </>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={save}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <OptionCombobox
              id="deployment-project"
              label="Project name"
              options={projectOptions(projects, editing)}
              placeholder="Select a project"
              triggerRef={projectInput}
              value={details.projectId}
              onChange={(value) => setDetails((current) => ({ ...current, projectId: value }))}
            />
            <OptionCombobox
              id="deployment-environment"
              label="Environment"
              options={valueOptions(DEPLOYMENT_ENVIRONMENTS)}
              placeholder="Select an environment"
              value={details.environment}
              onChange={(value) =>
                setDetails((current) => ({
                  ...current,
                  environment: value as Details["environment"],
                }))
              }
            />
            <Field>
              <FieldLabel htmlFor="deployment-version">Version / Release</FieldLabel>
              <Input
                id="deployment-version"
                required
                placeholder="e.g. v1.0.0"
                value={details.version}
                onChange={(event) =>
                  setDetails((value) => ({ ...value, version: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="deployment-date">Deployment date</FieldLabel>
              <Input
                id="deployment-date"
                required
                type="date"
                min="0001-01-01"
                max="9999-12-31"
                value={details.deploymentDate}
                onChange={(event) =>
                  setDetails((value) => ({ ...value, deploymentDate: event.target.value }))
                }
              />
            </Field>
            <OptionCombobox
              id="deployment-status"
              label="Status"
              options={valueOptions(DEPLOYMENT_STATUSES)}
              placeholder="Select a status"
              value={details.status}
              onChange={(value) =>
                setDetails((current) => ({ ...current, status: value as Deployment["status"] }))
              }
            />
            <Field>
              <FieldLabel htmlFor="deployment-notes">
                Notes <span className="font-normal text-muted-foreground">(optional)</span>
              </FieldLabel>
              <Textarea
                id="deployment-notes"
                rows={2}
                placeholder="Release details or deployment notes"
                value={details.notes}
                onChange={(event) =>
                  setDetails((value) => ({ ...value, notes: event.target.value }))
                }
              />
            </Field>
          </FieldGroup>
          {!projects.length && !editing && (
            <Alert>
              <AlertDescription className="flex flex-wrap items-center gap-2">
                Add a project in Project Maintenance before recording a deployment.
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
              {editingId ? "Save deployment" : "Add deployment"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={reset}>
                <X aria-hidden="true" />
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Panel>
      <Panel
        title={
          <>
            Deployment records{" "}
            <span className="font-normal text-muted-foreground">({filtered.length})</span>
          </>
        }
        action={
          <>
            <div className="flex flex-wrap gap-2">
              <FilterCombobox
                allLabel="All projects"
                label="Filter deployments by project"
                options={projectOptions(projects)}
                value={activeProjectFilter}
                onChange={setProjectFilter}
              />
              <FilterCombobox
                allLabel="All statuses"
                label="Filter deployments by status"
                options={valueOptions(DEPLOYMENT_STATUSES)}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </>
        }
      >
        <ConfirmDialog
          open={Boolean(deleting)}
          title={`Delete deployment ${deleting?.version ?? ""}?`}
          description={`This removes the ${deleting?.environment ?? ""} deployment record for ${deleting?.projectName ?? "this project"}.`}
          confirmLabel="Delete deployment"
          onCancel={() => setDeletingId(null)}
          onConfirm={() => {
            onChange(deployments.filter((deployment) => deployment.id !== deletingId));
            if (editingId === deletingId) reset();
            setDeletingId(null);
            onNotice("Deployment deleted");
          }}
        />
        <div className="issue-table-wrap">
          <DeploymentTable
            deployments={filtered}
            onEdit={(deployment) => {
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
            onDelete={(deployment) => setDeletingId(deployment.id)}
            onUpdate={(deployment) => {
              onChange(
                deployments.map((entry) => (entry.id === deployment.id ? deployment : entry)),
              );
              if (editingId === deployment.id)
                setDetails((value) => ({ ...value, status: deployment.status }));
              onNotice(`${deployment.version} marked ${deployment.status}`);
            }}
          />
        </div>
        {!filtered.length && (
          <EmptyState
            icon={Rocket}
            title={<>{deployments.length ? "No matching deployments" : "No deployments yet"}</>}
            description={
              <>
                {deployments.length
                  ? "Adjust your project, status, or search filters."
                  : "Record your first deployment using the form above."}
              </>
            }
          />
        )}
      </Panel>
    </div>
  );
}
