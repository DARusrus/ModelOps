import type { OrganizationRole } from '@/domain/organization/contracts';

export type OrganizationRoleOption = {
  value: OrganizationRole;
  label: string;
  description: string;
};

export const ORGANIZATION_ROLE_OPTIONS: readonly OrganizationRoleOption[] = [
  { value: 'viewer', label: 'Viewer', description: 'Can inspect evaluations and governance records.' },
  { value: 'editor', label: 'Editor', description: 'Can create evaluations and run comparisons.' },
  { value: 'reviewer', label: 'Reviewer', description: 'Can evaluate, compare, and perform review transitions.' },
  { value: 'admin', label: 'Administrator', description: 'Can manage members, governance, and all reviewer actions.' },
];
