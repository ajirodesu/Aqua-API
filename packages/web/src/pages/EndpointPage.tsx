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
  // Signature (method + params) captured at the moment a request was last
  // sent. Used purely to drive the button label: "Send request again" once
  // it matches the current form state, reverting to "Send request" the
  // instant anything changes — including a fresh file/media upload.
  const [lastSentSignature, setLastSentSignature] = useState<string | null>(null);

  useEffect(() => {
    setMethod(endpoint?.methods[0] ?? 'GET');
    setValues({});
    setResult(null);
    setLastSentSignature(null);
  }, [endpoint?.path]);

  const publicUrl = useMemo(
    () => (endpoint ? `${API_ORIGIN || window.location.origin}${endpoint.path.split('?')[0]}` : ''),
    [endpoint]
  );

  if (!endpoint) {
    return (
      <div className="animate-fade-up py-16 text-center">
        <p className="text-lg font-semibold text-slate-200">Endpoint not found</p>
        <p className="mt-1 text-sm text-slate-500">It may have been renamed or removed.</p>
        <Link to="/docs" className="btn-primary mt-6 inline-flex">
          Back to overview
        </Link>
      </div>
    );
  }

  const params = endpoint.params ?? [];
  const missingRequired = params.some((p) => p.required && !values[p.name]);
  // True only while the form is exactly as it was for the last request —
  // any edit (text, select, or a new upload) changes `values` and this
  // immediately goes false again.
  const alreadySent = lastSentSignature !== null && lastSentSignature === JSON.stringify({ method, values });

  async function run() {
    const signature = JSON.stringify({ method, values });
    setRunning(true);
    try {
      const res = await executeEndpoint(endpoint!.path, method, values);
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
    <div className="animate-fade-up space-y-6 pb-16">
      <Link
        to="/docs"
        className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 transition-colors hover:text-slate-200"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to Dashboard
      </Link>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <MethodBadge method={method} size="md" />
          <span className="text-[12px] font-medium capitalize text-slate-500">{endpoint.category}</span>
        </div>
        <h1 className="font-display text-2xl font-extrabold capitalize tracking-tight text-white sm:text-3xl">
          {endpoint.name}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[14.5px] text-slate-400">{endpoint.desc}</p>
      </div>

      <div className="card flex items-center gap-2 p-3">
        <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-[12.5px] text-slate-300">
          {publicUrl}
        </code>
        <button type="button" onClick={copyUrl} className="btn-secondary shrink-0 !px-3 !py-1.5 text-[12px]">
          <Copy className="h-3.5 w-3.5" />
          {urlCopied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] xl:gap-8">
        <div className="card p-5 xl:p-6">
          {endpoint.methods.length > 1 && (
            <div className="mb-4 inline-flex rounded-full bg-white/5 p-0.5 text-[13px] font-semibold">
              {endpoint.methods.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`rounded-full px-3.5 py-1.5 transition-colors duration-200 ${
                    method === m ? 'bg-surface-card text-white shadow-ios-sm' : 'text-slate-400'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {params.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              This endpoint has no parameters — just run it.
            </p>
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

          <button type="button" onClick={run} disabled={running || missingRequired} className="btn-primary mt-6 w-full">
            {running ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
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
        <h2 className="mb-3 text-[13px] font-bold uppercase tracking-widest text-slate-500">Code example</h2>
        <CodeExample url={publicUrl} method={method} values={values} />
      </div>
    </div>
  );
}