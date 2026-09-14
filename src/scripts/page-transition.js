// Full document navigation: resume the same hourglass clock before the destination's first paint.
export function initPageTransition(root, renderer) {
  const storageKey = 'zhao-page-transition-v1';
  const closeDuration = 52*1000/60, openDuration = 48*1000/60, halfTurn = 900;
  const events = new AbortController(), options = {signal:events.signal};
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let state = 'idle', frame = 0, pageReady = false, departing = false, disposed = false;
  let closeStarted = 0, loopStarted = 0, exitAt = null, target = '';
  let resolveReveal;
  window.pageTransitionReady = new Promise(resolve => { resolveReveal = resolve; });
  const normalize = url => url.origin + (url.pathname.replace(/\/$/, '') || '/') + url.search;
  const current = new URL(window.location.href);
  const clearMarker = () => { try { window.sessionStorage.removeItem(storageKey); } catch {} };
  let incoming = null;
  try {
    const value = JSON.parse(window.sessionStorage.getItem(storageKey) || 'null');
    if (value && normalize(new URL(value.to)) === normalize(current) && Number.isFinite(value.started) &&
        Date.now()-value.started >= 0 && Date.now()-value.started < 120000) incoming = value;
  } catch { /* Navigation still works if session storage is unavailable. */ }
  clearMarker();
  let internalArrival = false;
  try {
    const from = new URL(document.referrer);
    const type = performance.getEntriesByType('navigation')[0]?.type;
    internalArrival = type !== 'reload' && from.origin === current.origin && normalize(from) !== normalize(current);
  } catch {}

  function setState(value) {
    state = value;
    root.dataset.transitionState = value;
    if (value === 'idle') delete document.documentElement.dataset.pageTransition;
    else document.documentElement.dataset.pageTransition = value;
  }
  function resize() { renderer.resize(window.innerWidth, window.innerHeight); }
  function stop() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  function requestFrame() {
    if (!frame && !disposed && !document.hidden && state !== 'idle') frame = requestAnimationFrame(tick);
  }
  function complete() {
    stop();
    root.hidden = true;
    departing = false;
    setState('idle');
    resolveReveal();
    window.dispatchEvent(new Event('page-transition-end'));
  }
  function navigate() {
    setState('loading');
    loopStarted = Date.now();
    renderer.draw('loading', 0, 0, motion.matches);
    try { window.sessionStorage.setItem(storageKey, JSON.stringify({to:target, started:loopStarted})); } catch {}
    try { window.location.assign(target); }
    catch { clearMarker(); departing = false; pageReady = true; }
  }
  function tick() {
    frame = 0;
    if (disposed || document.hidden || state === 'idle') return;
    const now = Date.now();
    if (state === 'closing') {
      const elapsed = now-closeStarted;
      renderer.draw('closing', Math.min(closeDuration, elapsed), 0, motion.matches);
      if (motion.matches || elapsed >= closeDuration) navigate();
    } else if (state === 'loading') {
      const elapsed = Math.max(0, now-loopStarted);
      if (pageReady && !departing && exitAt === null) exitAt = Math.max(halfTurn, Math.ceil(elapsed/halfTurn)*halfTurn);
      if (pageReady && !departing && motion.matches) { complete(); return; }
      if (exitAt !== null && elapsed >= exitAt) setState('opening');
      else renderer.draw('loading', elapsed, 0, motion.matches);
    }
    if (state === 'opening') {
      const elapsed = Math.max(0, now-loopStarted-exitAt);
      renderer.draw('opening', Math.min(openDuration, elapsed), exitAt, motion.matches);
      if (motion.matches || elapsed >= openDuration) { complete(); return; }
    }
    // Reduced-motion loading is a static Z; readiness/visibility changes wake it.
    if (!motion.matches || state === 'closing' || state === 'opening') requestFrame();
  }

  const warmed = new Set();
  function warmRoute(url) {
    const href = url.origin+url.pathname+url.search;
    if (warmed.has(href)) return;
    warmed.add(href);
    const link = document.createElement('link');
    link.rel = 'prefetch'; link.href = href;
    document.head.appendChild(link);
  }
  function transitionTo(href) {
    if (disposed || state !== 'idle') return;
    let url;
    try { url = new URL(href, window.location.href); } catch { return; }
    if (url.origin !== current.origin || !['http:', 'https:'].includes(url.protocol)) {
      window.location.assign(url.href);
      return;
    }
    target = url.href;
    departing = true;
    exitAt = null;
    root.hidden = false;
    closeStarted = Date.now();
    setState('closing');
    resize();
    renderer.draw('closing', 0, 0, motion.matches);
    window.dispatchEvent(new Event('page-transition-start'));
    warmRoute(url);
    if (motion.matches) navigate();
    requestFrame();
  }
  window.triggerPureTransition = transitionTo;
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target?.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    let url;
    try { url = new URL(link.href, window.location.href); } catch { return; }
    if (url.origin !== current.origin || !['http:', 'https:'].includes(url.protocol)) return;
    if (normalize(url) === normalize(current) && url.hash) return;
    event.preventDefault();
    transitionTo(url.href);
  }, options);
  window.addEventListener('resize', resize, options);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else requestFrame();
  }, options);
  motion.addEventListener('change', requestFrame, options);
  window.addEventListener('pagehide', event => {
    stop();
    if (!event.persisted) { disposed = true; events.abort(); }
  }, options);
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    // A cached outgoing document must reopen, never repeat its previous navigation.
    departing = false;
    pageReady = true;
    exitAt = null;
    loopStarted = Date.now();
    root.hidden = false;
    setState('loading');
    resize();
    renderer.draw('loading', 0, 0, motion.matches);
    window.dispatchEvent(new Event('page-transition-start'));
    requestFrame();
  }, options);

  resize();
  root.dataset.rendererReady = 'true';
  if (root.dataset.skipInitial === 'true' && !incoming && !internalArrival) complete();
  else {
    root.hidden = false;
    loopStarted = incoming?.started ?? Date.now();
    setState('loading');
    renderer.draw('loading', Math.max(0, Date.now()-loopStarted), 0, motion.matches);
    requestFrame();
  }
  const loaded = document.readyState === 'complete' ? Promise.resolve() :
    new Promise(resolve => window.addEventListener('load', resolve, {...options, once:true}));
  Promise.all([loaded, Promise.resolve(window.fontsReadyPromise).catch(() => {})])
    .then(() => window.pageTransitionContentReady)
    .catch(() => {})
    .then(() => {
      if (disposed) return;
      pageReady = true;
      requestFrame();
    });
}
