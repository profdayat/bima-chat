import { browser } from '$app/environment';
import type { User, AuthResult, AuthResponse } from '$lib/types';
import { getApiBase, getAuthHeaders } from '$lib/utils';

export function createAuthStore() {
  let authUser = $state<User | null>(null);
  let authToken = $state<string | null>(null);
  let guestNickname = $state('Staff RSUD');

  // Hydrate initial auth from localStorage on browser
  if (browser) {
    const savedToken = localStorage.getItem('rsud_chat_token');
    const savedUser = localStorage.getItem('rsud_chat_user');
    const savedGuest = localStorage.getItem('rsud_chat_username');

    if (savedToken) authToken = savedToken;
    if (savedUser) {
      try {
        authUser = JSON.parse(savedUser) as User;
      } catch {
        localStorage.removeItem('rsud_chat_user');
      }
    }
    if (savedGuest) guestNickname = savedGuest;
  }

  const currentUsername = $derived(authUser ? authUser.username : guestNickname);

  function setGuestNickname(name: string): void {
    if (!name.trim()) return;
    guestNickname = name.trim();
    if (browser) {
      localStorage.setItem('rsud_chat_username', guestNickname);
    }
  }

  async function login(username: string, password: string): Promise<AuthResult> {
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      let data: AuthResponse | null = null;
      try {
        data = (await res.json()) as AuthResponse;
      } catch {
        // Fallback if server returned plain text or html error
      }

      if (!res.ok) {
        return { success: false, error: data?.message || 'Login gagal, periksa username/password' };
      }

      if (data?.token && data?.user) {
        authToken = data.token;
        authUser = data.user;
        if (browser) {
          localStorage.setItem('rsud_chat_token', data.token);
          localStorage.setItem('rsud_chat_user', JSON.stringify(data.user));
        }
      }
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal terhubung ke server';
      return { success: false, error: msg };
    }
  }

  async function register(username: string, password: string): Promise<AuthResult> {
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      let data: AuthResponse | null = null;
      try {
        data = (await res.json()) as AuthResponse;
      } catch {
        // Fallback
      }

      if (!res.ok) {
        return { success: false, error: data?.message || 'Registrasi gagal, username mungkin sudah digunakan' };
      }

      if (data?.token && data?.user) {
        authToken = data.token;
        authUser = data.user;
        if (browser) {
          localStorage.setItem('rsud_chat_token', data.token);
          localStorage.setItem('rsud_chat_user', JSON.stringify(data.user));
        }
      }
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal terhubung ke server';
      return { success: false, error: msg };
    }
  }

  async function updateProfile(displayName: string, avatarUrl?: string): Promise<AuthResult> {
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/api/auth/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(authToken),
        body: JSON.stringify({ displayName, avatarUrl })
      });

      const data = (await res.json()) as { user?: User; message?: string };
      if (!res.ok) {
        return { success: false, error: data.message || 'Gagal update profil' };
      }

      if (data.user) {
        authUser = data.user;
        if (browser) {
          localStorage.setItem('rsud_chat_user', JSON.stringify(data.user));
        }
      }
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error koneksi server';
      return { success: false, error: msg };
    }
  }

  function logout(): void {
    authToken = null;
    authUser = null;
    if (browser) {
      localStorage.removeItem('rsud_chat_token');
      localStorage.removeItem('rsud_chat_user');
    }
  }

  return {
    get authUser() {
      return authUser;
    },
    get authToken() {
      return authToken;
    },
    get guestNickname() {
      return guestNickname;
    },
    get currentUsername() {
      return currentUsername;
    },
    setGuestNickname,
    login,
    register,
    updateProfile,
    logout
  };
}

export const authStore = createAuthStore();
