import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Copy,
  FileCode2,
  Globe,
  Layers,
  MapPin,
  Play,
  Plug,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAppData, slugify } from '../lib/appData';
import { MethodBadge } from '../components/MethodBadge';
import { API_ORIGIN, endpointUrl } from '../lib/api';
import { highlightJson } from '../lib/jsonHighlight';

const ERROR_CODES = [
  { code: 200, tone: 'ok', label: 'OK', desc: 'Request successful' },
  { code: 400, tone: 'warn', label: 'Bad Request', desc: 'Missing or invalid parameter' },
  { code: 404, tone: 'warn', label: 'Not Found', desc: 'Endpoint does not exist' },
  { code: 429, tone: 'warn', label: 'Rate Limited', desc: 'Too many requests' },
  { code: 500, tone: 'err', label: 'Server Error', desc: 'Internal or upstream failure' },
];

const toneClass: Record<string, string> = {
  ok: 'bg-success/15 text-success border-success/20',
  warn: 'bg-warning/15 text-warning border-warning/20',
  err: 'bg-error/15 text-error border-error/20',
};

const sampleResponseJson = JSON.stringify(
  {
    operator: 'AjiroDesu',
    timestamp: '2026-03-29T12:25:00.000Z',
    responseTime: '4ms',
    results: '// ... your data',
  },
  null,
  2
);

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">{children}</span>
    </div>
  );
}

