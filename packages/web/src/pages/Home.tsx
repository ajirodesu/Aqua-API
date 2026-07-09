import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code2,
  Facebook,
  Github,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal,
  Unlock,
  Zap,
} from 'lucide-react';
import { useAppData } from '../lib/appData';
import { useScrolled } from '../lib/useScrolled';

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

export function Home() {
  const { config, totalEndpoints, buckets, loading } = useAppData();
  const year = new Date().getFullYear();
  const scrolled = useScrolled();

  const gif = config?.header.imageSrc?.[0];
  const size = config?.header.imageSize;

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-surface">
      {size && (
        <style>{`
          .hero-gif { width: ${size.mobile}; }
          @media (min-width: 640px) { .hero-gif { width: ${size.tablet}; } }
          @media (min-width: 1024px) { .hero-gif { width: ${size.desktop}; } }
        `}</style>
      )}

      <header
        className={`sticky top-0 z-20 flex items-center justify-between px-5 py-3 transition-all duration-300 ease-ios sm:px-8 ${
          scrolled ? 'glass border-b' : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div
          className={`flex items-center gap-2 font-display font-extrabold text-white transition-opacity duration-300 ease-ios ${
            scrolled ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          {config?.name ?? 'Aqua APIs'}
        </div>
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

              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition-colors duration-200 hover:bg-white/10"
              aria-label="GitHub"
            >
              <Github className="h-[18px] w-[18px]" />
            </a>
          )}
          <Link to="/docs" className="btn-secondary !px-4 !py-2 text-[13px]">
            <BookOpen className="h-3.5 w-3.5" />
            Docs
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-aqua-400/15 blur-[120px]" />
          <div className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-aqua-600/10 blur-[130px]" />

          <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center">
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

          <h1 className="animate-fade-up font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Welcome to {config?.name ?? 'Aqua APIs'}
          </h1>
          <p
            className="mt-5 max-w-xl animate-fade-up text-balance text-[16px] leading-relaxed text-slate-400 sm:text-lg"
            style={{ animationDelay: '80ms' }}
          >
            {config?.description ?? 'A fast, friendly REST API playground.'}
          </p>

          <div
            className="mt-8 flex animate-fade-up items-stretch gap-2 rounded-2xl border border-white/10 bg-white/[.03] px-6 py-4 sm:gap-8"
            style={{ animationDelay: '120ms' }}
          >
            <div className="flex flex-col px-2">
              <span className="text-xl font-extrabold text-aqua-400">{loading ? '—' : totalEndpoints}</span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Endpoints</span>
            </div>
            <div className="w-px bg-white/10" />
            <div className="flex flex-col px-2">
              <span className="text-xl font-extrabold text-aqua-400">{loading ? '—' : buckets.length}</span>
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
        <section id="features" className="mx-auto max-w-5xl px-6 py-14 scroll-mt-16">
          <p className="text-center text-[12px] font-bold uppercase tracking-widest text-aqua-400">Capabilities</p>
          <h2 className="mt-2 text-center font-display text-2xl font-extrabold text-white sm:text-3xl">
            Key Features
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.name} className="card animate-fade-up p-6 transition duration-200 ease-ios hover:-translate-y-1 hover:shadow-ios-md">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-aqua-500/10 text-aqua-400">
                  <f.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <h3 className="mt-4 text-[15px] font-bold text-white">{f.name}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-400">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mx-auto h-px max-w-5xl bg-white/10" />

        {/* GETTING STARTED */}
        <section className="mx-auto max-w-5xl px-6 py-14">
          <p className="text-center text-[12px] font-bold uppercase tracking-widest text-aqua-400">Quickstart</p>
          <h2 className="mt-2 text-center font-display text-2xl font-extrabold text-white sm:text-3xl">
            Getting Started
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
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

        <div className="mx-auto h-px max-w-5xl bg-white/10" />

        {/* TERMS */}
        <section className="mx-auto max-w-5xl px-6 py-14">
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

        <div className="mx-auto h-px max-w-5xl bg-white/10" />

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-6 py-14">
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
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 px-6 sm:grid-cols-2">
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
    </div>
  );
}
