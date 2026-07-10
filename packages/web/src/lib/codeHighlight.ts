/**
 * Lightweight multi-language syntax highlighter for the code-example panel.
 * Reuses the same `text-json-*` color tokens as the JSON response
 * highlighter so request examples and response bodies share one palette,
 * instead of pulling in a full highlighting library for a handful of
 * generated snippets.
 */

export type HighlightLang = 'bash' | 'javascript' | 'typescript' | 'python';

interface LangRules {
  comment: string;
  keyword: string;
  /** CLI-style flags, e.g. -X, --header (bash only). */
  flag?: string;
}

const RULES: Record<HighlightLang, LangRules> = {
  bash: {
    comment: '#.*',
    keyword: '\\bcurl\\b',
    flag: '-{1,2}[A-Za-z][\\w-]*',
  },
  javascript: {
    comment: '//.*|/\\*[\\s\\S]*?\\*/',
    keyword:
      '\\b(?:const|let|var|async|await|function|return|import|from|export|default|new|if|else|try|catch|of|in|null|true|false)\\b',
  },
  typescript: {
    comment: '//.*|/\\*[\\s\\S]*?\\*/',
    keyword:
      '\\b(?:const|let|var|async|await|function|return|import|from|export|default|new|if|else|try|catch|of|in|interface|type|as|void|null|true|false)\\b',
  },
  python: {
    comment: '#.*',
    keyword:
      '\\b(?:import|from|as|def|return|if|elif|else|for|in|try|except|with|async|await|class|None|True|False|print)\\b',
  },
};

/** Escapes HTML-sensitive characters before tokenizing. */
function escapeHtml(code: string): string {
  return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlightCode(code: string, lang: HighlightLang): string {
  const escaped = escapeHtml(code);
  const rules = RULES[lang];

  const parts = [
    `(?<comment>${rules.comment})`,
    `(?<string>\`(?:\\\\.|[^\`\\\\])*\`|"(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*')`,
    rules.flag ? `(?<flag>${rules.flag})` : null,
    `(?<keyword>${rules.keyword})`,
    `(?<number>\\b\\d+(?:\\.\\d+)?\\b)`,
    `(?<func>\\b[A-Za-z_$][\\w$]*(?=\\())`,
  ].filter((p): p is string => Boolean(p));

  const pattern = new RegExp(parts.join('|'), 'gm');

  return escaped.replace(pattern, (match: string, ...rest: unknown[]) => {
    const groups = rest[rest.length - 1] as Record<string, string | undefined>;
    if (groups?.comment) return `<span class="text-json-punct">${match}</span>`;
    if (groups?.string) return `<span class="text-json-string">${match}</span>`;
    if (groups?.flag) return `<span class="text-json-key">${match}</span>`;
    if (groups?.keyword) return `<span class="text-json-boolean">${match}</span>`;
    if (groups?.number) return `<span class="text-json-number">${match}</span>`;
    if (groups?.func) return `<span class="text-json-key">${match}</span>`;
    return match;
  });
}

/** Wraps already-highlighted HTML with a leading line-number column per line.
 *  Each line renders as its own block-level grid row, so the lines are
 *  joined with an empty string rather than `\n` — inside a `<pre>` (which
 *  preserves whitespace) an extra literal newline on top of the block break
 *  would double the vertical gap between every line. */
export function withLineNumbers(highlightedHtml: string): string {
  const lines = highlightedHtml.split('\n');
  return lines
    .map(
      (line, i) =>
        `<span class="grid grid-cols-[2.25rem_1fr]"><span class="select-none pr-3 text-right text-slate-600">${
          i + 1
        }</span><span class="whitespace-pre">${line || ' '}</span></span>`
    )
    .join('');
}
