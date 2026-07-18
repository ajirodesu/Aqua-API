import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Facebook,
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
import { useScrolled } from '../lib/useScrolled';
import { NotificationBell } from '../components/NotificationBell';

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

// Sections the hamburger menu can jump to, in page order.
const SECTION_LINKS = [
  { href: '#features', label: 'Features', icon: Sparkles },
  { href: '#getting-started', label: 'Getting Started', icon: Layers },
  { href: '#terms', label: 'Terms of Service', icon: ScrollText },
  { href: '#cta', label: 'Start Building', icon: Rocket },
];

export function Home() {
  const { config, totalEndpoints, buckets, loading } = useAppData();
  const year = new Date().getFullYear();
  const scrolled = useScrolled();
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

  // Lock background scroll while the nav drawer is open — needed now that
  // the page scrolls natively (see the layout note below) instead of being
  // trapped in its own overflow-hidden region.
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
    // Normal document flow (min-height only, no fixed height/overflow-hidden
    // shell) so the page itself scrolls and the mobile browser's own chrome
    // — the URL bar, Brave's bottom toolbar, etc. — can collapse on scroll
    // the way it does on an ordinary page, for a fuller-screen feel.
    <div className="flex min-h-[100dvh] flex-col bg-surface">      {size && (
        <style>{`
          .hero-gif { width: ${size.mobile}; }
          @media (min-width: 640px) { .hero-gif { width: ${size.tablet}; } }
          @media (min-width: 1024px) { .hero-gif { width: ${size.desktop}; } }
        `}</style>
      )}

      {/* HEADER — same height/style/behavior as the docs TopBar, but the
          hamburger opens a menu for this page's own sections + a Docs link,
          since the landing page has no persistent sidebar of its own. */}
      <header
        className={`sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 px-3 transition-all duration-300 ease-ios sm:px-5 ${
          scrolled ? 'glass border-b' : 'border-b border-transparent bg-surface'
        }`}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition-colors duration-200 hover:bg-white/10 active:scale-90"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-5 w-5" strokeWidth={2.2} />
        </button>

        <Link
          to="/"
          className={`absolute left-1/2 flex -translate-x-1/2 items-center gap-2 font-display font-extrabold text-white transition-opacity duration-300 ease-ios lg:static lg:left-auto lg:translate-x-0 ${
            scrolled ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <span className="text-[15px]">{config?.name ?? 'Aqua APIs'}</span>
        </Link>

        <div className="relative z-10 ml-auto flex items-center gap-1.5">
          <div
            className={`flex items-center gap-1.5 transition-opacity duration-300 ease-ios ${
              scrolled ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {config?.github && (
              <a
                href={config.github}
                target="_blank"
                rel="noreferrer"
                className="hidden h-9 w-9 items-center justify-center rounded-full text-slate-300 transition-colors duration-200 hover:bg-white/10 sm:flex"
                aria-label="GitHub"
              >
                <Github className="h-[17px] w-[17px]" />
              </a>
            )}
            <Link to="/docs" className="btn-secondary hidden !px-4 !py-2 text-[13px] sm:inline-flex">
              <BookOpen className="h-3.5 w-3.5" />
              Docs
            </Link>
          </div>
          <NotificationBell />
        </div>
      </header>

      {/* NAV DRAWER — jumps to this page's sections, or over to the docs. */}
      {drawerMounted && (
        <div className="fixed inset-0 z-40">
          <div
            className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ease-ios ${
              drawerOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className={`glass absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col shadow-ios-lg transition-transform duration-300 ease-ios ${
              drawerOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="flex h-14 shrink-0 items-center border-b border-white/10 px-4 font-display font-extrabold text-white">
              {config?.name ?? 'Aqua APIs'}
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {SECTION_LINKS.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  onClick={() => setDrawerOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-medium text-slate-300 transition-colors hover:bg-white/5"
                >
                  <s.icon className="h-4 w-4 text-aqua-400" strokeWidth={2} />
                  {s.label}
                </a>
              ))}
            </nav>
            <div className="border-t border-white/10 p-3">
              <Link
                to="/docs"
                onClick={() => setDrawerOpen(false)}
                className="btn-primary w-full !py-2.5 text-[13.5px]"
              >
                <BookOpen className="h-4 w-4" />
                Go to Docs
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Body content. While app data is loading, this region shows the
          same spinner + label used by DocsLayout, instead of the hero. Now
          flows naturally in the document (see the layout note above) rather
          than owning its own scroll region. */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-aqua-500 border-t-transparent" />
            <p className="text-sm text-slate-400">Loading endpoints…</p>
          </div>
        </div>
      ) : (
      <>
      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-aqua-400/15 blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-aqua-600/10 blur-[130px]" />

          <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center lg:max-w-6xl lg:py-28">
          {gif && (
            <img
              src={gif}
              alt=""
              className="hero-gif animate-fade-up rounded-2xl"
              style={{ animationDelay: '0ms' }}
            />
          )}

          <span className="pill mb-6 mt-6 animate-fade-up bg-aqua-500/10 text-aqua-300">
            <Sparkles className="h-3.5 w-3.5" />
            {config?.header.status ?? 'Online • Always Free'}
          </span>

          <h1 className="animate-fade-up font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Welcome to {config?.name ?? 'Aqua APIs'}
          </h1>
          <p
            className="mt-5 max-w-xl animate-fade-up text-balance text-[16px] leading-relaxed text-slate-400 sm:text-lg"
            style={{ animationDelay: '80ms' }}
          >
            {config?.description ?? 'A fast, friendly REST API playground.'}
          </p>

          <div
            className="mt-8 flex animate-fade-up items-stretch gap-2 px-6 py-4 sm:gap-8"
            style={{ animationDelay: '120ms' }}
          >
            <div className="flex flex-col px-2">
              <span className="text-xl font-extrabold text-aqua-400">{totalEndpoints}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Endpoints</span>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex flex-col px-2">
              <span className="text-xl font-extrabold text-aqua-400">{buckets.length}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Categories</span>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex flex-col px-2">
              <span className="text-xl font-extrabold text-aqua-400">Free</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Always</span>
            </div>
          </div>

          <div
            className="mt-9 flex animate-fade-up flex-col gap-3 sm:flex-row"
            style={{ animationDelay: '160ms' }}
          >
            <Link to="/docs" className="btn-primary px-7 py-3 text-[15px]">
              <BookOpen className="h-4 w-4" />
              View Full Docs
            </Link>
            <a href="#features" className="btn-secondary px-7 py-3 text-[15px]">
              Explore Features
              <ArrowRight className="h-4 w-4 rotate-90" />
            </a>
          </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="mx-auto max-w-5xl scroll-mt-16 px-6 py-14 lg:max-w-6xl lg:py-20">
          <p className="text-center text-[12px] font-bold uppercase tracking-widest text-aqua-400">Capabilities</p>
          <h2 className="mt-2 text-center font-display text-2xl font-extrabold text-white sm:text-3xl">
            Key Features
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
            {FEATURES.map((f) => (
              <div key={f.name} className="card animate-fade-up p-6 transition duration-200 ease-ios hover:-translate-y-1 hover:shadow-ios-md lg:p-7">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-aqua-500/10 text-aqua-400">
                  <f.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-[15px] font-bold text-white">{f.name}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-400">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mx-auto h-px max-w-5xl bg-white/10 lg:max-w-6xl" />

        {/* GETTING STARTED */}
        <section id="getting-started" className="mx-auto max-w-5xl scroll-mt-16 px-6 py-14 lg:max-w-6xl lg:py-20">
          <p className="text-center text-[12px] font-bold uppercase tracking-widest text-aqua-400">Quickstart</p>
          <h2 className="mt-2 text-center font-display text-2xl font-extrabold text-white sm:text-3xl">
            Getting Started
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3 lg:gap-8">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center sm:items-start sm:text-left">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-aqua-500/15 text-[14px] font-bold text-aqua-300">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-[14.5px] font-bold text-white">{step.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-400">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mx-auto h-px max-w-5xl bg-white/10 lg:max-w-6xl" />

        {/* TERMS */}
        <section id="terms" className="mx-auto max-w-5xl scroll-mt-16 px-6 py-14 lg:max-w-6xl lg:py-20">
          <p className="text-center text-[12px] font-bold uppercase tracking-widest text-aqua-400">Legal</p>
          <h2 className="mt-2 text-center font-display text-2xl font-extrabold text-white sm:text-3xl">
            Terms of Service
          </h2>
          <div className="card mx-auto mt-10 max-w-2xl p-6">
            <p className="text-[13.5px] leading-relaxed text-slate-300">
              By using <strong className="font-semibold text-white">{config?.name ?? 'this API'}</strong>, you
              agree to the following:
            </p>
            <ul className="mt-4 space-y-2.5">
              {TERMS.map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-slate-400">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-aqua-400" strokeWidth={2} />
                  {t}
                </li>
              ))}
            </ul>
            {config?.telegram && (
              <p className="mt-4 text-[13px] text-slate-500">
                For full terms, contact us via our{' '}
                <a href={config.telegram} target="_blank" rel="noreferrer" className="font-medium text-aqua-400 hover:text-aqua-300">
                  Telegram channel
                </a>
                .
              </p>
            )}
          </div>
        </section>

        <div className="mx-auto h-px max-w-5xl bg-white/10 lg:max-w-6xl" />

        {/* CTA */}
        <section id="cta" className="mx-auto max-w-5xl scroll-mt-16 px-6 py-14 lg:max-w-6xl lg:py-20">
          <div className="card overflow-hidden">
            <div className="p-8 sm:p-10">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-emerald-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                All systems operational
              </div>
              <h2 className="mt-3 font-display text-2xl font-extrabold text-white sm:text-3xl">
                Start Building Today
              </h2>
              <p className="mt-2 max-w-lg text-[14.5px] leading-relaxed text-slate-400">
                Join developers worldwide using our APIs. Instant access to robust endpoints backed by
                comprehensive documentation.
              </p>
              <Link to="/docs" className="btn-primary mt-6 px-6 py-2.5 text-[14px]">
                <Terminal className="h-4 w-4" />
                Open Documentation
              </Link>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 bg-white/[.03] px-8 py-4 sm:px-10">
              {CTA_CHECKS.map((c) => (
                <div key={c} className="flex items-center gap-2 text-[12px] text-slate-400">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  {c}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-white/[.02] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-10">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-6 sm:grid-cols-2 lg:max-w-6xl">
          <div>
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-300">About</h3>
            <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-slate-500">
              An interactive API platform for seamless endpoint exploration and real-time integration testing.
            </p>
          </div>
          <div className="sm:text-right">
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-300">Connect</h3>
            <div className="mt-2 flex gap-2 sm:justify-end">
              {config?.telegram && (
                <a
                  href={config.telegram}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-300 transition-colors hover:bg-white/10"
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
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-300 transition-colors hover:bg-white/10"
                  aria-label="Messenger"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {config?.github && (
                <a
                  href={config.github}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-300 transition-colors hover:bg-white/10"
                  aria-label="GitHub"
                >
                  <Github className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
        <p className="mt-8 text-center text-[12px] text-slate-600">
          © {year} {config?.name ?? 'API'}. All rights reserved. Built by {config?.operator ?? 'AjiroDesu'}.
        </p>
      </footer>
      </>
      )}
    </div>
  );
}