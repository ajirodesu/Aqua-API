/**
 * Admin route guards — mirrors Persian-Bot's AdminProtectedRoute.
 * By AjiroDesu.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import { PageLoader } from './PageLoader';

export function AdminProtectedRoute() {
  const { token, loading } = useAdminAuth();
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface">
        <PageLoader label="Checking session…" />
      </div>
    );
  }
  if (!token) return <Navigate to="/admin" replace />;
  return <Outlet />;
}

export function AdminPublicRoute() {
  const { token, loading } = useAdminAuth();
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-surface">
        <PageLoader label="Checking session…" />
      </div>
    );
  }
  if (token) return <Navigate to="/admin/dashboard" replace />;
  return <Outlet />;
}
