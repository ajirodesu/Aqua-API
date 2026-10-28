import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Copy, MapPin, Play } from 'lucide-react';
import { useAppData, slugify } from '../lib/appData';
import { MethodBadge } from '../components/MethodBadge';
import { GifFrame } from '../components/GifFrame';
import { API_ORIGIN, endpointUrl, fetchTopEndpoints, type TopEndpoint } from '../lib/api';
import { highlightJson } from '../lib/jsonHighlight';
import { H_SHELL_SCOPE, H_STATUS_SQUARE } from '../lib/shell';
import { cn } from '../lib/cn';

const ERROR_CODES = [
  { code: 200, tone: 'ok', label: 'OK', desc: 'Request successful' },
  { code: 400, tone: 'warn', label: 'Bad Request', desc: 'Missing or invalid parameter' },
  { code: 404, tone: 'warn', label: 'Not Found', desc: 'Endpoint does not exist' },
  { code: 429, tone: 'warn', label: 'Rate Limited', desc: 'Too many requests' },
  { code: 500, tone: 'err', label: 'Server Error', desc: 'Internal or upstream failure' },
];

const toneClass: Record<string, string> = {
  ok: 'border-success/30 bg-success-container text-on-success-container',
  warn: 'border-warning/30 bg-warning-container text-on-warning-container',
  err: 'border-error/30 bg-error-container text-on-error-container',
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
  const [ipInput, setIpInput] = useState('');
  const [ipResult, setIpResult] = useState<Record<string, string> | null>(null);
  const [ipError, setIpError] = useState<string | null>(null);
  const [ipChecking, setIpChecking] = useState(false);
  // Database-backed usage ranking — independent from the catalog load so a
  // counter failure can never break the page (section simply stays quiet).
  const [topEndpoints, setTopEndpoints] = useState<TopEndpoint[] | null>(null);
  const [leaderboardEnabled, setLeaderboardEnabled] = useState(config?.leaderboardEnabled !== false);

  useEffect(() => {
    let cancelled = false;

    const loadLeaderboard = () => {
      fetchTopEndpoints(5)
        .then((d) => {
          if (cancelled) return;
          setLeaderboardEnabled(d.enabled !== false);
          setTopEndpoints(Array.isArray(d.top) ? d.top : []);
        })
        .catch(() => {
          if (!cancelled) setTopEndpoints([]);
        });
    };

    loadLeaderboard();
    // Admin settings / reset dispatch this after saving so an already-open
    // docs tab reflects the change without a full reload.
    window.addEventListener('aqua:leaderboard-updated', loadLeaderboard);
    return () => {
      cancelled = true;
      window.removeEventListener('aqua:leaderboard-updated', loadLeaderboard);
    };
  }, []);

  const topWithMeta = useMemo(() => {
    if (topEndpoints === null) return null;
    const flat = buckets.flatMap((b) => b.items.map((i) => ({ ...i, bucketName: b.name })));
    return topEndpoints
      .map((t, idx) => ({
        ...t,
        rank: idx + 1,
        meta: flat.find((i) => i.path.split('?')[0] === t.path),
      }))
      .filter((t): t is typeof t & { meta: NonNullable<typeof t.meta> } => t.meta !== undefined)
      .slice(0, 5);
  }, [topEndpoints, buckets]);

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

  // Keep the printed ledger sequential when the usage section is hidden.
  const sectionNo = (n: number) =>
    String(n - (leaderboardEnabled ? 0 : 1)).padStart(2, '0');

  const gif = config?.header.imageSrc?.[0];
  const size = config?.header.imageSize;
  const status = config?.header.status ?? 'Online';

  const facts = [
    { label: 'ENDPOINTS', value: String(totalEndpoints), sub: 'documented' },
    { label: 'CATEGORIES', value: String(buckets.length), sub: 'grouped' },
    { label: 'ACCESS', value: 'Open', sub: 'no key required' },
    { label: 'FORMAT', value: 'JSON', sub: 'utf-8' },
  ];

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
    <div className="flex animate-fade-in-up flex-col">
      {size && (
        <style>{`
          .docs-hero-gif-frame { width: ${size.mobile}; }
          @media (min-width: 640px) { .docs-hero-gif-frame { width: ${size.tablet}; } }
          @media (min-width: 1024px) { .docs-hero-gif-frame { width: ${size.desktop}; } }
        `}</style>
      )}

      {/* ── 00 / Reference — masthead + fact table ─────────────────────── */}
      <header className="border-b border-hairline pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className={H_SHELL_SCOPE}>AQUA / API REFERENCE</span>
          <span className={cn(H_SHELL_SCOPE, 'text-right')}>REV 02 · REST · JSON</span>
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 lg:col-span-8">
            <div className="rule-label max-w-[16rem]">00 / DOCUMENTATION</div>

            <h1 className="mt-6 break-words font-brand text-display-sm uppercase text-on-surface md:text-display-md">
              {config?.name ?? 'Aqua APIs'}
            </h1>

            <p className="mt-4 max-w-[60ch] text-body-md text-on-surface-variant">
              {config?.description ??
                'Simple and easy to use. Every route is documented, testable in place, and shipped without a key.'}
            </p>

            <p className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-success">
              <span className={cn(H_STATUS_SQUARE, 'bg-success')} aria-hidden="true" />
              {status}
            </p>
          </div>

          {gif && (
            <GifFrame
              src={gif}
              className="docs-hero-gif-frame min-w-0 lg:col-span-4"
              loading="lazy"
            />
          )}
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-px border border-hairline bg-hairline sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0 bg-surface px-4 py-3.5">
              <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant/80">
                {fact.label}
              </dt>
              <dd className="mt-1 break-words font-brand text-headline-sm uppercase text-on-surface">{fact.value}</dd>
              <dd className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-on-surface-variant/70">
                {fact.sub}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      {/* ── 01 / Usage — top endpoints ledger ──────────────────────────── */}
      {leaderboardEnabled && (
        <section aria-labelledby="usage-title" className="border-b border-hairline py-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="rule-label max-w-[14rem]">{sectionNo(1)} / USAGE</div>
              <h2 id="usage-title" className="mt-3 font-brand text-headline-lg uppercase text-on-surface">
                Most requested
              </h2>
            </div>
            <span className={H_SHELL_SCOPE}>LIVE COUNTER</span>
          </div>

          {topWithMeta === null ? (
            <p className="mt-5 border-t border-hairline pt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface-variant">
              Reading counters…
            </p>
          ) : topWithMeta.length === 0 ? (
            <p className="mt-5 border-t border-hairline pt-4 text-body-sm text-on-surface-variant">
              No usage recorded yet — the first call will appear here.
            </p>
          ) : (
            <ol className="mt-5 border-t border-hairline">
              {topWithMeta.map(({ rank, count, meta }) => (
                <li key={meta.path}>
                  <Link
                    to={`/docs/${slugify(meta.bucketName)}/${slugify(meta.name)}`}
                    className="group grid grid-cols-[2rem_auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-hairline py-3 transition-colors duration-fast hover:bg-surface-container-low focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                  >
                    <span
                      aria-hidden="true"
                      className="font-mono text-[10px] tabular-nums tracking-[0.08em] text-on-surface-variant/80"
                    >
                      {String(rank).padStart(2, '0')}
                    </span>
                    <MethodBadge method={meta.methods[0]} />
                    <span className="min-w-0">
                      <span className="block truncate font-brand text-body-md uppercase tracking-[0.04em] text-on-surface">
                        {meta.name}
                      </span>
                      <span className="block truncate font-mono text-[10px] tracking-[0.02em] text-on-surface-variant/80">
                        {meta.path.split('?')[0]}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] text-on-surface-variant">
                      {count} {count === 1 ? 'call' : 'calls'}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {/* ── 02 / 03 — base URL + sample route ──────────────────────────── */}
      <section className="grid border-b border-hairline md:grid-cols-2">
        <div className="min-w-0 py-8 md:pr-8 lg:pr-10">
          <div className="rule-label max-w-[12rem]">{sectionNo(2)} / BASE URL</div>
          <h2 className="mt-3 font-brand text-headline-sm uppercase text-on-surface">Root address</h2>
          <p className="mt-2 max-w-[44ch] text-body-sm text-on-surface-variant">
            Every documented path is appended to this origin.
          </p>

          <div className="mt-4 flex items-stretch border border-[var(--color-input-border)] bg-[var(--color-input-bg)]">
            <code className="scroll-visible-desktop min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-on-surface">
              {baseUrl}
            </code>
            <button
              type="button"
              onClick={() => copy(baseUrl, setCopiedBase)}
              className="flex shrink-0 items-center gap-1.5 border-l border-hairline px-3 font-mono text-[10px] uppercase tracking-[0.06em] text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
              aria-label="Copy base URL"
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
              {copiedBase ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="min-w-0 border-t border-hairline py-8 md:border-l md:border-t-0 md:pl-8 lg:pl-10">
          <div className="rule-label max-w-[12rem]">{sectionNo(3)} / SAMPLE ROUTE</div>
          <h2 className="mt-3 font-brand text-headline-sm uppercase text-on-surface">Live example</h2>

          {exampleEndpoint ? (
            <>
              <div className="mt-2 flex items-center gap-2">
                <MethodBadge method={exampleEndpoint.methods[0]} />
                <span className="min-w-0 truncate font-mono text-[11px] text-on-surface-variant">
                  {exampleEndpoint.path.split('?')[0]}
                </span>
              </div>

              <div className="mt-3 flex items-stretch border border-[var(--color-input-border)] bg-[var(--color-input-bg)]">
                <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-on-surface">
                  {exampleUrl}
                </code>
                <button
                  type="button"
                  onClick={() => copy(exampleUrl, setCopiedExample)}
                  className="flex shrink-0 items-center gap-1.5 border-l border-hairline px-3 font-mono text-[10px] uppercase tracking-[0.06em] text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                  aria-label="Copy example URL"
                >
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {copiedExample ? 'Copied' : 'Copy'}
                </button>
              </div>

              <Link to={exampleHref} className="btn-primary mt-3 w-full">
                <Play className="h-3 w-3 fill-current" strokeWidth={1.75} />
                Open endpoint
              </Link>
            </>
          ) : (
            <p className="mt-3 text-body-sm text-on-surface-variant">Catalog is loading…</p>
          )}
        </div>
      </section>

      {/* ── 04 / Network — IP checker ──────────────────────────────────── */}
      <section aria-labelledby="ip-title" className="border-b border-hairline py-8">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="min-w-0 lg:col-span-4">
            <div className="rule-label max-w-[12rem]">{sectionNo(4)} / NETWORK</div>
            <h2 id="ip-title" className="mt-3 font-brand text-headline-sm uppercase text-on-surface">
              IP checker
            </h2>
            <p className="mt-2 max-w-[40ch] text-body-sm text-on-surface-variant">
              Geolocation for any address. Leave the field empty to resolve your own public IP.
            </p>
            <Link
              to="/docs/tools/ipcheck"
              className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-primary transition-colors duration-fast hover:text-primary/80"
            >
              API reference
              <ArrowUpRight className="h-3 w-3" strokeWidth={1.75} />
            </Link>
          </div>

          <div className="min-w-0 lg:col-span-8">
            <form
              className="flex flex-col gap-2 sm:flex-row"
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
              <button
                type="submit"
                disabled={ipChecking}
                className="btn-primary min-h-10 shrink-0 !px-5"
              >
                {ipChecking ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-[1px] border border-on-primary/40 border-t-on-primary" />
                ) : (
                  <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
                {ipChecking ? 'Checking…' : 'Check IP'}
              </button>
            </form>

            {ipError && (
              <p className="mt-3 border border-error/30 bg-error-container/40 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.06em] text-error">
                {ipError}
              </p>
            )}

            {ipResult && (
              <dl className="mt-3 grid grid-cols-2 gap-px border border-hairline bg-hairline sm:grid-cols-3">
                {Object.entries(ipResult).map(([key, value]) => (
                  <div key={key} className="min-w-0 bg-surface-container-low px-3 py-2">
                    <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-on-surface-variant/80">{key}</dt>
                    <dd className="truncate font-mono text-[11px] text-on-surface" title={value}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </section>

      {/* ── 05 / 06 — payload + status reference ───────────────────────── */}
      <section className="grid border-b border-hairline md:grid-cols-2">
        <div className="min-w-0 py-8 md:pr-8 lg:pr-10">
          <div className="rule-label max-w-[12rem]">{sectionNo(5)} / PAYLOAD</div>
          <h2 className="mt-3 font-brand text-headline-sm uppercase text-on-surface">Response format</h2>
          <p className="mt-2 text-body-sm text-on-surface-variant">Included in every JSON response.</p>

          <div className="mt-4 overflow-hidden border border-hairline bg-surface-container-lowest">
            <div className="flex items-center justify-between gap-3 border-b border-hairline bg-surface-container-low px-3 py-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
                application/json
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant/70">utf-8</span>
            </div>
            <pre
              className="overflow-x-auto border-0 bg-transparent p-3.5 font-mono text-[11.5px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: highlightJson(sampleResponseJson) }}
            />
          </div>
        </div>

        <div className="min-w-0 border-t border-hairline py-8 md:border-l md:border-t-0 md:pl-8 lg:pl-10">
          <div className="rule-label max-w-[12rem]">{sectionNo(6)} / STATUS</div>
          <h2 className="mt-3 font-brand text-headline-sm uppercase text-on-surface">Error codes</h2>
          <p className="mt-2 text-body-sm text-on-surface-variant">HTTP status reference.</p>

          <dl className="mt-4 border-t border-hairline">
            {ERROR_CODES.map((e) => (
              <div key={e.code} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-3 border-b border-hairline py-2.5">
                <dt>
                  <span
                    className={`inline-flex min-w-[3rem] justify-center rounded-badge border px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums ${toneClass[e.tone]}`}
                  >
                    {e.code}
                  </span>
                </dt>
                <dd className="min-w-0">
                  <span className="block font-brand text-body-md uppercase tracking-[0.04em] text-on-surface">{e.label}</span>
                  <span className="block text-body-sm text-on-surface-variant">{e.desc}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── 07 / Categories — browse ledger ────────────────────────────── */}
      <section aria-labelledby="categories-title" className="py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="rule-label max-w-[14rem]">{sectionNo(7)} / CATEGORIES</div>
            <h2 id="categories-title" className="mt-3 font-brand text-headline-lg uppercase text-on-surface">
              Browse by group
            </h2>
          </div>
          <span className={H_SHELL_SCOPE}>{buckets.length} GROUPS</span>
        </div>

        <p className="mt-3 max-w-[56ch] text-body-sm text-on-surface-variant">
          Pick a group in the rail to expand it, then open any endpoint&apos;s dedicated page.
        </p>

        <div className="mt-5 border-t border-hairline">
          {buckets.map((bucket, index) => {
            const first = bucket.items[0];
            const href = first ? `/docs/${slugify(bucket.name)}/${slugify(first.name)}` : '/docs';
            return (
              <Link
                key={bucket.name}
                to={href}
                className="group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-hairline py-3 transition-colors duration-fast hover:bg-surface-container-low focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
              >
                <span
                  aria-hidden="true"
                  className="font-mono text-[10px] tabular-nums tracking-[0.08em] text-on-surface-variant/80"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-brand text-body-md uppercase tracking-[0.06em] text-on-surface">
                    {bucket.name}
                  </span>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.06em] text-on-surface-variant/80">
                    {bucket.items.length} {bucket.items.length === 1 ? 'endpoint' : 'endpoints'}
                  </span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 text-on-surface-variant/80 transition-transform duration-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  strokeWidth={1.75}
                />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
