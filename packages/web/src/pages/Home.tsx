import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Code2,
  Github,
  Lock,
  Menu,
  Send,
  ShieldCheck,
  Terminal,
  Unlock,
  X,
  Zap,
} from 'lucide-react';
import { useAppData, slugify } from '../lib/appData';
import { BrandIcon } from '../components/BrandIcon';
import { NotificationBell } from '../components/NotificationBell';
import { GifFrame } from '../components/GifFrame';
import { PageLoader } from '../components/PageLoader';
import { H_BRAND_TEXT, H_SHELL_SCOPE, H_STATUS_SQUARE, H_HEIGHT, H_PX } from '../lib/shell';
import { cn } from '../lib/cn';

const FEATURES = [
  {
    icon: Zap,
    name: 'Lightning fast',
    body: 'Optimized endpoints with low-latency responses for seamless integration.',
  },
  {
    icon: Unlock,
    name: 'No authentication',
    body: 'Instant access — no keys, no setup, zero overhead to get started.',
  },
  {
    icon: Code2,
    name: 'Clean JSON',
    body: 'Standardized JSON outputs with detailed docs and practical examples.',
  },
];

const STEPS = [
  {
    title: 'Select a category',
    body: 'Browse API groups in the docs rail to find the right endpoint.',
  },
  {
    title: 'Review the route',
    body: 'Examine parameters, response shapes, and code examples for each endpoint.',
  },
  {
    title: 'Implement & integrate',
    body: 'Fire HTTP requests and plug JSON responses directly into your application.',
  },
];

const TERMS = [
  'Use APIs responsibly in compliance with all applicable laws and regulations.',
  'Do not abuse the service or exceed established rate limits.',
  'We reserve the right to modify or discontinue the service at any time.',
  'API data and content are provided strictly for informational use.',
  'We disclaim all liability for damages arising from API usage.',
];

const CTA_CHECKS = ['No auth', '100% free', 'JSON responses', 'Always online'];

function MobileRow({ index, to, label, onNavigate }: { index: string; to: string; label: string; onNavigate: () => void }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="flex h-12 items-center gap-3 border-b border-hairline px-4 transition-colors duration-fast hover:bg-surface-container-high focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
    >
      <span className={cn('font-mono text-[10px] tabular-nums tracking-[0.08em] text-on-surface-variant')}>{index}</span>
      <span className="font-brand text-[15px] uppercase tracking-[0.14em] text-on-surface">{label}</span>
      <ChevronRight className="ml-auto h-3.5 w-3.5 text-on-surface-variant" aria-hidden="true" />
    </Link>
  );
}

