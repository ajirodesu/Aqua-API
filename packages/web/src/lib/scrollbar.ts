/**
 * Any element that scrolls (window, sidebar, response console, etc.) gets a
 * `.scrolling` class for a brief window after a scroll event, then it's
 * removed again. Paired with the CSS in index.css, this keeps scrollbars
 * invisible until the user is actually scrolling.
 */
export function initScrollbarAutoHide(): void {
  const timers = new WeakMap<EventTarget, ReturnType<typeof setTimeout>>();

  const onScroll = (event: Event) => {
    const target = event.target === document ? document.documentElement : event.target;
    if (!(target instanceof Element)) return;

    target.classList.add('scrolling');

    const existing = timers.get(target);
    if (existing) clearTimeout(existing);

    timers.set(
      target,
      setTimeout(() => {
        target.classList.remove('scrolling');
      }, 700)
    );
  };

  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
}
