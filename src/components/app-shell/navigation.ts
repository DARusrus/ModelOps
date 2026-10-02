import type { Role } from '@/lib/auth/permissions';

export interface WorkspaceNavigationItem {
  href: string;
  label: string;
  description: string;
  roles?: readonly Role[];
}

const navigationItems: readonly WorkspaceNavigationItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    description: 'Review organization state and recent work.',
  },
  {
    href: '/evaluations',
    label: 'Evaluations',
    description: 'Search, create, and inspect governed dossiers.',
  },
  {
    href: '/reviews',
    label: 'Reviews',
    description: 'Find submitted work awaiting governance review.',
    roles: ['reviewer', 'admin'],
  },
  {
    href: '/compare',
    label: 'Compare',
    description: 'Diff two persisted evaluation records.',
    roles: ['editor', 'reviewer', 'admin'],
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
