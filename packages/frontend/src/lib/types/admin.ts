import type { UserRole } from './user';

export interface AdminStats {
  users: number;
  messages: number;
  channels: number;
}

export interface SystemSettings {
  allowGuest: boolean;
  allowRegistration: boolean;
}

export interface AdminUserUpdatePayload {
  role?: UserRole;
  isActive?: 'true' | 'false' | boolean;
  password?: string;
}
