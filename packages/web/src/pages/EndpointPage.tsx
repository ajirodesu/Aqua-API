import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Copy, Play } from 'lucide-react';
import { useAppData } from '../lib/appData';
import { MethodBadge } from '../components/MethodBadge';
import { ParamField } from '../components/ParamField';
import { ResponseConsole } from '../components/ResponseConsole';
import { CodeExample } from '../components/CodeExample';
import { API_ORIGIN, executeEndpoint, type ExecuteResult } from '../lib/api';

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
      <div className="flex min-h-[60vh] animate-fade-in-up flex-col items-center justify-center gap-2 rounded-card border border-hairline bg-surface-container px-6 py-16 text-center">
        <div className="mx-auto max-w-sm">
          <p className="text-lg font-semibold text-on-surface">Endpoint not found</p>
          <p className="mt-1 text-sm text-on-surface-variant">It may have been renamed or removed.</p>
          <Link to="/docs" className="btn-primary mt-6 inline-flex h-11 rounded-lg">
            Back to overview
          </Link>
        </div>
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
    <div className="flex animate-fade-in-up flex-col gap-6 pb-16">
      <Link
        to="/docs"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <MethodBadge method={method} size="md" />
          <span className="text-xs font-medium capitalize text-on-surface-variant">{endpoint.category}</span>
        </div>
        <h1 className="text-[22px] font-bold capitalize tracking-tight text-on-surface sm:text-2xl">
          {endpoint.name}
        </h1>
        <p className="max-w-2xl text-[13px] leading-normal text-on-surface-variant">{endpoint.desc}</p>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-hairline bg-surface-container-low p-3">
        <code className="flex-1 overflow-x-auto whitespace-nowrap border-0 bg-transparent p-0 font-mono text-[12.5px] text-on-surface">
          {publicUrl}
        </code>
        <button type="button" onClick={copyUrl} className="btn-secondary h-9 shrink-0 rounded-lg !px-3 !py-1.5 text-xs">
          <Copy className="h-3.5 w-3.5" />
          {urlCopied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-8">
        <div className="rounded-xl border border-hairline bg-surface-container-low p-4 md:p-6">
          {endpoint.methods.length > 1 && (
            <div className="mb-4 inline-flex gap-1 rounded-input border border-hairline bg-surface-container-low p-1 text-[13px] font-semibold">
              {endpoint.methods.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`rounded-[calc(var(--radius-input)-0.25rem)] px-3.5 py-2 transition-colors duration-fast ${
                    method === m ? 'bg-surface-container-highest text-on-surface shadow-elevation-1' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {params.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-card bg-surface-container px-3 py-12 text-center">
              <p className="text-sm text-on-surface-variant">This endpoint has no parameters — just run it.</p>
            </div>
          ) : (
            <div className="space-y-4">
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
            className="btn-primary mt-6 h-12 w-full rounded-lg text-[14px]"
          >
            {running ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            {running ? 'Sending…' : alreadySent ? 'Send request again' : 'Send request'}
          </button>
        </div>

        <div>
          <ResponseConsole result={result} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          Code example
          <span className="h-px flex-1 bg-hairline" />
        </h2>
        <CodeExample url={publicUrl} method={method} values={visibleValuesForSignature} />
      </div>
    </div>
  );
}
