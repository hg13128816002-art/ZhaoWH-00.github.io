import { createOpeningRenderer } from './opening/renderer.js';
import { OPENING_TIMING } from './opening/timing.js';
import { claimOpeningEntry } from './opening/entry.js';

type Universe = { setPaused(value: boolean): void } | undefined;

export function initHeroOpening(root: HTMLElement, universe: Universe) {
  const entry = document.documentElement.dataset.openingEntry ?? claimOpeningEntry();
  root.dataset.entry = entry;
  if (entry !== 'fresh') {
    root.hidden = true;
    root.dataset.state = 'skipped';
    root.dataset.revealed = 'true';
    document.body.dataset.heroOpening = 'revealed';
    universe?.setPaused(false);
    return { destroy() {} };
  }

  const stage = root.parentElement!;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = createOpeningRenderer(root, { reducedMotion: motion.matches });
  const events = new AbortController();
  const eventOptions = { signal: events.signal };
  let frame = 0, elapsed = 0, startedAt = 0;
  let ready = false, playing = false, disposed = false, revealing = false;
  let inView = stage.getBoundingClientRect().bottom > 0;

  function stopFrames() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  function currentTime() { return elapsed + (playing ? performance.now() - startedAt : 0); }
  function updatePicture(milliseconds = currentTime()) {
    renderer.render(milliseconds);
    if (!revealing && milliseconds >= OPENING_TIMING.revealStart * 1000) {
      revealing = true;
      universe?.setPaused(false);
    }
  }
  function finish() {
    playing = false;
    stopFrames();
    renderer.render(OPENING_TIMING.visualEnd * 1000);
    universe?.setPaused(false);
    root.dataset.revealed = 'true';
    document.body.dataset.heroOpening = 'revealed';
    root.dataset.state = 'finished';
    root.hidden = true;
  }
  function tick() {
    frame = 0;
    if (!playing || disposed) return;
    const milliseconds = currentTime();
    updatePicture(milliseconds);
    if (milliseconds >= OPENING_TIMING.visualEnd * 1000) { finish(); return; }
    frame = requestAnimationFrame(tick);
  }
  function pause() {
    if (!playing) return;
    elapsed = currentTime();
    playing = false;
    stopFrames();
    updatePicture(elapsed);
    root.dataset.state = 'paused';
  }
  function syncVisibility() {
    if (!ready || disposed || root.hidden) return;
    if (motion.matches) { finish(); return; }
    if (!inView || document.hidden || document.documentElement.dataset.pageTransition) { pause(); return; }
    if (playing) return;
    startedAt = performance.now();
    playing = true;
    root.dataset.state = 'playing';
    tick();
  }
  const resizeObserver = new ResizeObserver(() => {
    if (!disposed && !root.hidden) renderer.resize(root.clientWidth, root.clientHeight);
  });
  resizeObserver.observe(root);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncVisibility();
  });
  intersectionObserver.observe(stage);

  document.addEventListener('visibilitychange', syncVisibility, eventOptions);
  window.addEventListener('page-transition-start', pause, eventOptions);
  window.addEventListener('page-transition-end', syncVisibility, eventOptions);
  motion.addEventListener('change', () => {
    renderer.setReducedMotion(motion.matches);
    syncVisibility();
  }, eventOptions);
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) finish();
    else destroy();
  }, eventOptions);
  window.addEventListener('pageshow', syncVisibility, eventOptions);

  function destroy() {
    if (disposed) return;
    disposed = true;
    playing = false;
    events.abort();
    stopFrames();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
  }

  document.body.dataset.heroOpening = 'active';
  const pageReady = document.readyState === 'complete' ? Promise.resolve() :
    new Promise<void>(resolve => window.addEventListener('load', () => resolve(), { ...eventOptions, once: true }));
  Promise.all([window.fontsReadyPromise ?? Promise.resolve(), pageReady,
    window.pageTransitionReady ?? Promise.resolve()]).then(() => {
    if (disposed || root.hidden) return;
    ready = true;
    renderer.resize(root.clientWidth, root.clientHeight);
    renderer.render(0);
    syncVisibility();
  });
  return { destroy };
}
