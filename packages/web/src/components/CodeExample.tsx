import { useEffect, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { CODE_TABS, type CodeLangId } from '../lib/codeSnippets';
import { highlightCode, withLineNumbers } from '../lib/codeHighlight';

const STORAGE_KEY = 'aqua_code_lang';

function readStoredLang(): CodeLangId {
  if (typeof window === 'undefined') return 'curl';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return CODE_TABS.some((t) => t.id === stored) ? (stored as CodeLangId) : 'curl';
}

interface Props {
  /** Public, absolute endpoint URL (already stripped of the query string). */
  url: string;
  method: string;
  values: Record<string, string>;
}

/**
 * A first-class, editor-styled code example panel: language tabs (persisted
 * across visits), a titlebar with the generated filename, line numbers, and
 * a copy button — replaces the old single collapsible "View as curl" block.
 */
export function CodeExample({ url, method, values }: Props) {
  const [lang, setLang] = useState<CodeLangId>(readStoredLang);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const activeTab = CODE_TABS.find((t) => t.id === lang) ?? CODE_TABS[0];

  const code = useMemo(
    () => activeTab.build(url, method, values),
    [activeTab, url, method, values]
  );

  const highlighted = useMemo(
    () => withLineNumbers(highlightCode(code, activeTab.highlightLang)),
    [code, activeTab]
  );

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d1420] shadow-ios-md">
      {/* Titlebar — traffic-light dots, generated filename, copy action */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[.03] px-4 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          </div>
          <span className="font-mono text-[12px] text-slate-500">example.{activeTab.ext}</span>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1.5 text-[11.5px] font-medium text-slate-300 transition-colors duration-200 hover:bg-white/10"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Editor-style language tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/10 bg-white/[.015] px-2 pt-2">
        {CODE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setLang(tab.id)}
            className={`shrink-0 rounded-t-lg px-3.5 py-2 text-[12.5px] font-semibold transition-colors duration-200 ${
              tab.id === lang
                ? 'border-b-2 border-aqua-400 bg-white/[.04] text-white'
                : 'border-b-2 border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Highlighted, line-numbered code */}
      <div className="overflow-x-auto px-4 py-3">
        <pre
          className="font-mono text-[12.5px] leading-[1.5]"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    </div>
  );
}
