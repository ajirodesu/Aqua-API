import { useRef, useState } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import type { ApiParam } from '../lib/types';

interface Props {
  param: ApiParam;
  value: string;
  onChange: (value: string) => void;
  /** Current HTTP method selected for this request — uploads are only offered for POST/PUT. */
  method: string;
}

const MEDIA_TYPES = new Set(['image', 'file', 'audio', 'video']);
const UPLOAD_METHODS = new Set(['POST', 'PUT']);

function accepterFor(type: string): string {
  if (type === 'image') return 'image/*';
  if (type === 'audio') return 'audio/*';
  if (type === 'video') return 'video/*';
  return '*/*';
}

/** Renders a single labeled input matching the endpoint's declared param type. */
export function ParamField({ param, value, onChange, method }: Props) {
  const type = param.type ?? (param.options?.length ? 'select' : 'text');
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [mode, setMode] = useState<'url' | 'upload'>('url');

  const isMedia = MEDIA_TYPES.has(type);
  const canUpload = UPLOAD_METHODS.has(method.toUpperCase());
  const isUploadWidget = isMedia && canUpload && mode === 'upload';

  // "Use example" shows for every field that takes a typed/pasted value —
  // as long as an example was provided — regardless of whether the value
  // already matches it. It only stays hidden for selects (nothing to
  // prefill) and the upload widget (no text value involved there).
  const showUseExample = Boolean(param.example) && type !== 'select' && !isUploadWidget;

  async function handleFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[13px] font-semibold text-slate-200">
          {param.name}
          {param.required && <span className="ml-1 text-aqua-400">*</span>}
        </label>
        {showUseExample && (
          <button
            type="button"
            onClick={() => onChange(String(param.example))}
            className="text-[11px] font-medium text-aqua-400 transition-colors hover:text-aqua-300"
          >
            use example
          </button>
        )}
      </div>

      {param.desc && <p className="text-[12px] leading-snug text-slate-500">{param.desc}</p>}

      {type === 'select' && param.options ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field appearance-none">
          <option value="" disabled>
            Choose an option…
          </option>
          {param.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.example}
          rows={4}
          className="input-field resize-y font-mono text-[13px]"
        />
      ) : isMedia ? (
        <div>
          {canUpload && (
            <div className="mb-2 inline-flex rounded-full bg-white/5 p-0.5 text-[12px] font-semibold">
              <button
                type="button"
                onClick={() => setMode('url')}
                className={`rounded-full px-3 py-1 transition-colors duration-200 ${
                  mode === 'url' ? 'bg-surface-card text-white shadow-ios-sm' : 'text-slate-400'
                }`}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={`rounded-full px-3 py-1 transition-colors duration-200 ${
                  mode === 'upload' ? 'bg-surface-card text-white shadow-ios-sm' : 'text-slate-400'
                }`}
              >
                Upload
              </button>
            </div>
          )}

          {(!canUpload || mode === 'url') ? (
            <input
              value={value.startsWith('data:') ? '' : value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={param.example ?? 'https://…'}
              className="input-field font-mono text-[13px]"
            />
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-white/15 text-slate-500 transition-colors duration-200 hover:border-aqua-400 hover:text-aqua-400"
              >
                {value.startsWith('data:image') ? (
                  <img src={value} alt="" className="h-full w-full rounded-[10px] object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6" strokeWidth={1.6} />
                )}
              </button>
              <div className="flex-1">
                <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary !px-4 !py-2 text-[13px]">
                  <Upload className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Choose {type}
                </button>
                {fileName && (
                  <p className="mt-1.5 flex items-center gap-1 text-[12px] text-slate-500">
                    {fileName}
                    <button
                      type="button"
                      onClick={() => {
                        setFileName('');
                        onChange('');
                        if (inputRef.current) inputRef.current.value = '';
                      }}
                      className="text-slate-500 transition-colors hover:text-rose-400"
                      aria-label="Remove file"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </p>
                )}
              </div>
              <input
                ref={inputRef}
                type="file"
                accept={accepterFor(type)}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
        </div>
      ) : (
        <input
          type={type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.example}
          className="input-field font-mono text-[13px]"
        />
      )}
    </div>
  );
}
