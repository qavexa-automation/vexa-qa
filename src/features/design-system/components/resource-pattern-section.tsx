import { DesignSystemSection } from "@/features/design-system/components/design-system-section";
import { ResourceListDemo } from "@/features/design-system/components/resource-list-demo";

export function ResourcePatternSection() {
  return (
    <DesignSystemSection
      description="Desktop uses the shared shadcn and TanStack table. Mobile switches to focused tiles instead of compressing columns."
      rule="Production routes move search, status, sorting, and paging into the URL and send only the current server page to the table."
      title="Responsive resource list"
    >
      <ResourceListDemo />
    </DesignSystemSection>
  );
}
