export function initSelectedWorksMotion(section: HTMLElement) {
  const cards = [...section.querySelectorAll<HTMLElement>('.work-card')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !('IntersectionObserver' in window) || !cards[0]?.animate) return;

  const events = new AbortController();
  const animations = new Map<HTMLElement, Animation>();
  let nextStart = 0;
  cards.forEach(card => {
    card.dataset.entrance = 'pending';
    card.style.opacity = '0';
    card.style.transform = 'translate3d(0, 36px, 0)';
  });

  function show(card: HTMLElement) {
    const animation = animations.get(card);
    animations.delete(card);
    animation?.cancel();
    card.style.removeProperty('opacity');
    card.style.removeProperty('transform');
    card.dataset.entrance = 'done';
  }
  function reveal(card: HTMLElement) {
    if (card.dataset.entrance !== 'pending') return;
    observer.unobserve(card);
    const now = performance.now();
    const start = Math.max(now + 100, nextStart);
    nextStart = start + 130;
    card.dataset.entrance = 'revealing';
    const animation = card.animate([
      { opacity: 0, transform: 'translate3d(0, 36px, 0)' },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' },
    ], { duration: 720, delay: start - now, easing: 'cubic-bezier(.2, .7, .25, 1)', fill: 'both' });
    animations.set(card, animation);
    animation.finished.then(() => show(card), () => {});
  }
  const observer = new IntersectionObserver(entries => {
    entries.filter(entry => entry.isIntersecting)
      .sort((a, b) => cards.indexOf(a.target as HTMLElement) - cards.indexOf(b.target as HTMLElement))
      .forEach(entry => reveal(entry.target as HTMLElement));
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
  cards.forEach(card => observer.observe(card));

  // Keyboard focus exposes its card immediately, including during the stagger delay.
  section.addEventListener('focusin', event => {
    const card = (event.target as HTMLElement).closest<HTMLElement>('.work-card');
    if (card) { observer.unobserve(card); show(card); }
  }, { signal: events.signal });
  motion.addEventListener('change', () => {
    if (motion.matches) { observer.disconnect(); cards.forEach(show); }
  }, { signal: events.signal });
  window.addEventListener('pagehide', () => {
    observer.disconnect();
    cards.forEach(show);
    events.abort();
  }, { once: true });
}
