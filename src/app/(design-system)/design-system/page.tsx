import type { Metadata } from "next";

import { DesignSystemScreen } from "@/features/design-system";

export const metadata: Metadata = {
  title: "Design System — VEXA QA",
  description: "Tokens and shared interface primitives for VEXA.",
};

export default function DesignSystemPage() {
  return <DesignSystemScreen />;
}
