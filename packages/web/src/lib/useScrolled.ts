import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/**
 * Tracks whether the page has been scrolled past `threshold` pixels.
 *
 * Listens to BOTH the window and the given ref's own scroll, and reports
 * scrolled as soon as either passes the threshold. This is deliberate: on
 * the desktop split-pane layout the ref (the content pane) owns the
 * scrolling, but at narrower breakpoints that pane is left in normal
 * document flow on purpose — so the browser's own chrome (address bar /
 * toolbar) can collapse on scroll, the way it does on an ordinary page —
 * and the window is what actually scrolls there instead. Listening to both
 * means the header's "scrolled" styling stays correct across that switch
 * without needing a JS media-query check.
 */
export function useScrolled(ref?: RefObject<HTMLElement>, threshold = 4): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function read(): number {
      const winY = window.scrollY;
      const elY = ref?.current?.scrollTop ?? 0;
      return Math.max(winY, elY);
    }

    function onScroll() {
      setScrolled(read() > threshold);
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const el = ref?.current;
    el?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      el?.removeEventListener('scroll', onScroll);
    };
  }, [ref, threshold]);

  return scrolled;
}
