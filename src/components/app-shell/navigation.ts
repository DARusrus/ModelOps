import type { Role } from '@/lib/auth/permissions';

export interface WorkspaceNavigationItem {
  href: string;
  label: string;
  description: string;
  roles?: readonly Role[];
}

const navigationItems: readonly WorkspaceNavigationItem[] = [
  {
    href: '/modelops',
    label: 'Model card studio',
    description: 'Create, inspect, and compare governed evaluations.',
  },
  {
    href: '/settings/members',
    label: 'Team',
    description: 'Manage invitations and organization roles.',
    roles: ['admin'],
  },
];

export function navigationItemsForRole(role: Role): WorkspaceNavigationItem[] {
  return navigationItems.filter((item) => !item.roles || item.roles.includes(role));
}

export function isNavigationItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
