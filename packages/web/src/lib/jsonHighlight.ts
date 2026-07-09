/**
 * Lightweight JSON syntax highlighter — converts a JSON string into an HTML
 * string with color-coded tokens (keys, strings, numbers, booleans/null).
 * Avoids pulling in a full syntax-highlighting dependency for a single use case.
 */
export function highlightJson(json: string): string {
  const escaped = json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped.replace(
    /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(?:true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = 'text-json-number';
      if (/^"/.test(match)) {
        cls = /:\s*$/.test(match) ? 'text-json-key' : 'text-json-string';
      } else if (/true|false|null/.test(match)) {
        cls = 'text-json-boolean';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}
