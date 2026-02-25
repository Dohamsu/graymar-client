import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthUser {
  id: string;
  email: string;
  nickname: string | null;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;

  register(email: string, password: string, nickname?: string): Promise<void>;
  login(email: string, password: string): Promise<void>;
  logout(): void;
  clearError(): void;
  hydrate(): void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'graymar_auth_token';
const STORAGE_USER_KEY = 'graymar_auth_user';

function getBaseUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  }
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
  }
  return '';
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: false,
  error: null,

  register: async (email, password, nickname) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${getBaseUrl()}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ...(nickname ? { nickname } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) {
        set({ isLoading: false, error: json.message ?? '회원가입에 실패했습니다.' });
        return;
      }
      const { token, user } = json as { token: string; user: AuthUser };
      localStorage.setItem(STORAGE_KEY, token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
      set({ token, user, isLoading: false, error: null });
    } catch {
      set({ isLoading: false, error: '서버에 연결할 수 없습니다.' });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${getBaseUrl()}/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        set({ isLoading: false, error: json.message ?? '로그인에 실패했습니다.' });
        return;
      }
      const { token, user } = json as { token: string; user: AuthUser };
      localStorage.setItem(STORAGE_KEY, token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
      set({ token, user, isLoading: false, error: null });
    } catch {
      set({ isLoading: false, error: '서버에 연결할 수 없습니다.' });
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    set({ token: null, user: null, error: null });
  },

  clearError: () => {
    set({ error: null });
  },

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem(STORAGE_KEY);
    const userJson = localStorage.getItem(STORAGE_USER_KEY);
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as AuthUser;
        set({ token, user });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_USER_KEY);
      }
    }
  },
}));
