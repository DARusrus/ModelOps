export type Role = 'viewer' | 'editor' | 'reviewer' | 'admin';

const permissions: Record<Role, readonly string[]> = {
  viewer: ['read'],
  editor: ['read', 'evaluate', 'compare'],
  reviewer: ['read', 'evaluate', 'compare', 'review'],
  admin: ['read', 'evaluate', 'compare', 'review', 'admin'],
};

export function canPerform(role: Role, permission: string): boolean {
  return permissions[role].includes(permission);
}
