import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { fetchConfig, fetchEndpoints } from './api';
import type { AquaConfig, EndpointBucket, EndpointItem } from './types';

interface AppDataState {
  config: AquaConfig | null;
  buckets: EndpointBucket[];
  loading: boolean;
  error: string | null;
  totalEndpoints: number;
  findEndpoint: (category: string, name: string) => EndpointItem | undefined;
}

const AppDataContext = createContext<AppDataState | null>(null);

function slugify(value: string): string {
  return value.toLowerCase().replace(/[\s/]+/g, '-');
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AquaConfig | null>(null);
  const [buckets, setBuckets] = useState<EndpointBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [cfg, eps] = await Promise.all([fetchConfig(), fetchEndpoints()]);
        if (cancelled) return;
        setConfig(cfg);
        setBuckets(eps.endpoints ?? []);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const totalEndpoints = useMemo(
    () => buckets.reduce((sum, b) => sum + b.items.length, 0),
    [buckets]
  );

  const findEndpoint = useMemo(() => {
    return (category: string, name: string) =>
      buckets
        .find((b) => slugify(b.name) === category)
        ?.items.find((i) => slugify(i.name) === name);
  }, [buckets]);

  const value: AppDataState = { config, buckets, loading, error, totalEndpoints, findEndpoint };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataState {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

export { slugify };
