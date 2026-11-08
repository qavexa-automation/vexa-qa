import type { ComboboxOption } from "@/components/forms/option-combobox";
import type { Project } from "@/lib/model";

/**
 * Project choices for a record form. A record whose project was deleted keeps showing its saved
 * name, marked archived, so editing it does not silently change the project.
 */
export function projectOptions(
  projects: Project[],
  editing?: { projectId: string; projectName: string },
): ComboboxOption[] {
  const options = projects.map((project) => ({ value: project.id, label: project.name }));
  if (editing && editing.projectId && !projects.some((project) => project.id === editing.projectId))
    options.unshift({ value: editing.projectId, label: `${editing.projectName} (archived)` });
  return options;
}
