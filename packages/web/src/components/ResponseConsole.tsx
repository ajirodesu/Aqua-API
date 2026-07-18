import { CheckCircle2, Clock, Copy, Download, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ExecuteResult } from '../lib/api';
import { highlightJson } from '../lib/jsonHighlight';

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
};

function downloadName(contentType: string): string {
  const base = contentType.split(';')[0].trim();
  const ext = EXT_BY_CONTENT_TYPE[base] ?? base.split('/')[1] ?? 'bin';
  return `aqua-response.${ext}`;
}

export function ResponseConsole({ result }: { result: ExecuteResult | null }) {
  const [copied, setCopied] = useState(false);

  const bodyText = result?.json ? JSON.stringify(result.json, null, 2) : result?.text ?? '';
  const highlighted = useMemo(
    () => (result?.json ? highlightJson(bodyText) : null),
    [result?.json, bodyText]
  );

  if (!result) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 p-10 text-center">
        <Clock className="h-6 w-6 text-slate-600" />
        <p className="text-sm text-slate-500">Run the request to see the response here.</p>
      </div>
    );
  }

  function copy() {
    navigator.clipboard.writeText(bodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1420] shadow-ios-md">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-white/10 bg-white/[.03] px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {result.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span className={`shrink-0 text-[13px] font-bold ${result.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
            {result.status}
          </span>
          <span className="truncate text-[12px] text-slate-500">{result.contentType.split(';')[0]}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[12px] text-slate-500">
          <span>{result.durationMs}ms</span>
          {result.blobUrl ? (
            <a
              href={result.blobUrl}
              download={downloadName(result.contentType)}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-slate-400 transition-colors duration-200 hover:bg-white/5 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          ) : (
            bodyText && (
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-slate-400 transition-colors duration-200 hover:bg-white/5 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            )
          )}
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto p-4 xl:max-h-[560px] xl:p-5">
        {result.blobUrl ? (
          result.contentType.startsWith('image/') ? (
            <img src={result.blobUrl} alt="Response" className="mx-auto max-h-96 rounded-lg" />
          ) : result.contentType.startsWith('video/') ? (
            <video src={result.blobUrl} controls className="mx-auto max-h-96 rounded-lg" />
          ) : (
            <audio src={result.blobUrl} controls className="w-full" />
          )
        ) : highlighted ? (
          <pre
            className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-slate-300">
            {bodyText || '(empty response)'}
          </pre>
        )}
      </div>
    </div>
  );
}