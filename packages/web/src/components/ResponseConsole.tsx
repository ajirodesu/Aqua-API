import { CheckCircle2, Clock, Copy, Download, XCircle } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ExecuteResult } from '../lib/api';
import { JsonViewer } from './JsonViewer';

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
};

function extensionFor(contentType: string): string {
  const base = contentType.split(';')[0].trim();
  if (EXT_BY_CONTENT_TYPE[base]) return EXT_BY_CONTENT_TYPE[base];
  const subtype = base.split('/')[1];
  return subtype ? subtype.replace('+xml', '') : 'bin';
}

function isMarkdown(contentType: string): boolean {
  return contentType.includes('markdown') || contentType.includes('text/plain');
}

export function ResponseConsole({ result }: { result: ExecuteResult | null }) {
  const [copied, setCopied] = useState(false);

  if (!result) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 p-10 text-center">
        <Clock className="h-6 w-6 text-slate-600" />
        <p className="text-sm text-slate-400">Run the request to see the response here.</p>
      </div>
    );
  }

  const bodyText = result.json ? JSON.stringify(result.json, null, 2) : result.text ?? '';
  const isJson = result.json !== undefined;
  const isMedia = Boolean(result.blobUrl);

  function copy() {
    navigator.clipboard.writeText(bodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    if (!result?.blobUrl) return;
    const a = document.createElement('a');
    a.href = result.blobUrl;
    a.download = `response.${extensionFor(result.contentType)}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1420] shadow-ios-md">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[.03] px-4 py-2.5">
        <div className="flex items-center gap-2">
          {result.ok ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <XCircle className="h-4 w-4 text-rose-400" />
          )}
          <span className={`text-[13px] font-bold ${result.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
            {result.status}
          </span>
          <span className="text-[12px] text-slate-500">{result.contentType.split(';')[0]}</span>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-slate-500">
          <span>{result.durationMs}ms</span>
          {isMedia ? (
            <button
              type="button"
              onClick={download}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </button>
          ) : (
            bodyText && (
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1 rounded-md px-1.5 py-1 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            )
          )}
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto p-4">
        {result.blobUrl ? (
          result.contentType.startsWith('image/') ? (
            <img src={result.blobUrl} alt="Response" className="mx-auto max-h-96 rounded-lg" />
          ) : result.contentType.startsWith('video/') ? (
            <video src={result.blobUrl} controls className="mx-auto max-h-96 rounded-lg" />
          ) : (
            <audio src={result.blobUrl} controls className="w-full" />
          )
        ) : isJson ? (
          <JsonViewer value={result.json} />
        ) : bodyText && isMarkdown(result.contentType) ? (
          <div className="space-y-2 text-[13px] leading-relaxed text-slate-200">
            <ReactMarkdown
              components={{
                h1: (p) => <h1 className="font-display text-lg font-bold text-white" {...p} />,
                h2: (p) => <h2 className="font-display text-base font-bold text-white" {...p} />,
                h3: (p) => <h3 className="font-display text-[15px] font-bold text-white" {...p} />,
                a: (p) => <a className="text-aqua-400 underline hover:text-aqua-300" {...p} />,
                strong: (p) => <strong className="font-bold text-white" {...p} />,
                em: (p) => <em className="text-slate-300" {...p} />,
                code: (p) => (
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[12px] text-aqua-300" {...p} />
                ),
                pre: (p) => (
                  <pre className="overflow-x-auto rounded-lg bg-black/30 p-3 font-mono text-[12px]" {...p} />
                ),
                ul: (p) => <ul className="list-disc space-y-1 pl-5" {...p} />,
                ol: (p) => <ol className="list-decimal space-y-1 pl-5" {...p} />,
                blockquote: (p) => (
                  <blockquote className="border-l-2 border-aqua-500/50 pl-3 text-slate-400" {...p} />
                ),
              }}
            >
              {bodyText}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-slate-200">
            {bodyText || '(empty response)'}
          </pre>
        )}
      </div>
    </div>
  );
}
