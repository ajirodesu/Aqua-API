/**
 * Renders a JSON value as colorized, indented text — keys, strings, numbers,
 * booleans and null each get their own color, similar to a code editor's
 * JSON syntax highlighting. No external dependency required.
 */
export function JsonViewer({ value }: { value: unknown }) {
  const text = JSON.stringify(value, null, 2);
  const tokens = tokenize(text);

  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed">
      {tokens.map((t, i) => (
        <span key={i} className={colorFor(t.type)}>
          {t.text}
        </span>
      ))}
    </pre>
  );
}

type TokenType = 'punctuation' | 'key' | 'string' | 'number' | 'boolean' | 'null' | 'plain';

interface Token {
  type: TokenType;
  text: string;
}

const JSON_TOKEN_RE =
  /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)|\b(true|false)\b|\bnull\b|-?\d+(\.\d+)?([eE][+-]?\d+)?/g;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  JSON_TOKEN_RE.lastIndex = 0;
  while ((match = JSON_TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'punctuation', text: text.slice(lastIndex, match.index) });
    }

    const raw = match[0];
    if (raw.startsWith('"')) {
      const isKey = /:\s*$/.test(raw);
      tokens.push({ type: isKey ? 'key' : 'string', text: raw });
    } else if (raw === 'true' || raw === 'false') {
      tokens.push({ type: 'boolean', text: raw });
    } else if (raw === 'null') {
      tokens.push({ type: 'null', text: raw });
    } else {
      tokens.push({ type: 'number', text: raw });
    }

    lastIndex = JSON_TOKEN_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'punctuation', text: text.slice(lastIndex) });
  }

  return tokens;
}

function colorFor(type: TokenType): string {
  switch (type) {
    case 'key':
      return 'text-aqua-300';
    case 'string':
      return 'text-emerald-400';
    case 'number':
      return 'text-amber-300';
    case 'boolean':
      return 'text-fuchsia-400';
    case 'null':
      return 'text-rose-400';
    default:
      return 'text-slate-400';
  }
}
