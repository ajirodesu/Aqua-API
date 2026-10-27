/**
 * GifFrame — responsive, layout-stable frame for the public hero GIF.
 *
 * Geometry: the caller controls the frame width (e.g. config.header.imageSize);
 * the media box derives its height from the GIF's real aspect ratio. Nothing is
 * cropped, stretched, letterboxed, or left as empty frame space, so any GIF —
 * square, portrait, or ultrawide — fits exactly.
 *
 * Stability: the ratio is cached per URL in localStorage, so repeat visits
 * reserve the correct height before the image decodes. The first view uses a
 * 16:9 placeholder until the first frame loads, then settles on the exact
 * ratio. The image fades in only once decoded, avoiding a half-painted frame.
 *
 * Efficiency: native lazy loading (opt out for the above-the-fold hero),
 * async decoding, and the browser only downloads the GIF once per URL.
 */

import { useEffect, useState, type SyntheticEvent } from 'react';
import { cn } from '../lib/cn';
import { H_STATUS_SQUARE } from '../lib/shell';

const RATIO_CACHE_PREFIX = 'aqua:gif-ratio:v1:';

function readCachedRatio(src: string): number | null {
  try {
    const raw = window.localStorage.getItem(RATIO_CACHE_PREFIX + src);
    if (!raw) return null;
    const ratio = Number.parseFloat(raw);
    return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
  } catch {
    return null;
  }
}

function cacheRatio(src: string, ratio: number): void {
  try {
    window.localStorage.setItem(RATIO_CACHE_PREFIX + src, ratio.toFixed(6));
  } catch {
    // Cache is best-effort — the frame still settles on the real ratio.
  }
}

interface GifFrameProps {
  src: string;
  alt?: string;
  /** Width/position classes supplied by the caller. */
  className?: string;
  /** Caption left side. */
  label?: string;
  /** Caption right side (shown next to the status square). */
  status?: string;
  loading?: 'lazy' | 'eager';
}

export function GifFrame({
  src,
  alt = '',
  className,
  label = 'TRANSMISSION / 01',
  status = 'Live',
  loading = 'lazy',
}: GifFrameProps) {
  const [ratio, setRatio] = useState<number | null>(() => readCachedRatio(src));
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  // A new URL starts from its own cached ratio (or the 16:9 placeholder).
  useEffect(() => {
    setRatio(readCachedRatio(src));
    setLoaded(false);
    setFailed(false);
  }, [src]);

  function handleLoad(event: SyntheticEvent<HTMLImageElement>): void {
    const image = event.currentTarget;
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
      const next = image.naturalWidth / image.naturalHeight;
      setRatio(next);
      cacheRatio(src, next);
    }
    setLoaded(true);
  }

  return (
    <figure
      className={cn(
        'm-0 max-w-full self-start overflow-hidden border border-hairline bg-surface-container-low',
        className
      )}
    >
      <div
        className="relative w-full overflow-hidden bg-surface-container-high"
        style={{ aspectRatio: String(ratio ?? 16 / 9) }}
      >
        {failed ? (
          <div className="absolute inset-0 grid place-items-center px-3 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-on-surface-variant">
            GIF unavailable
          </div>
        ) : (
          <img
            key={src}
            src={src}
            alt={alt}
            loading={loading}
            decoding="async"
            draggable={false}
            onLoad={handleLoad}
            onError={() => {
              setFailed(true);
              setLoaded(false);
            }}
            className={cn(
              'absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ease-standard',
              loaded ? 'opacity-100' : 'opacity-0'
            )}
          />
        )}
      </div>

      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-hairline px-3 py-2">
        <span className="min-w-0 font-mono text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
          {label}
        </span>
        <span
          className={cn(
            'ml-auto flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em]',
            failed ? 'text-warning' : 'text-success'
          )}
        >
          <span className={cn(H_STATUS_SQUARE, failed ? 'bg-warning' : 'bg-success')} aria-hidden="true" />
          {failed ? 'Unavailable' : status}
        </span>
      </figcaption>
    </figure>
  );
}
