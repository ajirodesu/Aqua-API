import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Copy, Play } from 'lucide-react';
import { useAppData } from '../lib/appData';
import { MethodBadge } from '../components/MethodBadge';
import { ParamField } from '../components/ParamField';
import { ResponseConsole } from '../components/ResponseConsole';
import { CodeExample } from '../components/CodeExample';
import { API_ORIGIN, executeEndpoint, type ExecuteResult } from '../lib/api';
import { H_SHELL_SCOPE, H_STATUS_SQUARE } from '../lib/shell';
import { cn } from '../lib/cn';

export function EndpointPage() {
  const { category = '', name = '' } = useParams();
  const { findEndpoint } = useAppData();
  const endpoint = findEndpoint(category, name);

  const [method, setMethod] = useState<string>(endpoint?.methods[0] ?? 'GET');
  const [values, setValues] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [lastSentSignature, setLastSentSignature] = useState<string | null>(null);

  useEffect(() => {
    setMethod(endpoint?.methods[0] ?? 'GET');
    const defaults: Record<string, string> = {};
    for (const p of endpoint?.params ?? []) {
      if (p.default) defaults[p.name] = p.default;
    }
    setValues(defaults);
    setResult(null);
    setLastSentSignature(null);
  }, [endpoint?.path]);

  const publicUrl = useMemo(
    () => (endpoint ? `${API_ORIGIN || window.location.origin}${endpoint.path.split('?')[0]}` : ''),
    [endpoint]
  );

  if (!endpoint) {
    return (
      <div className="flex min-h-[50vh] animate-fade-in-up flex-col justify-center">
        <div className="rule-label max-w-[14rem]">404 / ROUTE</div>
        <h1 className="mt-6 font-brand text-display-sm uppercase text-on-surface">Endpoint not found</h1>
        <p className="mt-3 max-w-md text-body-md text-on-surface-variant">
          It may have been renamed or removed from the catalog.
        </p>
        <Link to="/docs" className="btn-primary mt-6 self-start">
          Back to overview
        </Link>
      </div>
    );
  }

  const allParams = endpoint.params ?? [];
  const params = allParams.filter((p) => {
    if (!p.dependsOn) return true;
    const current = values[p.dependsOn.param] ?? '';
    const allowed = Array.isArray(p.dependsOn.value) ? p.dependsOn.value : [p.dependsOn.value];
    return allowed.includes(current);
  });
  const missingRequired = params.some((p) => p.required && !values[p.name]);
  const visibleValuesForSignature = Object.fromEntries(params.map((p) => [p.name, values[p.name] ?? '']));
  const alreadySent =
    lastSentSignature !== null && lastSentSignature === JSON.stringify({ method, values: visibleValuesForSignature });

  async function run() {
    const visibleValues = Object.fromEntries(params.map((p) => [p.name, values[p.name] ?? '']));
    const signature = JSON.stringify({ method, values: visibleValues });
    setRunning(true);
    try {
      const res = await executeEndpoint(endpoint!.path, method, visibleValues);
      setResult(res);
    } catch (err) {
      setResult({
        ok: false,
        status: 0,
        contentType: 'text/plain',
        durationMs: 0,
        text: (err as Error).message,
      });
    } finally {
      setRunning(false);
      setLastSentSignature(signature);
    }
  }

  function copyUrl() {
    navigator.clipboard.writeText(publicUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 1500);
  }

  return (
    <div className="flex animate-fade-in-up flex-col pb-4">
      {/* Breadcrumb — mono scope chain */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 border-b border-hairline pb-3">
        <Link
          to="/docs"
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant transition-colors duration-fast hover:text-on-surface"
        >
          DOCS
        </Link>
        <span aria-hidden="true" className="text-on-surface-variant/50">/</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
          {endpoint.category}
        </span>
        <span aria-hidden="true" className="text-on-surface-variant/50">/</span>
        <span className="min-w-0 truncate font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface">
          {endpoint.name}
        </span>
      </nav>

      {/* Header — route identity */}
      <header className="border-b border-hairline py-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <MethodBadge method={method} size="md" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
            {endpoint.category}
          </span>
          <span className="font-mono text-[10px] text-on-surface-variant/50">/</span>
          <span className="font-mono text-[10px] tracking-[0.02em] text-on-surface-variant">
            {endpoint.path.split('?')[0]}
          </span>
        </div>

        <h1 className="mt-4 break-words font-brand text-display-sm uppercase capitalize text-on-surface">
          {endpoint.name}
        </h1>
        <p className="mt-3 max-w-2xl text-body-md text-on-surface-variant">{endpoint.desc}</p>
      </header>

      {/* Public route field */}
      <div className="border-b border-hairline py-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant/80">
            PUBLIC ROUTE
          </span>
          <span className={H_SHELL_SCOPE}>
            {method} · {params.length} {params.length === 1 ? 'PARAM' : 'PARAMS'}
          </span>
        </div>
        <div className="mt-2 flex items-stretch border border-[var(--color-input-border)] bg-[var(--color-input-bg)]">
          <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-on-surface">
            {publicUrl}
          </code>
          <button
            type="button"
            onClick={copyUrl}
            className="flex shrink-0 items-center gap-1.5 border-l border-hairline px-3 font-mono text-[10px] uppercase tracking-[0.06em] text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/[0.08] hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
            aria-label="Copy endpoint URL"
          >
            <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
            {urlCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Request / response — two columns of one document */}
      <div className="grid gap-8 border-b border-hairline py-8 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-10">
        <section aria-labelledby="request-title" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="rule-label max-w-[12rem]">01 / REQUEST</div>
            <span className={H_SHELL_SCOPE}>{params.length} FIELDS</span>
          </div>

          <h2 id="request-title" className="mt-3 font-brand text-headline-sm uppercase text-on-surface">
            Parameters
          </h2>

          {endpoint.methods.length > 1 && (
            <div className="mt-4 flex flex-wrap border-b border-hairline" role="tablist" aria-label="HTTP method">
              {endpoint.methods.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={method === m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    '-mb-px border-b-2 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-fast focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary',
                    method === m
                      ? 'border-primary text-on-surface'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {params.length === 0 ? (
            <div className="mt-4 border border-hairline bg-surface-container-low px-3 py-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
                No parameters — run the request directly.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {params.map((param) => (
                <ParamField
                  key={param.name}
                  param={param}
                  method={method}
                  value={values[param.name] ?? ''}
                  onChange={(v) => setValues((prev) => ({ ...prev, [param.name]: v }))}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={run}
            disabled={running || missingRequired}
            className="btn-primary mt-6 min-h-12 w-full"
          >
            {running ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-[1px] border border-on-primary/40 border-t-on-primary" />
            ) : (
              <Play className="h-3 w-3 fill-current" strokeWidth={1.75} />
            )}
            {running ? 'Sending…' : alreadySent ? 'Send request again' : 'Send request'}
          </button>

          {missingRequired && (
            <p className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-warning">
              <span className={cn(H_STATUS_SQUARE, 'bg-warning')} aria-hidden="true" />
              Complete required fields to send
            </p>
          )}
        </section>

        <section aria-labelledby="response-title" className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="rule-label max-w-[12rem]">02 / RESPONSE</div>
            <span className={cn(H_SHELL_SCOPE, result ? (result.ok ? 'text-success' : 'text-error') : '')}>
              {result ? `${result.status} · ${result.durationMs}MS` : 'STANDBY'}
            </span>
          </div>

          <h2 id="response-title" className="mt-3 font-brand text-headline-sm uppercase text-on-surface">
            Output
          </h2>

          <div className="mt-4">
            <ResponseConsole result={result} />
          </div>
        </section>
      </div>

      {/* Code example */}
      <section aria-labelledby="code-title" className="py-8">
        <div className="rule-label max-w-[14rem]">03 / CODE EXAMPLE</div>
        <h2 id="code-title" className="mt-3 font-brand text-headline-sm uppercase text-on-surface">
          Copy a snippet
        </h2>
        <p className="mt-2 max-w-[52ch] text-body-sm text-on-surface-variant">
          Built from the current URL, method, and field values.
        </p>
        <div className="mt-4">
          <CodeExample url={publicUrl} method={method} values={visibleValuesForSignature} />
        </div>
      </section>
    </div>
  );
}
