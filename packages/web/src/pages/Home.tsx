import { Link } from 'react-router-dom';
import { ArrowRight, Github, Send, Sparkles } from 'lucide-react';
import { useAppData } from '../lib/appData';

export function Home() {
  const { config, totalEndpoints, buckets, loading } = useAppData();

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-surface-darkbase">
      {/* Ambient aqua glow, signature element */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-[32rem] w-[32rem] rounded-full bg-aqua-400/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-aqua-600/15 blur-[130px]" />

      <header className="glass sticky top-0 z-20 flex items-center justify-between border-b px-5 py-3 sm:px-8">
        <div className="flex items-center gap-2 font-display font-extrabold text-white">
          {config?.name ?? 'Aqua APIs'}
        </div>
        <div className="flex items-center gap-3">
          {config?.github && (
            <a href={config.github} target="_blank" rel="noreferrer" className="hidden text-slate-400 hover:text-white sm:block">
              <Github className="h-5 w-5" />
            </a>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <span className="pill mb-6 animate-fade-up bg-aqua-500/10 text-aqua-300">
          <Sparkles className="h-3.5 w-3.5" />
          {config?.header.status ?? 'Online'}
        </span>

        <h1 className="animate-fade-up font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
          {config?.name ?? 'Aqua APIs'}
        </h1>
        <p
          className="mt-5 max-w-xl animate-fade-up text-balance text-[16px] leading-relaxed text-slate-400 sm:text-lg"
          style={{ animationDelay: '80ms' }}
        >
          {config?.description ?? 'A fast, friendly REST API playground.'} Explore{' '}
          {loading ? '…' : totalEndpoints} endpoints across {loading ? '…' : buckets.length} categories —
          every request runs live, right in your browser.
        </p>

        <div
          className="mt-9 flex animate-fade-up flex-col gap-3 sm:flex-row"
          style={{ animationDelay: '140ms' }}
        >
          <Link to="/docs" className="btn-primary px-7 py-3 text-[15px]">
            Browse the docs
            <ArrowRight className="h-4 w-4" />
          </Link>
          {config?.telegram && (
            <a href={config.telegram} target="_blank" rel="noreferrer" className="btn-secondary px-7 py-3 text-[15px]">
              <Send className="h-4 w-4" />
              Join the community
            </a>
          )}
        </div>

        <div
          className="mt-16 grid w-full max-w-2xl animate-fade-up grid-cols-2 gap-3 sm:grid-cols-4"
          style={{ animationDelay: '200ms' }}
        >
          {buckets.slice(0, 4).map((b) => (
            <Link
              key={b.name}
              to="/docs"
              className="card flex flex-col items-center gap-1 px-3 py-4 transition hover:-translate-y-0.5 hover:shadow-ios-md"
            >
              <span className="text-xl font-extrabold text-aqua-500">{b.items.length}</span>
              <span className="text-[12px] font-medium capitalize text-slate-400">
                {b.name}
              </span>
            </Link>
          ))}
        </div>
      </main>

      <footer className="relative z-10 pb-8 text-center text-[12.5px] text-slate-400">
        Built by {config?.operator ?? 'AjiroDesu'}
      </footer>
    </div>
  );
}
