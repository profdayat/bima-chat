export type UserRole = 'admin' | 'staff' | 'doctor' | 'nurse' | 'management' | string;

export interface User {
  id: string;
  username: string;
  role: UserRole;
  displayName?: string;
  avatarUrl?: string;
  isActive?: string | boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthUser extends User {
  token?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}
