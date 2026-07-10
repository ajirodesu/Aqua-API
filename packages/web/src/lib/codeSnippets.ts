import type { HighlightLang } from './codeHighlight';

export type CodeLangId = 'curl' | 'node' | 'typescript' | 'python' | 'axios';

/** Replaces base64 data-URI values (from the media upload widget) with a
 *  short placeholder — dumping a multi-KB base64 blob into a code sample
 *  would make it unreadable and useless as a copy-paste reference. */
function displayValues(values: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    out[key] = value.startsWith('data:') ? '<base64_encoded_file>' : value;
  }
  return out;
}

function isBodyMethod(method: string): boolean {
  const upper = method.toUpperCase();
  return upper !== 'GET' && upper !== 'DELETE';
}

export function buildCurl(url: string, method: string, values: Record<string, string>): string {
  const upper = method.toUpperCase();
  const clean = displayValues(values);
  const entries = Object.entries(clean);

  if (!isBodyMethod(upper)) {
    const qs = new URLSearchParams(entries).toString();
    return `curl -X ${upper} "${url}${qs ? `?${qs}` : ''}"`;
  }

  const form = new URLSearchParams(entries).toString();
  return [
    `curl -X ${upper} "${url}" \\`,
    `  -H "Content-Type: application/x-www-form-urlencoded" \\`,
    `  -d "${form}"`,
  ].join('\n');
}

export function buildNode(url: string, method: string, values: Record<string, string>): string {
  const upper = method.toUpperCase();
  const clean = displayValues(values);
  const entries = Object.entries(clean);

  if (!isBodyMethod(upper)) {
    const qs = new URLSearchParams(entries).toString();
    const full = qs ? `${url}?${qs}` : url;
    return [
      `const res = await fetch("${full}"${upper === 'DELETE' ? ', { method: "DELETE" }' : ''});`,
      `const data = await res.json();`,
      ``,
      `console.log(data);`,
    ].join('\n');
  }

  const body = entries.length
    ? `new URLSearchParams({\n${entries.map(([k, v]) => `    ${k}: "${v}",`).join('\n')}\n  }).toString()`
    : `""`;

  return [
    `const res = await fetch("${url}", {`,
    `  method: "${upper}",`,
    `  headers: { "Content-Type": "application/x-www-form-urlencoded" },`,
    `  body: ${body},`,
    `});`,
    `const data = await res.json();`,
    ``,
    `console.log(data);`,
  ].join('\n');
}

export function buildTypeScript(url: string, method: string, values: Record<string, string>): string {
  const upper = method.toUpperCase();
  const clean = displayValues(values);
  const entries = Object.entries(clean);

  const header = [`interface ApiResponse {`, `  [key: string]: unknown;`, `}`, ``];

  if (!isBodyMethod(upper)) {
    const qs = new URLSearchParams(entries).toString();
    const full = qs ? `${url}?${qs}` : url;
    return [
      ...header,
      `const res: Response = await fetch("${full}"${upper === 'DELETE' ? ', { method: "DELETE" }' : ''});`,
      `const data: ApiResponse = await res.json();`,
      ``,
      `console.log(data);`,
    ].join('\n');
  }

  const body = entries.length
    ? `new URLSearchParams({\n${entries.map(([k, v]) => `    ${k}: "${v}",`).join('\n')}\n  }).toString()`
    : `""`;

  return [
    ...header,
    `const res: Response = await fetch("${url}", {`,
    `  method: "${upper}",`,
    `  headers: { "Content-Type": "application/x-www-form-urlencoded" },`,
    `  body: ${body},`,
    `});`,
    `const data: ApiResponse = await res.json();`,
    ``,
    `console.log(data);`,
  ].join('\n');
}

export function buildPython(url: string, method: string, values: Record<string, string>): string {
  const upper = method.toUpperCase();
  const clean = displayValues(values);
  const entries = Object.entries(clean);
  const lower = upper.toLowerCase();

  const dict = entries.length
    ? `{\n${entries.map(([k, v]) => `    "${k}": "${v}",`).join('\n')}\n}`
    : `{}`;

  const call = !isBodyMethod(upper)
    ? `requests.${lower}("${url}", params=${dict})`
    : `requests.${lower}("${url}", data=${dict})`;

  return [`import requests`, ``, `response = ${call}`, `data = response.json()`, ``, `print(data)`].join('\n');
}

export function buildAxios(url: string, method: string, values: Record<string, string>): string {
  const upper = method.toUpperCase();
  const clean = displayValues(values);
  const entries = Object.entries(clean);
  const lower = upper.toLowerCase();

  if (!isBodyMethod(upper)) {
    const params = entries.length
      ? `{\n${entries.map(([k, v]) => `    ${k}: "${v}",`).join('\n')}\n  }`
      : `{}`;
    return [
      `import axios from "axios";`,
      ``,
      `const { data } = await axios.${lower}("${url}", {`,
      `  params: ${params},`,
      `});`,
      ``,
      `console.log(data);`,
    ].join('\n');
  }

  const body = entries.length
    ? `new URLSearchParams({\n${entries.map(([k, v]) => `    ${k}: "${v}",`).join('\n')}\n  })`
    : `new URLSearchParams()`;

  return [
    `import axios from "axios";`,
    ``,
    `const { data } = await axios.${lower}(`,
    `  "${url}",`,
    `  ${body},`,
    `  { headers: { "Content-Type": "application/x-www-form-urlencoded" } }`,
    `);`,
    ``,
    `console.log(data);`,
  ].join('\n');
}

export interface CodeTab {
  id: CodeLangId;
  label: string;
  ext: string;
  highlightLang: HighlightLang;
  build: (url: string, method: string, values: Record<string, string>) => string;
}

export const CODE_TABS: CodeTab[] = [
  { id: 'curl', label: 'cURL', ext: 'sh', highlightLang: 'bash', build: buildCurl },
  { id: 'node', label: 'Node.js', ext: 'js', highlightLang: 'javascript', build: buildNode },
  { id: 'typescript', label: 'TypeScript', ext: 'ts', highlightLang: 'typescript', build: buildTypeScript },
  { id: 'python', label: 'Python', ext: 'py', highlightLang: 'python', build: buildPython },
  { id: 'axios', label: 'Axios', ext: 'js', highlightLang: 'javascript', build: buildAxios },
];
