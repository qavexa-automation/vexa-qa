import { DesignSystemSection } from "@/features/design-system/components/design-system-section";
import { SampleRecordForm } from "@/features/design-system/components/sample-record-form";

export function FormsSection() {
  return (
    <DesignSystemSection
      description="The form uses one react-hook-form instance and one Zod schema. A real Server Action must parse the same schema again."
      rule="Errors stay beside their fields, entered values survive rejection, and pending state never resizes the submit control."
      title="Validated form"
    >
      <SampleRecordForm />
    </DesignSystemSection>
  );
}
