"use client";

import { createContext, useContext } from "react";
import type { Role } from "@/types";

const WorkspaceRoleContext = createContext<Role>("CLIENT");

export function useWorkspaceRole(): Role {
  return useContext(WorkspaceRoleContext);
}

export function WorkspaceProvider({ role, children }: { role: string; children: React.ReactNode }) {
  return (
    <WorkspaceRoleContext.Provider value={role as Role}>
      {children}
    </WorkspaceRoleContext.Provider>
  );
}
