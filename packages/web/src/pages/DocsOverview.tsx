import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAppData, slugify } from '../lib/appData';
import { MethodBadge } from '../components/MethodBadge';

export function DocsOverview() {
  const { config, buckets, totalEndpoints } = useAppData();

  return (
    <div className="animate-fade-up space-y-10">
      <div>
        <p className="pill mb-3 bg-aqua-500/10 text-aqua-300">
          {totalEndpoints} endpoints · {buckets.length} categories
        </p>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {config?.name ?? 'Aqua APIs'}
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-slate-400">
          {config?.description ?? 'Simple and easy to use.'} Pick any endpoint below to open its
          dedicated page, fill in the parameters, and run a live request.
        </p>
      </div>

      <div className="space-y-8">
        {buckets.map((bucket) => (
          <section key={bucket.name}>
            <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-slate-400">
              {bucket.name}
              <span className="h-px flex-1 bg-white/10" />
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {bucket.items.map((item) => (
                <Link
                  key={item.path}
                  to={`/docs/${slugify(bucket.name)}/${slugify(item.name)}`}
                  className="card group flex flex-col gap-2 p-4 transition-all duration-200 ease-ios hover:-translate-y-0.5 hover:shadow-ios-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-[14.5px] font-semibold capitalize text-slate-100">
                      {item.name}
                    </h3>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-aqua-500" />
                  </div>
                  <p className="line-clamp-2 text-[13px] leading-snug text-slate-400">
                    {item.desc}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {item.methods.map((m) => (
                      <MethodBadge key={m} method={m} />
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
