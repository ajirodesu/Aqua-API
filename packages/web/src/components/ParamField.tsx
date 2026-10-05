import { useRef, useState } from 'react';
import { Image as ImageIcon, Upload, X } from 'lucide-react';
import type { ApiParam } from '../lib/types';

interface Props {
  param: ApiParam;
  value: string;
  onChange: (value: string) => void;
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

export function ParamField({ param, value, onChange, method }: Props) {
  const type = param.type ?? (param.options?.length ? 'select' : 'text');
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');

  const isMedia = MEDIA_TYPES.has(type);
  const canUpload = UPLOAD_METHODS.has(method.toUpperCase());
  const isUploadWidget = isMedia && canUpload;
  const showUseExample = Boolean(param.example) && type !== 'select' && type !== 'password' && !isUploadWidget;

  async function handleFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="relative w-full">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <label className="block text-[13px] font-medium text-on-surface">
          {param.name}
          {param.required && <span className="ml-0.5 text-error">*</span>}
        </label>
        {showUseExample && (
          <button
            type="button"
            onClick={() => onChange(String(param.example))}
            className="text-[11px] font-medium text-primary transition-colors hover:text-primary/80"
          >
            use example
          </button>
        )}
      </div>

      {param.desc && <p className="mb-2 mt-1.5 text-[13px] leading-snug text-on-surface-variant">{param.desc}</p>}

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
          {!canUpload ? (
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
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-input border-2 border-dashed border-outline-variant text-on-surface-variant transition-colors duration-fast hover:border-primary hover:text-primary"
              >
                {value.startsWith('data:image') ? (
                  <img src={value} alt="" className="h-full w-full rounded-compact object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6" strokeWidth={1.6} />
                )}
              </button>
              <div className="flex-1">
                <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary !px-4 !py-2 text-[13px]">
                  <Upload className="h-3.5 w-3.5" strokeWidth={2} />
                  Choose {type}
                </button>
                {fileName && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-on-surface-variant">
                    {fileName}
                    <button
                      type="button"
                      onClick={() => {
                        setFileName('');
                        onChange('');
                        if (inputRef.current) inputRef.current.value = '';
                      }}
                      className="text-on-surface-variant transition-colors hover:text-error"
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
          type={type === 'number' ? 'number' : type === 'password' ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={param.example}
          autoComplete={type === 'password' ? 'off' : undefined}
          className="input-field font-mono text-[13px]"
        />
      )}
    </div>
  );
}
