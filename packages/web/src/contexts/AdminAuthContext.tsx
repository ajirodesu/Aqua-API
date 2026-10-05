/**
 * Admin session context — token auth for the Aqua admin dashboard.
 * By AjiroDesu. Isolated from the public docs (which need no auth).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminRequest, getAdminToken, setAdminToken, AdminApiError } from '../lib/adminApi';
import type { AdminMe } from '../lib/adminTypes';

interface AdminAuthValue {
  token: string | null;
  username: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAdminToken());
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    const current = getAdminToken();
    setAdminToken(null);
    setToken(null);
    setUsername(null);
    if (current) {
      adminRequest('/api/admin/logout', { method: 'POST' }).catch(() => {
        // Logout is best-effort; the local session is already cleared.
      });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getAdminToken()) {
        setLoading(false);
        return;
      }
      try {
        const me = await adminRequest<AdminMe>('/api/admin/me');
        if (!cancelled) {
          setUsername(me.username);
          setToken(getAdminToken());
        }
      } catch (err) {
        if (!cancelled && err instanceof AdminApiError && err.status === 401) {
          setAdminToken(null);
          setToken(null);
          setUsername(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (user: string, password: string) => {
    const res = await adminRequest<{ token: string; username: string; expiresAt: null }>(
      '/api/admin/login',
      { method: 'POST', body: { username: user, password }, auth: false }
    );
    setAdminToken(res.token);
    setToken(res.token);
    setUsername(res.username);
  }, []);

  const value = useMemo(
    () => ({ token, username, loading, login, logout }),
    [token, username, loading, login, logout]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
