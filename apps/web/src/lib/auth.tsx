import type { SessionUser } from '@altar/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signUp: (input: Record<string, unknown>) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = await api.get<{ user: SessionUser | null }>('/auth/me');
      setUser(result.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      refresh,
      signIn: async (email, password) => {
        const result = await api.post<{ user: SessionUser }>('/auth/login', { email, password });
        setUser(result.user);
        return result.user;
      },
      signUp: async (input) => {
        const result = await api.post<{ user: SessionUser }>('/auth/signup', input);
        setUser(result.user);
        return result.user;
      },
      signOut: async () => {
        await api.post('/auth/logout');
        setUser(null);
      },
    }),
    [user, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function isStaff(user: SessionUser | null): boolean {
  return Boolean(user && ['admin', 'finance_admin', 'legal_admin'].includes(user.role));
}
