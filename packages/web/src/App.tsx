import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppDataProvider } from './lib/appData';

const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const DocsLayout = lazy(() => import('./pages/DocsLayout').then((m) => ({ default: m.DocsLayout })));
const DocsOverview = lazy(() => import('./pages/DocsOverview').then((m) => ({ default: m.DocsOverview })));
const EndpointPage = lazy(() => import('./pages/EndpointPage').then((m) => ({ default: m.EndpointPage })));
const NotFound = lazy(() => import('./pages/NotFound').then((m) => ({ default: m.NotFound })));

function RouteFallback() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-surface">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-aqua-500 border-t-transparent" />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppDataProvider>
  );
}
