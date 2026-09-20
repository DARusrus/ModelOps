'use client';

import { createContext, useContext } from 'react';
import type { Role } from '@/lib/auth/permissions';

const WorkspaceAccessContext = createContext<Role | null>(null);

export function WorkspaceAccessProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  return <WorkspaceAccessContext.Provider value={role}>{children}</WorkspaceAccessContext.Provider>;
}

export function useWorkspaceRole(): Role {
  const role = useContext(WorkspaceAccessContext);
  if (!role) throw new Error('Workspace access context is unavailable.');
  return role;
}
