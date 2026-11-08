"use client";

import { useRef, useState, type FormEvent } from "react";
import { Check, FolderKanban, Plus, X } from "lucide-react";
import { getDepartmentSection, PROJECT_STATUSES, type Project } from "@/lib/model";
import { OptionCombobox } from "@/components/forms/option-combobox";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { EmptyState, Panel } from "@/components/app-shell/panel";
import { ProjectTable } from "@/components/workspace-tables/project-table";

type ProjectDetails = Required<Omit<Project, "id" | "section">>;
const statusOptions = PROJECT_STATUSES.map((status) => ({ value: status, label: status }));
const blankProject = (): ProjectDetails => ({
  name: "",
  department: "",
  developer: "",
  status: "Not Started",
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
    [project.name, getDepartmentSection(project), project.developer, project.status ?? "Not Started"].some((value) =>
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
      status: details.status,
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
      <Panel
        className="project-editor"
        eyebrow="PROJECT DIRECTORY"
        title={<>{editingId ? "Edit project" : "Add project"}</>}
        action={
          <>
            <FolderKanban aria-hidden="true" className="size-5 text-muted-foreground" />
          </>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={save}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="project-name">Project name</FieldLabel>
              <Input
                id="project-name"
                ref={nameInput}
                required
                placeholder="Enter project name"
                value={details.name}
                onChange={(event) =>
                  setDetails((value) => ({ ...value, name: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-department">Department/Section</FieldLabel>
              <Input
                id="project-department"
                required
                placeholder="Enter department or section"
                value={details.department}
                onChange={(event) =>
                  setDetails((value) => ({ ...value, department: event.target.value }))
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-developer">Developer</FieldLabel>
              <Input
                id="project-developer"
                required
                placeholder="Enter developer name"
                value={details.developer}
                onChange={(event) =>
                  setDetails((value) => ({ ...value, developer: event.target.value }))
                }
              />
            </Field>
            <OptionCombobox
              id="project-status"
              label="Status"
              options={statusOptions}
              value={details.status}
              placeholder="Select project status"
              onChange={(status) => {
                const selected = PROJECT_STATUSES.find((option) => option === status);
                if (selected) setDetails((value) => ({ ...value, status: selected }));
              }}
            />
          </FieldGroup>
          {error && <FieldError>{error}</FieldError>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit">
              {editingId ? <Check aria-hidden="true" /> : <Plus aria-hidden="true" />}
              {editingId ? "Save project" : "Add project"}
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
        className="project-directory"
        title={<>Project records</>}
        action={
          <>
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              {query ? `${filtered.length} OF ` : ""}
              {projects.length} PROJECT{projects.length === 1 ? "" : "S"}
            </span>
          </>
        }
      >
        <ConfirmDialog
          open={Boolean(deletingProject)}
          title={`Delete ${deletingProject?.name ?? "this project"}?`}
          description="This removes the project from Project Maintenance."
          confirmLabel="Delete project"
          onCancel={() => setDeletingId(null)}
          onConfirm={() => {
            onChange(projects.filter((project) => project.id !== deletingId));
            if (editingId === deletingId) reset();
            setDeletingId(null);
            onNotice("Project deleted");
          }}
        />
        {filtered.length ? (
          <div className="issue-table-wrap">
            <ProjectTable
              projects={filtered}
              onEdit={(project) => {
                setEditingId(project.id);
                setDetails({
                  name: project.name,
                  department: getDepartmentSection(project),
                  developer: project.developer,
                  status: project.status ?? "Not Started",
                });
                setDeletingId(null);
                setError("");
                nameInput.current?.focus();
              }}
              onDelete={(project) => setDeletingId(project.id)}
              onUpdate={(project) => {
                onChange(projects.map((entry) => entry.id === project.id ? project : entry));
                if (editingId === project.id) {
                  setDetails((value) => ({ ...value, status: project.status ?? "Not Started" }));
                }
                onNotice("Project status updated");
              }}
            />
          </div>
        ) : (
          <EmptyState
            icon={FolderKanban}
            title={<>{query ? "No matching projects" : "No projects yet"}</>}
            description={
              <>
                {query
                  ? "Search by project name, department/section, developer, or status."
                  : "Add your first project using the form."}
              </>
            }
          />
        )}
      </Panel>
    </div>
  );
}
