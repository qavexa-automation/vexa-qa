import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import DeploymentTracker from "@/components/deployment-tracker";
import ModificationTracker from "@/components/modification-tracker";
import ProjectMaintenance from "@/components/project-maintenance";
import type { Deployment, Project } from "@/lib/model";

const project: Project = {
  id: "p1",
  name: "Portal",
  department: "Logistics",
  developer: "Ana",
  status: "Not Started",
};
const deployment: Deployment = {
  id: "d1",
  projectId: "p1",
  projectName: "Portal",
  environment: "Staging",
  version: "1.2.0",
  deploymentDate: "2026-11-17",
  status: "Planned",
  notes: "",
};

const projectScreen = () =>
  renderToStaticMarkup(
    <ProjectMaintenance projects={[project]} search="" onChange={vi.fn()} onNotice={vi.fn()} />,
  );

const deploymentScreen = () =>
  renderToStaticMarkup(
    <DeploymentTracker
      projects={[project]}
      deployments={[deployment]}
      search=""
      onChange={vi.fn()}
      onNotice={vi.fn()}
      onManageProjects={vi.fn()}
    />,
  );

describe("Project Maintenance editor", () => {
  it("opens on demand rather than taking up the screen", () => {
    const html = projectScreen();
    expect(html).toContain("Add project");
    // The form's own fields stay out of the page until Add project is chosen.
    expect(html).not.toContain("Enter project name");
    expect(html).not.toContain("Enter department or section");
    expect(html).not.toContain("PROJECT DIRECTORY");
  });

  it("still lists the project records", () => {
    expect(projectScreen()).toContain("Portal");
  });
});

describe("Deployment Tracker editor", () => {
  it("opens on demand rather than taking up the screen", () => {
    const html = deploymentScreen();
    expect(html).toContain("Add deployment");
    expect(html).not.toContain("RELEASE CONTROL");
    expect(html).not.toContain("Close add deployment form");
  });

  it("still lists the deployment records", () => {
    expect(deploymentScreen()).toContain("1.2.0");
  });
});

describe("combined record creation forms", () => {
  const props = { search: "", onNotice: vi.fn(), onChange: vi.fn(), onCancelCreate: vi.fn() };

  it("shows the project form without a second list", () => {
    const html = renderToStaticMarkup(<ProjectMaintenance {...props} projects={[]} />);

    expect(html).toContain("Enter project name");
    expect(html).not.toContain("Project records");
  });

  it("shows how to add a project before creating a deployment or modification", () => {
    const onManageProjects = vi.fn();
    const deploymentForm = renderToStaticMarkup(
      <DeploymentTracker {...props} projects={[]} deployments={[]} onManageProjects={onManageProjects} />,
    );
    const modificationForm = renderToStaticMarkup(
      <ModificationTracker {...props} projects={[]} modifications={[]} onManageProjects={onManageProjects} />,
    );

    expect(deploymentForm).toContain("Add a project in Project Maintenance");
    expect(deploymentForm).not.toContain("Deployment records");
    expect(modificationForm).toContain("Add a project in Project Maintenance");
    expect(modificationForm).not.toContain("Modification records");
  });
});
