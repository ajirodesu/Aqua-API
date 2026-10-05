import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Github,
  Layers,
  Menu,
  Rocket,
  ScrollText,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
  Unlock,
  Zap,
} from 'lucide-react';
import { useAppData } from '../lib/appData';
import { NotificationBell } from '../components/NotificationBell';
import { PageLoader } from '../components/PageLoader';

const FEATURES = [
  {
    icon: Zap,
    name: 'Lightning Fast',
    body: 'Optimized endpoints with low-latency responses for seamless integration.',
  },
  {
    icon: Unlock,
    name: 'No Auth Required',
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
    title: 'Select a Category',
    body: 'Browse API groups in the docs sidebar to find the right endpoint.',
  },
  {
    title: 'Review Documentation',
    body: 'Examine parameters, response shapes, and code examples for each endpoint.',
  },
  {
    title: 'Implement & Integrate',
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

const CTA_CHECKS = ['No Auth', '100% Free', 'JSON Responses', 'Always Online'];

const SECTION_LINKS = [
  { href: '#features', label: 'Features', icon: Sparkles },
  { href: '#getting-started', label: 'Getting Started', icon: Layers },
  { href: '#terms', label: 'Terms of Service', icon: ScrollText },
  { href: '#cta', label: 'Start Building', icon: Rocket },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">{children}</span>
    </div>
  );
}

export function Home() {
  const { config, totalEndpoints, buckets, loading } = useAppData();
  const year = new Date().getFullYear();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);

  useEffect(() => {
    if (drawerOpen) {
      setDrawerMounted(true);
    } else if (drawerMounted) {
      const t = setTimeout(() => setDrawerMounted(false), 300);
      return () => clearTimeout(t);
    }
  }, [drawerOpen, drawerMounted]);

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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface text-on-surface">
      {size && (
        <style>{`
          .hero-gif { width: ${size.mobile}; }
          @media (min-width: 640px) { .hero-gif { width: ${size.tablet}; } }
          @media (min-width: 1024px) { .hero-gif { width: ${size.desktop}; } }
        `}</style>
      )}

      <header className="sticky top-0 z-sticky flex h-14 shrink-0 items-center gap-2 border-b border-hairline bg-surface-container-low px-5 transition-colors duration-fast ease-standard">
        <div className="relative z-10 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setDrawerOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
            aria-label="Toggle navigation menu"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
          <span className="hidden truncate px-1 text-base font-semibold tracking-tight md:inline">
            {config?.name ?? 'Aqua APIs'}
          </span>
        </div>
        {/* Mobile: brand — absolutely centred */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center md:hidden">
          <span className="truncate px-14 text-base font-semibold tracking-tight">
            {config?.name ?? 'Aqua APIs'}
          </span>
        </div>
        <div className="relative z-10 ml-auto flex shrink-0 items-center gap-1">
          <NotificationBell />
        </div>
      </header>

      {drawerMounted && (
        <div className="fixed inset-0 z-drawer">
          <div
            className={`absolute inset-0 bg-scrim/50 transition-opacity duration-normal ease-standard ${
              drawerOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className={`absolute inset-y-0 left-0 flex w-[85%] max-w-xs origin-left flex-col border-r border-hairline bg-surface transition-transform duration-medium-2 ease-standard ${
              drawerOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex h-14 shrink-0 items-center border-b border-hairline px-6 text-[17px] font-semibold tracking-tight">
              {config?.name ?? 'Aqua APIs'}
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pt-4">
              {SECTION_LINKS.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  onClick={() => setDrawerOpen(false)}
                  className="tactile-press flex h-11 items-center gap-3 rounded-input border border-transparent px-3 text-sm font-medium text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
                >
                  <s.icon className="h-4 w-4 text-primary" strokeWidth={2} />
                  {s.label}
                </a>
              ))}
            </nav>
            <div className="border-t border-hairline p-3">
              <Link to="/docs" onClick={() => setDrawerOpen(false)} className="btn-primary h-12 w-full rounded-lg text-[14px]">
                <BookOpen className="h-4 w-4" />
                Go to Docs
              </Link>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-24">
          <PageLoader label="Loading endpoints…" />
        </div>
      ) : (
        <>
          <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-10 px-5 pb-12 pt-6 lg:max-w-6xl lg:px-8">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <section className="flex flex-col gap-5 pt-2">
                {gif && <img src={gif} alt="" className="hero-gif animate-fade-in-up rounded-xl" />}
                <Eyebrow>{config?.header.status ?? 'Online • Always Free'}</Eyebrow>
                <h1 className="text-3xl font-bold leading-[1.18] tracking-tight text-on-surface lg:text-[42px]">
                  Welcome to {config?.name ?? 'Aqua APIs'}
                </h1>
                <p className="max-w-lg text-[14px] leading-relaxed text-on-surface-variant">
                  {config?.description ?? 'A fast, friendly REST API playground.'}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <div className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface-container-high px-3 py-1.5 text-[12px] font-medium text-on-surface-variant">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    <span>{totalEndpoints} Endpoints</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface-container-high px-3 py-1.5 text-[12px] font-medium text-on-surface-variant">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    <span>{buckets.length} Categories</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface-container-high px-3 py-1.5 text-[12px] font-medium text-on-surface-variant">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <span>Always Free</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Link to="/docs" className="btn-primary h-12 w-full rounded-lg text-[14px]">
                    <BookOpen className="h-4 w-4" />
                    View Full Docs
                  </Link>
                  <a href="#features" className="btn-secondary h-12 w-full rounded-lg text-[14px]">
                    Explore Features
                    <ArrowRight className="h-4 w-4 rotate-90" />
                  </a>
                </div>
              </section>

              <div className="hidden lg:block">
                <div className="overflow-hidden rounded-xl border border-hairline bg-surface-container-low">
                  <div className="flex items-center gap-3 border-b border-outline-variant px-4 py-3">
                    <span className="select-none font-mono text-xs text-surface-variant">
                      {(config?.name ?? 'aqua').toLowerCase()} — api manager
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      Online
                    </span>
                  </div>
                  <div className="flex flex-col p-4">
                    <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-surface-variant">
                      Active Categories
                    </p>
                    {buckets.slice(0, 4).map((b) => (
                      <div
                        key={b.name}
                        className="flex items-center justify-between border-b border-outline-variant px-1 py-2.5 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface-container-high">
                            <Layers className="h-4 w-4 text-primary" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold capitalize text-on-surface">{b.name}</p>
                            <p className="font-mono text-xs text-surface-variant">{b.items.length} endpoints</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          Online
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <section id="features" className="flex scroll-mt-16 flex-col gap-4">
              <div className="flex flex-col gap-1.5 pb-1">
                <Eyebrow>Capabilities</Eyebrow>
                <h2 className="text-[22px] font-bold tracking-tight text-on-surface">Key Features</h2>
                <p className="max-w-xl text-[13px] leading-normal text-on-surface-variant">
                  Everything you need to ship integrations fast — without compromises.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((f) => (
                  <article
                    key={f.name}
                    className="flex items-start gap-3.5 rounded-xl border border-hairline bg-surface-container-low p-4 transition-colors duration-fast active:bg-surface-container-highest active:opacity-[0.85]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface-container-high">
                      <f.icon className="h-5 w-5 text-primary" strokeWidth={2} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-[15px] font-semibold tracking-tight text-on-surface">{f.name}</h3>
                      <p className="text-[13px] leading-snug text-on-surface-variant">{f.body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="getting-started" className="flex scroll-mt-16 flex-col gap-4">
              <div className="flex flex-col gap-1.5 pb-1">
                <Eyebrow>Quickstart</Eyebrow>
                <h2 className="text-[22px] font-bold tracking-tight text-on-surface">Getting Started</h2>
                <p className="max-w-xl text-[13px] leading-normal text-on-surface-variant">
                  From discovery to production in three steps.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {STEPS.map((step, i) => (
                  <article
                    key={step.title}
                    className="flex items-start gap-3.5 rounded-xl border border-hairline bg-surface-container-low p-4"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 font-mono text-[13px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-[15px] font-semibold tracking-tight text-on-surface">{step.title}</h3>
                      <p className="text-[13px] leading-snug text-on-surface-variant">{step.body}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="terms" className="flex scroll-mt-16 flex-col gap-4">
              <div className="flex flex-col gap-1.5 pb-1">
                <Eyebrow>Legal</Eyebrow>
                <h2 className="text-[22px] font-bold tracking-tight text-on-surface">Terms of Service</h2>
              </div>
              <div className="rounded-xl border border-hairline bg-surface-container-low p-4">
                <p className="text-[13px] leading-relaxed text-on-surface-variant">
                  By using <strong className="font-semibold text-on-surface">{config?.name ?? 'this API'}</strong>,
                  you agree to the following:
                </p>
                <ul className="mt-3 space-y-2.5">
                  {TERMS.map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-on-surface-variant">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                      {t}
                    </li>
                  ))}
                </ul>
                {config?.telegram && (
                  <p className="mt-3 text-[13px] text-surface-variant">
                    For full terms, contact us via our{' '}
                    <a
                      href={config.telegram}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary hover:text-primary/80"
                    >
                      Telegram channel
                    </a>
                    .
                  </p>
                )}
              </div>
            </section>

            <section
              id="cta"
              className="flex scroll-mt-16 flex-col gap-4 rounded-2xl border border-hairline bg-surface-container-low p-5 text-center"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Get Started
                </span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-2 text-xs font-medium text-success">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-success" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  All systems operational
                </div>
                <h2 className="text-xl font-bold tracking-tight text-on-surface">Start Building Today</h2>
                <p className="mx-auto max-w-lg text-[13px] leading-relaxed text-on-surface-variant">
                  Join developers worldwide using our APIs. Instant access to robust endpoints backed by
                  comprehensive documentation.
                </p>
              </div>
              <div className="pt-1">
                <Link to="/docs" className="btn-primary h-12 w-full rounded-lg text-[14px]">
                  <Terminal className="h-4 w-4" />
                  Open Documentation
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-outline-variant pt-4">
                {CTA_CHECKS.map((c) => (
                  <div key={c} className="flex items-center gap-2 text-xs text-on-surface-variant">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    {c}
                  </div>
                ))}
              </div>
            </section>
          </main>

          <footer className="border-t border-hairline bg-surface">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-5 py-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-on-surface">About</h3>
                <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-on-surface-variant">
                  An interactive API platform for seamless endpoint exploration and real-time integration
                  testing.
                </p>
              </div>
              <div className="sm:text-right">
                <h3 className="text-[13px] font-semibold uppercase tracking-wide text-on-surface">Connect</h3>
                <div className="mt-2 flex gap-1 sm:justify-end">
                  {config?.telegram && (
                    <a
                      href={config.telegram}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
                      aria-label="Telegram"
                    >
                      <Send className="h-4 w-4" />
                    </a>
                  )}
                  {config?.messenger && (
                    <a
                      href={config.messenger}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
                      aria-label="Messenger"
                    >
                      <span className="text-xs font-bold">M</span>
                    </a>
                  )}
                  {config?.github && (
                    <a
                      href={config.github}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors duration-fast hover:bg-surface-container-high hover:text-on-surface"
                      aria-label="GitHub"
                    >
                      <Github className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <p className="pb-6 text-center text-xs text-surface-variant">
              © {year} {config?.name ?? 'API'}. All rights reserved. Built by {config?.operator ?? 'AjiroDesu'}.
            </p>
          </footer>
        </>
      )}
    </div>
  );
}
