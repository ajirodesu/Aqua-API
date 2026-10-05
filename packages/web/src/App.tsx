/**
 * App routes — public docs plus the admin dashboard. By AjiroDesu.
 * Admin routes are lazy-loaded and isolated behind AdminAuthProvider.
 */

import { Suspense, lazy } from 'react';
import { Outlet, Route, Routes } from 'react-router-dom';
import { AppDataProvider } from './lib/appData';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { PageLoader } from './components/PageLoader';
import { AdminProtectedRoute, AdminPublicRoute } from './components/AdminGuards';

const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const DocsLayout = lazy(() => import('./pages/DocsLayout').then((m) => ({ default: m.DocsLayout })));
const DocsOverview = lazy(() => import('./pages/DocsOverview').then((m) => ({ default: m.DocsOverview })));
const EndpointPage = lazy(() => import('./pages/EndpointPage').then((m) => ({ default: m.EndpointPage })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

const AdminLogin = lazy(() => import('./pages/admin/Login').then((m) => ({ default: m.AdminLogin })));
const AdminSidebarLayout = lazy(() =>
  import('./pages/admin/AdminSidebarLayout').then((m) => ({ default: m.AdminSidebarLayout }))
);
const AdminOverview = lazy(() =>
  import('./pages/admin/Overview').then((m) => ({ default: m.AdminOverview }))
);
const AdminStatsPage = lazy(() =>
  import('./pages/admin/Stats').then((m) => ({ default: m.AdminStatsPage }))
);
const AdminEndpoints = lazy(() =>
  import('./pages/admin/Endpoints').then((m) => ({ default: m.AdminEndpoints }))
);
const AdminLogs = lazy(() => import('./pages/admin/Logs').then((m) => ({ default: m.AdminLogs })));
const AdminAnnounce = lazy(() =>
  import('./pages/admin/Announce').then((m) => ({ default: m.AdminAnnounce }))
);
const AdminSettingsPage = lazy(() =>
  import('./pages/admin/Settings').then((m) => ({ default: m.AdminSettingsPage }))
);

function RouteFallback() {
  return (
    <div className="flex min-h-[100dvh] animate-fade-in-up items-center justify-center bg-surface">
      <PageLoader />
    </div>
  );
}

export default function App() {
  return (
    <AppDataProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/docs" element={<DocsLayout />}>
            <Route index element={<DocsOverview />} />
            <Route path=":category/:name" element={<EndpointPage />} />
          </Route>
          <Route
            element={
              <AdminAuthProvider>
                <Outlet />
              </AdminAuthProvider>
            }
          >
            <Route path="/admin" element={<AdminPublicRoute />}>
              <Route index element={<AdminLogin />} />
            </Route>
            <Route path="/admin/dashboard" element={<AdminProtectedRoute />}>
              <Route element={<AdminSidebarLayout />}>
                <Route index element={<AdminOverview />} />
                <Route path="stats" element={<AdminStatsPage />} />
                <Route path="endpoints" element={<AdminEndpoints />} />
                <Route path="logs" element={<AdminLogs />} />
                <Route path="announce" element={<AdminAnnounce />} />
                <Route path="settings" element={<AdminSettingsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppDataProvider>
  );
}
