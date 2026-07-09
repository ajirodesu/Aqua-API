import { Route, Routes } from 'react-router-dom';
import { AppDataProvider } from './lib/appData';
import { Home } from './pages/Home';
import { DocsLayout } from './pages/DocsLayout';
import { DocsOverview } from './pages/DocsOverview';
import { EndpointPage } from './pages/EndpointPage';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <AppDataProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/docs" element={<DocsLayout />}>
          <Route index element={<DocsOverview />} />
          <Route path=":category/:name" element={<EndpointPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppDataProvider>
  );
}
