import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Tracks whether the given scrollable element (or the window, if no ref is
 * passed) has been scrolled past `threshold` pixels. Used to keep headers
 * fully transparent at the very top of a page and only reveal their
 * background/contents once the person actually starts scrolling.
 */
export function useScrolled(ref?: RefObject<HTMLElement>, threshold = 4): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const target: HTMLElement | Window = ref?.current ?? window;

    function read(): number {
      if (target === window) return window.scrollY;
      return (target as HTMLElement).scrollTop;
    }

    function onScroll() {
      setScrolled(read() > threshold);
    }

    onScroll();
    target.addEventListener('scroll', onScroll, { passive: true });
    return () => target.removeEventListener('scroll', onScroll);
  }, [ref, threshold]);

  return scrolled;
}