export function Home() {
  const { config, totalEndpoints, buckets, loading } = useAppData();
  const year = new Date().getFullYear();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const gif = config?.header.imageSrc?.[0];
  const size = config?.header.imageSize;
  const name = config?.name ?? 'Aqua APIs';
  const operator = config?.operator ?? 'AjiroDesu';
  const statusLabel = config?.header.status ?? 'Online · Always free';

  const facts = [
    { label: 'ENDPOINTS', value: String(totalEndpoints) },
    { label: 'CATEGORIES', value: String(buckets.length) },
    { label: 'ACCESS', value: 'Open' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      {size && (
        <style>{`
          .hero-gif-frame { width: ${size.mobile}; }
          @media (min-width: 640px) { .hero-gif-frame { width: ${size.tablet}; } }
          @media (min-width: 1024px) { .hero-gif-frame { width: ${size.desktop}; } }
        `}</style>
      )}

      {/* ── Document masthead — flat ink, one hairline rule ─────────────── */}
      <header className="sticky top-0 z-[100] border-b border-hairline bg-surface">
        <nav
          className={cn('mx-auto flex max-w-[var(--layout-nav-max)] items-center gap-2.5', H_HEIGHT, H_PX)}
          aria-label="Main navigation"
        >
          <Link
            to="/"
            aria-label={`${name} home`}
            className="flex shrink-0 items-center text-primary transition-opacity duration-fast hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <BrandIcon className="h-5 w-5 rounded-[2px] object-contain" />
          </Link>

          <Link
            to="/"
            className={cn(H_BRAND_TEXT, 'text-on-surface transition-colors duration-fast hover:text-on-surface-variant focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary')}
          >
            AQUA
          </Link>

          <span aria-hidden="true" className="hidden h-3 w-px shrink-0 bg-hairline sm:block" />
          <span className={cn(H_SHELL_SCOPE, 'hidden sm:inline')}>API CONSOLE</span>

          <div className="ml-auto hidden items-center gap-1.5 md:flex">
            <span className={cn(H_SHELL_SCOPE, 'pr-1')}>ACCESS</span>
            <NotificationBell />
            <Link
              to="/docs"
              className="inline-flex min-h-8 items-center rounded-[var(--radius-button)] bg-primary px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-on-primary transition-colors duration-fast hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-surface"
            >
              Documentation
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-1 md:hidden">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={drawerOpen}
              className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-compact)] text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/[0.08] hover:text-on-surface"
            >
              {drawerOpen ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
            </button>
          </div>
        </nav>

        {drawerOpen && (
          <div
            role="dialog"
            aria-label="Mobile navigation"
            className="border-t border-hairline bg-surface-container-low md:hidden [animation:fade-in-down_120ms_var(--easing-standard)_both]"
          >
            <div className="mx-auto max-w-[var(--layout-nav-max)]">
              <MobileRow index="01" to="/docs" label="Documentation" onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* ── Strip masthead — three fields on one rule ─────────────────── */}
        <div className="border-b border-hairline">
          <div className="mx-auto flex w-full max-w-[var(--layout-nav-max)] items-center justify-between gap-4 px-[var(--layout-section-px)] py-2.5 md:grid md:grid-cols-3">
            <span className={H_SHELL_SCOPE}>AQUA / API MANUAL</span>
            <span className={cn(H_SHELL_SCOPE, 'hidden md:inline md:justify-self-center')}>REST · JSON</span>
            <span className={cn(H_SHELL_SCOPE, 'md:justify-self-end')}>REV 02</span>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[60vh] items-center justify-center px-6">
            <PageLoader label="Loading endpoints…" />
          </div>
        ) : (
          <>
            {/* ── 01 / Control surface ────────────────────────────────────── */}
            <section aria-labelledby="hero-title" className="border-b border-hairline">
              <div className="mx-auto w-full max-w-[var(--layout-nav-max)] px-[var(--layout-section-px)] py-12 md:py-20">
                <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
                  <div className="lg:col-span-7">
                    <div className="rule-label max-w-[16rem]">01 / CONTROL SURFACE</div>

                    <div className="[animation:fade-in-up_420ms_var(--easing-emphasized-decelerate)_both]">
                      <h1
                        id="hero-title"
                        className="mt-6 max-w-[18ch] break-words font-brand text-display-lg uppercase text-on-surface"
                      >
                        Every endpoint.
                        <br />
                        One sheet.
                      </h1>

                      <p className="mt-5 max-w-[52ch] text-body-lg text-on-surface-variant">
                        {config?.description ??
                          'A fast, friendly REST API playground with live documentation, an interactive tester, and no authentication.'}
                      </p>

                      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Link to="/docs" className="btn-primary min-h-12 px-5">
                          <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
                          Open documentation
                          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </Link>
                      </div>

                      <p className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant/80">
                        <span className={cn(H_STATUS_SQUARE, 'bg-success')} aria-hidden="true" />
                        {statusLabel}
                      </p>

                      <dl className="mt-8 grid max-w-md grid-cols-3 border-t border-hairline">
                        {facts.map((fact) => (
                          <div key={fact.label} className="min-w-0 border-r border-hairline pt-3 pr-4 last:border-r-0">
                            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-on-surface-variant/80">
                              {fact.label}
                            </dt>
                            <dd className="mt-1 break-words font-brand text-headline-sm uppercase text-on-surface">
                              {fact.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>

                  {/* Surface index — a reference table, not a card stack */}
                  <div className="lg:col-span-5 lg:border-l lg:border-hairline lg:pl-8">
                    {gif && (
                      <GifFrame
                        src={gif}
                        className="hero-gif-frame mb-7"
                        loading="eager"
                      />
                    )}

                    <div className="rule-label">SURFACE INDEX</div>

                    <ul className="mt-4 border-t border-hairline">
                      {buckets.slice(0, 6).map((bucket, index) => {
                        const first = bucket.items[0];
                        const href = first
                          ? `/docs/${slugify(bucket.name)}/${slugify(first.name)}`
                          : '/docs';
                        return (
                          <li key={bucket.name} className="border-b border-hairline last:border-b-0">
                            <Link
                              to={href}
                              className="group grid grid-cols-[2rem_1fr_auto] items-center gap-3 py-3 transition-colors duration-fast hover:bg-surface-container-low"
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
                                <span className="block font-mono text-[10px] uppercase tracking-[0.06em] text-on-surface-variant/85">
                                  {bucket.items.length} {bucket.items.length === 1 ? 'endpoint' : 'endpoints'}
                                </span>
                              </span>
                              <ArrowUpRight
                                aria-hidden="true"
                                strokeWidth={1.75}
                                className="h-3 w-3 text-on-surface-variant/80 transition-transform duration-fast group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                              />
                            </Link>
                          </li>
                        );
                      })}
                    </ul>

                    <p className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant/80">
                      <Lock aria-hidden="true" strokeWidth={1.75} className="h-3 w-3" />
                      Open access — no key required
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 02 / Capabilities ──────────────────────────────────────── */}
            <section id="capabilities" aria-labelledby="capabilities-title" className="border-b border-hairline">
              <div className="mx-auto w-full max-w-[var(--layout-nav-max)] px-[var(--layout-section-px)] py-[var(--layout-section-py-lg)]">
                <div className="rule-label">02 / CAPABILITIES</div>

                <h2
                  id="capabilities-title"
                  className="mt-6 max-w-[24ch] font-brand text-display-sm uppercase text-on-surface"
                >
                  Built for fast integrations.
                </h2>
                <p className="mt-4 max-w-[60ch] text-body-md text-on-surface-variant">
                  A compact public surface: every route is documented, testable in place, and shipped without a key.
                </p>

                <div className="mt-12 border-t border-hairline">
                  {FEATURES.map((feature, index) => (
                    <article
                      key={feature.name}
                      className="grid grid-cols-[2.5rem_1fr] items-baseline gap-x-6 gap-y-2 border-b border-hairline py-6 md:grid-cols-[4rem_15rem_1fr]"
                    >
                      <span
                        aria-hidden="true"
                        className="font-brand text-headline-lg tabular-nums text-on-surface-variant/80"
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <h3 className="flex items-center gap-2 font-brand text-headline-sm uppercase tracking-[0.06em] text-on-surface">
                        <feature.icon aria-hidden="true" strokeWidth={1.75} className="h-4 w-4 shrink-0 text-primary" />
                        {feature.name}
                      </h3>

                      <p className="col-start-2 max-w-[68ch] text-body-sm text-on-surface-variant md:col-start-3">
                        {feature.body}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            {/* ── 03 / Sequence ──────────────────────────────────────────── */}
            <section id="getting-started" aria-labelledby="sequence-title" className="border-b border-hairline">
              <div className="mx-auto w-full max-w-[var(--layout-nav-max)] px-[var(--layout-section-px)] py-[var(--layout-section-py-lg)]">
                <div className="rule-label">03 / SEQUENCE</div>

                <h2 id="sequence-title" className="mt-6 font-brand text-display-sm uppercase text-on-surface">
                  From discovery to first call.
                </h2>

                <ol className="mt-10 grid gap-0 divide-y divide-hairline border-t border-hairline md:grid-cols-3 md:divide-x md:divide-y-0">
                  {STEPS.map((step, index) => (
                    <li key={step.title} className="py-8 first:md:pl-0 last:md:pr-0 md:px-8 md:py-10">
                      <span aria-hidden="true" className="font-brand text-display-md leading-none text-primary/90">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <h3 className="mt-4 font-brand text-headline-sm uppercase text-on-surface">{step.title}</h3>
                      <p className="mt-2 text-body-sm text-on-surface-variant">{step.body}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            {/* ── 04 / Legal ─────────────────────────────────────────────── */}
            <section id="terms" aria-labelledby="terms-title" className="border-b border-hairline bg-surface-container-low">
              <div className="mx-auto w-full max-w-[var(--layout-nav-max)] px-[var(--layout-section-px)] py-[var(--layout-section-py-lg)]">
                <div className="rule-label">04 / LEGAL</div>

                <h2 id="terms-title" className="mt-6 font-brand text-display-sm uppercase text-on-surface">
                  Terms of service.
                </h2>
                <p className="mt-4 max-w-[52ch] text-body-md text-on-surface-variant">
                  By using {name}, you agree to the following operational terms.
                </p>

                <ul className="mt-10 border-t border-hairline">
                  {TERMS.map((term, index) => (
                    <li
                      key={term}
                      className="grid grid-cols-[2.5rem_1fr] items-baseline gap-x-6 gap-y-1 border-b border-hairline py-4"
                    >
                      <span aria-hidden="true" className="font-mono text-[10px] tabular-nums tracking-[0.08em] text-on-surface-variant/80">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="flex items-start gap-2.5 text-body-sm text-on-surface-variant">
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.75} />
                        {term}
                      </span>
                    </li>
                  ))}
                </ul>

                {config?.telegram && (
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.08em] text-on-surface-variant">
                    Full terms via the{' '}
                    <a
                      href={config.telegram}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
                    >
                      Telegram channel
                    </a>
                    .
                  </p>
                )}
              </div>
            </section>

            {/* ── 05 / Start ─────────────────────────────────────────────── */}
            <section id="start" aria-labelledby="start-title" className="border-b border-hairline">
              <div className="mx-auto grid w-full max-w-[var(--layout-nav-max)] gap-8 px-[var(--layout-section-px)] py-[var(--layout-section-py-lg)] md:grid-cols-12 md:items-end">
                <div className="md:col-span-7">
                  <div className="rule-label">05 / START</div>

                  <h2
                    id="start-title"
                    className="mt-6 max-w-[20ch] font-brand text-display-sm uppercase text-on-surface"
                  >
                    Run your first call.
                  </h2>
                  <p className="mt-4 max-w-[52ch] text-body-md text-on-surface-variant">
                    Open the reference, pick a route, and send a live request. No account, no token, no setup.
                  </p>
                  <p className="mt-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-success">
                    <span className={cn(H_STATUS_SQUARE, 'bg-success')} aria-hidden="true" />
                    All systems operational
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row md:col-span-5 md:justify-end">
                  <Link to="/docs" className="btn-primary min-h-12 px-5">
                    <Terminal className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Open documentation
                  </Link>
                </div>
              </div>

              <div className="mx-auto w-full max-w-[var(--layout-nav-max)] px-[var(--layout-section-px)] pb-10">
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-hairline pt-5">
                  {CTA_CHECKS.map((check) => (
                    <span
                      key={check}
                      className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface-variant"
                    >
                      <CheckCircle2 className="h-3 w-3 text-success" strokeWidth={1.75} />
                      {check}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* ── Colophon ────────────────────────────────────────────────────── */}
      <footer className="border-t border-hairline bg-surface">
        <div className="mx-auto max-w-[var(--layout-nav-max)] px-4 py-10 md:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2">
                <BrandIcon className="h-4 w-4 rounded-[2px] object-contain opacity-80" />
                <span className={cn(H_BRAND_TEXT, 'text-on-surface')}>AQUA</span>
              </div>
              <p className="mt-3 max-w-xs text-body-sm text-on-surface-variant">
                {config?.description ?? 'An interactive API platform for endpoint exploration and real-time testing.'}
              </p>
              <p className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-on-surface-variant/85">
                <span className={cn(H_STATUS_SQUARE, 'bg-success')} aria-hidden="true" />
                {statusLabel} · {totalEndpoints} endpoints
              </p>
            </div>

            <div>
              <h2 className="rule-label">DOCUMENTATION</h2>
              <ul className="mt-3 space-y-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-on-surface-variant">
                <li>
                  <Link to="/docs" className="transition-colors hover:text-on-surface">
                    API reference
                  </Link>
                </li>
                <li>
                  <a href="#capabilities" className="transition-colors hover:text-on-surface">
                    Capabilities
                  </a>
                </li>
                <li>
                  <a href="#terms" className="transition-colors hover:text-on-surface">
                    Terms
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="rule-label">CONNECT</h2>
              <ul className="mt-3 space-y-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-on-surface-variant">
                {config?.telegram && (
                  <li>
                    <a
                      href={config.telegram}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 transition-colors hover:text-on-surface"
                    >
                      <Send className="h-3 w-3" strokeWidth={1.75} />
                      Telegram
                    </a>
                  </li>
                )}
                {config?.messenger && (
                  <li>
                    <a
                      href={config.messenger}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 transition-colors hover:text-on-surface"
                    >
                      <span className="flex h-3 w-3 items-center justify-center text-[8px] font-bold">M</span>
                      Messenger
                    </a>
                  </li>
                )}
                {config?.github && (
                  <li>
                    <a
                      href={config.github}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 transition-colors hover:text-on-surface"
                    >
                      <Github className="h-3 w-3" strokeWidth={1.75} />
                      GitHub
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex items-center justify-between gap-3 border-t border-hairline pt-4">
            <span className={H_SHELL_SCOPE}>© {year} {name}</span>
            <span className={cn(H_SHELL_SCOPE, 'text-right')}>BUILT BY {operator}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
