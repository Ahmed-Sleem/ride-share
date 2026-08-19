/* Identity contract — the only public surface of this module (CH8a §8a.2).
   Other modules import these types, never the module's internals. */

export type UserRole =
  | 'rider'
  | 'driver'
  | 'operations'
  | 'manager'
  | 'support'
  | 'super_admin';

export const STAFF_ROLES: readonly UserRole[] = [
  'operations',
  'manager',
  'support',
  'super_admin',
];

export interface UserRow {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: UserRole;
  password_hash: string | null;
  status: 'active' | 'suspended' | 'pending_verification';
  email_verified_at?: Date | null;
  is_system_admin: boolean;
  deleted_at: Date | null;
  created_at: Date;
}

export interface PublicUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: UserRole;
  status: string;
  emailVerified: boolean;
  isSystemAdmin: boolean;
}

/** The authenticated actor attached to the request by the JWT guard. */
export interface Actor {
  id: string;
  role: UserRole;
}

export function toPublicUser(u: UserRow): PublicUser {
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    name: u.name,
    role: u.role,
    status: u.status,
    emailVerified: !!u.email_verified_at,
    isSystemAdmin: !!u.is_system_admin,
  };
}
