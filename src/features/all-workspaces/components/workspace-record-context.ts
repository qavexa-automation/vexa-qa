import { createContext } from "react";

import type { WorkspaceSource } from "../lib/workspace-records";

export const WorkspaceRecordsContext = createContext<{
  userId: string;
  sources: Map<string, WorkspaceSource>;
  refresh: () => void;
} | null>(null);
