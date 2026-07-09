import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Copy,
  FileCode2,
  Globe,
  Layers,
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
  ok: 'bg-emerald-500/10 text-emerald-400',
  warn: 'bg-amber-500/10 text-amber-400',
  err: 'bg-rose-500/10 text-rose-400',
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

export function DocsOverview() {
  const { config, buckets, totalEndpoints } = useAppData();
  const [copiedBase, setCopiedBase] = useState(false);
  const [copiedExample, setCopiedExample] = useState(false);

  // Pick a random endpoint (across every category) to showcase, rather than
  // always the first item of the first bucket. Re-rolled once per mount —
  // memoized off `buckets` so it doesn't reshuffle on every re-render (e.g.
  // when the "Copied" state toggles).
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

  return (
    <div className="animate-fade-up space-y-10">
      {size && (
        <style>{`
          .docs-hero-gif { width: ${size.mobile}; }
          @media (min-width: 640px) { .docs-hero-gif { width: ${size.tablet}; } }
          @media (min-width: 1024px) { .docs-hero-gif { width: ${size.desktop}; } }
        `}</style>
      )}

      {/* HERO */}
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        {gif && <img src={gif} alt="" className="docs-hero-gif shrink-0 rounded-2xl" loading="lazy" />}
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
            {config?.name ?? 'Aqua APIs'}
          </h1>
          <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-slate-400">
            {config?.description ?? 'Simple and easy to use.'}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            {config?.header.status ?? 'Online'}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="card flex flex-col items-center gap-1.5 p-4 text-center">
          <Plug className="h-4 w-4 text-aqua-400" strokeWidth={2} />
          <span className="text-lg font-extrabold text-white">{totalEndpoints}</span>
          <span className="text-[11px] font-medium text-slate-500">Total APIs</span>
        </div>
        <div className="card flex flex-col items-center gap-1.5 p-4 text-center">
          <Layers className="h-4 w-4 text-aqua-400" strokeWidth={2} />
          <span className="text-lg font-extrabold text-white">{buckets.length}</span>
          <span className="text-[11px] font-medium text-slate-500">Categories</span>
        </div>
        <div className="card flex flex-col items-center gap-1.5 p-4 text-center">
          <ShieldCheck className="h-4 w-4 text-aqua-400" strokeWidth={2} />
          <span className="text-lg font-extrabold text-white">Free</span>
          <span className="text-[11px] font-medium text-slate-500">No Auth</span>
        </div>
        <div className="card flex flex-col items-center gap-1.5 p-4 text-center">
          <Zap className="h-4 w-4 text-aqua-400" strokeWidth={2} />
          <span className="text-lg font-extrabold text-white">JSON</span>
          <span className="text-[11px] font-medium text-slate-500">Responses</span>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      {/* BASE URL + EXAMPLE */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-aqua-500/10 text-aqua-400">
              <Globe className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <div className="text-[13.5px] font-bold text-white">Base URL</div>
              <div className="text-[12px] text-slate-500">Root for all API calls</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12px] text-slate-300">
              {baseUrl}
            </code>
            <button
              type="button"
              onClick={() => copy(baseUrl, setCopiedBase)}
              className="shrink-0 text-slate-400 transition-colors hover:text-white"
              aria-label="Copy base URL"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          {copiedBase && <p className="mt-1.5 text-[11px] text-aqua-400">Copied</p>}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-aqua-500/10 text-aqua-400">
              <FileCode2 className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <div className="text-[13.5px] font-bold text-white">Example Endpoint</div>
              <div className="text-[12px] text-slate-500">Try a live sample call</div>
            </div>
          </div>

          {exampleEndpoint && (
            <>
              <div className="mt-4 flex items-center gap-2">
                <MethodBadge method={exampleEndpoint.methods[0]} />
                <span className="truncate font-mono text-[11px] text-slate-500">
                  {exampleEndpoint.path.split('?')[0]}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12px] text-slate-300">
                  {exampleUrl}
                </code>
                <button
                  type="button"
                  onClick={() => copy(exampleUrl, setCopiedExample)}
                  className="shrink-0 text-slate-400 transition-colors hover:text-white"
                  aria-label="Copy example URL"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              {copiedExample && <p className="mt-1.5 text-[11px] text-aqua-400">Copied</p>}
              <Link to={exampleHref} className="btn-primary mt-3 w-full !py-2 text-[13px]">
                <Play className="h-3 w-3 fill-current" />
                Try it
              </Link>
            </>
          )}
        </div>
      </div>

      {/* RESPONSE FORMAT + ERROR CODES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-aqua-500/10 text-aqua-400">
              <FileCode2 className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <div className="text-[13.5px] font-bold text-white">Response Format</div>
              <div className="text-[12px] text-slate-500">Included in every response</div>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#0d1420]">
            <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            </div>
            <pre
              className="overflow-x-auto p-3.5 font-mono text-[11.5px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightJson(sampleResponseJson) }}
            />
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-aqua-500/10 text-aqua-400">
              <AlertTriangle className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <div className="text-[13.5px] font-bold text-white">Error Codes</div>
              <div className="text-[12px] text-slate-500">HTTP status reference</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {ERROR_CODES.map((e) => (
              <div key={e.code} className="flex items-start gap-3 rounded-lg px-1 py-1">
                <span className={`pill shrink-0 font-mono text-[11px] ${toneClass[e.tone]}`}>{e.code}</span>
                <div>
                  <div className="text-[13px] font-semibold text-slate-200">{e.label}</div>
                  <div className="text-[12px] text-slate-500">{e.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CATEGORY SUMMARY */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-slate-500">
          Categories
          <span className="h-px flex-1 bg-white/10" />
        </h2>
        <p className="text-[13px] text-slate-500">
          Browse endpoints from the sidebar — pick a category to expand it and open any endpoint's dedicated
          page.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {buckets.map((b) => (
            <div key={b.name} className="card flex flex-col items-center gap-1 px-3 py-4 text-center">
              <span className="text-lg font-extrabold text-aqua-400">{b.items.length}</span>
              <span className="text-[12px] font-medium capitalize text-slate-400">{b.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}