export function DocsOverview() {
  const { config, buckets, totalEndpoints } = useAppData();
  const [copiedBase, setCopiedBase] = useState(false);
  const [copiedExample, setCopiedExample] = useState(false);
  const [ipInput, setIpInput] = useState('');
  const [ipResult, setIpResult] = useState<Record<string, string> | null>(null);
  const [ipError, setIpError] = useState<string | null>(null);
  const [ipChecking, setIpChecking] = useState(false);

  const allEndpoints = useMemo(() => buckets.flatMap((b) => b.items), [buckets]);
  const exampleEndpoint = useMemo(() => {
    if (allEndpoints.length === 0) return undefined;
    return allEndpoints[Math.floor(Math.random() * allEndpoints.length)];
  }, [allEndpoints]);
  const baseUrl = API_ORIGIN || (typeof window !== 'undefined' ? window.location.origin : '');
  const exampleUrl = exampleEndpoint ? endpointUrl(exampleEndpoint.path) : '';
  const exampleHref = exampleEndpoint
    ? `/docs/${slugify(exampleEndpoint.category)}/${slugify(exampleEndpoint.name)}`
    : '/docs';

  const gif = config?.header.imageSrc?.[0];
  const size = config?.header.imageSize;

  function copy(text: string, mark: (v: boolean) => void) {
    navigator.clipboard.writeText(text);
    mark(true);
    setTimeout(() => mark(false), 1500);
  }

  async function checkIp() {
    setIpChecking(true);
    setIpError(null);
    setIpResult(null);
    try {
      // Empty input means "my IP" — but the server only sees a private LAN
      // address for local/dev callers, so resolve the public IP in-browser.
      let target = ipInput.trim();
      if (target === '') {
        try {
          const own = await fetch('https://api.ipify.org?format=json');
          const parsed = (await own.json()) as { ip?: unknown };
          if (typeof parsed.ip !== 'string' || parsed.ip === '') {
            throw new Error('empty response');
          }
          target = parsed.ip;
          setIpInput(target);
        } catch {
          setIpError('Could not detect your public IP — type one in manually');
          return;
        }
      }
      const res = await fetch(`${API_ORIGIN}/tools/ipcheck?ip=${encodeURIComponent(target)}`);
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok || typeof data.error === 'string') {
        setIpError(typeof data.error === 'string' ? data.error : `Lookup failed: ${res.status}`);
        return;
      }
      const picked: Record<string, string> = {};
      for (const key of ['ip', 'country', 'region', 'city', 'isp', 'timezone']) {
        if (typeof data[key] === 'string' || typeof data[key] === 'number') {
          picked[key] = String(data[key]);
        }
      }
      setIpResult(picked);
    } catch (err) {
      setIpError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setIpChecking(false);
    }
  }

  return (
    <div className="flex animate-fade-in-up flex-col gap-6">
      {size && (
        <style>{`
          .docs-hero-gif { width: ${size.mobile}; }
          @media (min-width: 640px) { .docs-hero-gif { width: ${size.tablet}; } }
          @media (min-width: 1024px) { .docs-hero-gif { width: ${size.desktop}; } }
        `}</style>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-hairline bg-surface-container-low p-4">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {gif && <img src={gif} alt="" className="docs-hero-gif shrink-0 rounded-lg" loading="lazy" />}
          <div className="flex min-w-0 flex-col gap-1.5">
            <Eyebrow>Documentation</Eyebrow>
            <h1 className="text-[22px] font-bold tracking-tight text-on-surface">
              {config?.name ?? 'Aqua APIs'}
            </h1>
            <p className="max-w-xl text-[13px] leading-normal text-on-surface-variant">
              {config?.description ?? 'Simple and easy to use.'}
            </p>
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-success">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-success" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
              </span>
              {config?.header.status ?? 'Online'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-xl border border-hairline bg-surface-container-low p-4 text-center">
          <Plug className="mx-auto h-4 w-4 text-primary" strokeWidth={2} />
          <span className="text-lg font-bold text-on-surface">{totalEndpoints}</span>
          <span className="text-xs text-on-surface-variant">Total APIs</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-hairline bg-surface-container-low p-4 text-center">
          <Layers className="mx-auto h-4 w-4 text-primary" strokeWidth={2} />
          <span className="text-lg font-bold text-on-surface">{buckets.length}</span>
          <span className="text-xs text-on-surface-variant">Categories</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-hairline bg-surface-container-low p-4 text-center">
          <ShieldCheck className="mx-auto h-4 w-4 text-primary" strokeWidth={2} />
          <span className="text-lg font-bold text-on-surface">Free</span>
          <span className="text-xs text-on-surface-variant">No Auth</span>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-hairline bg-surface-container-low p-4 text-center">
          <Zap className="mx-auto h-4 w-4 text-primary" strokeWidth={2} />
          <span className="text-lg font-bold text-on-surface">JSON</span>
          <span className="text-xs text-on-surface-variant">Responses</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-container-high text-primary">
              <Globe className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <div className="text-[13.5px] font-semibold text-on-surface">Base URL</div>
              <div className="text-xs text-on-surface-variant">Root for all API calls</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-input border-2 bg-surface-container-high px-3 py-2.5"
            style={{ borderColor: 'var(--color-input-border)', backgroundColor: 'var(--color-input-bg)' }}>
            <code className="scroll-visible-desktop flex-1 overflow-x-auto whitespace-nowrap border-0 bg-transparent p-0 font-mono text-xs text-on-surface">
              {baseUrl}
            </code>
            <button
              type="button"
              onClick={() => copy(baseUrl, setCopiedBase)}
              className="shrink-0 rounded-input p-1 text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/10 hover:text-on-surface"
              aria-label="Copy base URL"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          {copiedBase && <p className="mt-1.5 text-[11px] text-primary">Copied</p>}
        </div>

        <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-container-high text-primary">
              <FileCode2 className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <div className="text-[13.5px] font-semibold text-on-surface">Example Endpoint</div>
              <div className="text-xs text-on-surface-variant">Try a live sample call</div>
            </div>
          </div>

          {exampleEndpoint && (
            <>
              <div className="mt-4 flex items-center gap-2">
                <MethodBadge method={exampleEndpoint.methods[0]} />
                <span className="truncate font-mono text-[11px] text-on-surface-variant">
                  {exampleEndpoint.path.split('?')[0]}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-input border-2 px-3 py-2.5"
                style={{ borderColor: 'var(--color-input-border)', backgroundColor: 'var(--color-input-bg)' }}>
                <code className="flex-1 overflow-x-auto whitespace-nowrap border-0 bg-transparent p-0 font-mono text-xs text-on-surface">
                  {exampleUrl}
                </code>
                <button
                  type="button"
                  onClick={() => copy(exampleUrl, setCopiedExample)}
                  className="shrink-0 rounded-input p-1 text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/10 hover:text-on-surface"
                  aria-label="Copy example URL"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              {copiedExample && <p className="mt-1.5 text-[11px] text-primary">Copied</p>}
              <Link to={exampleHref} className="btn-primary mt-3 h-11 w-full rounded-lg text-[13px]">
                <Play className="h-3 w-3 fill-current" />
                Try it
              </Link>
            </>
          )}
        </div>
      </div>

      {/* IP CHECKER */}
      <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-container-high text-primary">
            <MapPin className="h-4 w-4" strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-semibold text-on-surface">IP Checker</div>
            <div className="text-xs text-on-surface-variant">Geolocation for any IP — empty means your own</div>
          </div>
          <Link to="/docs/tools/ipcheck" className="shrink-0 text-xs font-medium text-primary hover:text-primary/80">
            API docs →
          </Link>
        </div>
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void checkIp();
          }}
        >
          <input
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            placeholder="8.8.8.8 (or leave empty for your IP)"
            aria-label="IP address to check"
            className="input-field min-w-0 flex-1 font-mono text-[13px]"
          />
          <button type="submit" disabled={ipChecking} className="btn-primary h-11 shrink-0 rounded-lg px-5 text-[13px] disabled:opacity-[0.38]">
            {ipChecking ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
            {ipChecking ? 'Checking…' : 'Check IP'}
          </button>
        </form>
        {ipError && <p className="mt-2 text-xs text-error">{ipError}</p>}
        {ipResult && (
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(ipResult).map(([key, value]) => (
              <div key={key} className="rounded-input border border-outline-variant bg-surface-container-high px-3 py-2">
                <dt className="font-mono text-[10px] uppercase tracking-wider text-surface-variant">{key}</dt>
                <dd className="truncate text-[13px] font-medium text-on-surface" title={value}>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-container-high text-primary">
              <FileCode2 className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <div className="text-[13.5px] font-semibold text-on-surface">Response Format</div>
              <div className="text-xs text-on-surface-variant">Included in every response</div>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-input border border-outline-variant bg-surface-container-lowest">
            <div className="flex items-center gap-2 border-b border-outline-variant px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-error/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
            </div>
            <pre
              className="overflow-x-auto border-0 bg-transparent p-3.5 font-mono text-[11.5px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightJson(sampleResponseJson) }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-container-high text-primary">
              <AlertTriangle className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <div className="text-[13.5px] font-semibold text-on-surface">Error Codes</div>
              <div className="text-xs text-on-surface-variant">HTTP status reference</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {ERROR_CODES.map((e) => (
              <div key={e.code} className="flex items-start gap-3 rounded-input px-1 py-1">
                <span className={`shrink-0 rounded-badge border px-2 py-0.5 font-mono text-[11px] font-semibold ${toneClass[e.tone]}`}>
                  {e.code}
                </span>
                <div>
                  <div className="text-[13px] font-semibold text-on-surface">{e.label}</div>
                  <div className="text-xs text-on-surface-variant">{e.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          Categories
          <span className="h-px flex-1 bg-hairline" />
        </h2>
        <p className="text-[13px] text-on-surface-variant">
          Browse endpoints from the sidebar — pick a category to expand it and open any endpoint&apos;s dedicated
          page.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {buckets.map((b) => (
            <div
              key={b.name}
              className="flex flex-col items-center gap-1 rounded-xl border border-hairline bg-surface-container-low px-3 py-4 text-center"
            >
              <span className="text-lg font-bold text-on-surface">{b.items.length}</span>
              <span className="text-xs font-medium capitalize text-on-surface-variant">{b.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
