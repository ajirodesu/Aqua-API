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
  url: string;
  method: string;
  values: Record<string, string>;
}

export function CodeExample({ url, method, values }: Props) {
  const [lang, setLang] = useState<CodeLangId>(readStoredLang);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const activeTab = CODE_TABS.find((t) => t.id === lang) ?? CODE_TABS[0];

  const code = useMemo(() => activeTab.build(url, method, values), [activeTab, url, method, values]);

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
    <div className="overflow-hidden rounded-card border border-hairline bg-surface-container-low">
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-2.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-on-surface-variant">
          example.{activeTab.ext}
        </span>
        <button
          type="button"
          onClick={copy}
          className="flex shrink-0 items-center gap-1.5 rounded-[var(--radius-compact)] border border-hairline bg-surface-container-high px-2 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-on-surface transition-colors duration-fast hover:bg-surface-container-highest"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <div className="flex items-center gap-0 overflow-x-auto border-b border-hairline bg-surface-container-low px-2 pt-2">
        {CODE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setLang(tab.id)}
            className={`shrink-0 border-b-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors duration-fast ${
              tab.id === lang
                ? 'border-primary text-on-surface'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto bg-surface-container-lowest px-4 py-3">
        <pre
          className="border-0 bg-transparent p-0 font-mono text-[12.5px] leading-[1.6]"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    </div>
  );
}
