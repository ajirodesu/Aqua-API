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
  const highlighted = useMemo(() => (result?.json ? highlightJson(bodyText) : null), [result?.json, bodyText]);

  if (!result) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-card border border-hairline bg-surface-container p-10 text-center">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-on-surface/10">
          <Clock className="h-5 w-5 text-surface-variant" />
        </span>
        <p className="text-sm text-on-surface-variant">Run the request to see the response here.</p>
      </div>
    );
  }

  function copy() {
    navigator.clipboard.writeText(bodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-card border border-hairline bg-surface-container-low shadow-card-rest">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-outline-variant bg-surface-container-low px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          {result.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-error" />
          )}
          <span className={`shrink-0 font-mono text-[13px] font-semibold ${result.ok ? 'text-success' : 'text-error'}`}>
            {result.status}
          </span>
          <span className="truncate text-xs text-on-surface-variant">{result.contentType.split(';')[0]}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs text-on-surface-variant">
          <span className="font-mono">{result.durationMs}ms</span>
          {result.blobUrl ? (
            <a
              href={result.blobUrl}
              download={downloadName(result.contentType)}
              className="flex items-center gap-1 rounded-input px-1.5 py-1 text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/10 hover:text-on-surface"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>
          ) : (
            bodyText && (
              <button
                type="button"
                onClick={copy}
                className="flex w-[68px] shrink-0 items-center justify-center gap-1 rounded-input px-1.5 py-1 text-on-surface-variant transition-colors duration-fast hover:bg-on-surface/10 hover:text-on-surface"
              >
                <Copy className="h-3.5 w-3.5 shrink-0" />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )
          )}
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto bg-surface-container-lowest p-4 xl:max-h-[560px] xl:p-5">
        {result.blobUrl ? (
          result.contentType.startsWith('image/') ? (
            <img src={result.blobUrl} alt="Response" className="mx-auto max-h-96 rounded-input" />
          ) : result.contentType.startsWith('video/') ? (
            <video src={result.blobUrl} controls className="mx-auto max-h-96 rounded-input" />
          ) : (
            <audio src={result.blobUrl} controls className="w-full" />
          )
        ) : highlighted ? (
          <pre
            className="whitespace-pre-wrap break-words border-0 bg-transparent p-0 font-mono text-[12.5px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        ) : (
          <pre className="whitespace-pre-wrap break-words border-0 bg-transparent p-0 font-mono text-[12.5px] leading-relaxed text-on-surface">
            {bodyText || '(empty response)'}
          </pre>
        )}
      </div>
    </div>
  );
}
