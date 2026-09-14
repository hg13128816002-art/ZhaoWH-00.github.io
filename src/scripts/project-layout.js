// Lay out only projects near the viewport; read all geometry before writing any styles.
export function initProjectLayout() {
  const entries = [...document.querySelectorAll('.project-entry')];
  const records = new Map(entries.map(entry => [entry, {
    entry,
    strip:entry.querySelector('.thumb-strip'),
    text:entry.querySelector('.right-panel section .section:last-of-type .section-text') ||
      entry.querySelector('.right-panel section .section-text:last-of-type'),
  }]));
  const active = new Set(), dirty = new Set();
  const events = new AbortController(), options = {signal:events.signal};
  let frame = 0, fontsReady = false, disposed = false, initialDone = false;
  let resolveInitial;
  window.pageTransitionContentReady = new Promise(resolve => { resolveInitial = resolve; });
  const desktop = window.matchMedia('(min-width: 768px)');

  function measure() {
    frame = 0;
    if (!fontsReady || disposed || document.hidden) return;
    const updates = [];
    for (const entry of dirty) {
      if (!active.has(entry)) continue;
      const {strip, text} = records.get(entry);
      if (!desktop.matches) { updates.push({entry, offset:null}); continue; }
      if (!strip || !text) continue;
      const margin = Number.parseFloat(getComputedStyle(strip).marginTop) || 0;
      const stripRect = strip.getBoundingClientRect(), textRect = text.getBoundingClientRect();
      const offset = Math.max(8, textRect.bottom-stripRect.top+margin-stripRect.height);
      if (Math.abs(offset-margin) > .25) updates.push({entry, offset});
    }
    dirty.clear();
    for (const {entry, offset} of updates) {
      if (offset === null) {
        for (const property of ['--thumb-offset','--footer-top-gap','--footer-bottom-gap']) {
          if (entry.style.getPropertyValue(property)) entry.style.removeProperty(property);
        }
      } else entry.style.setProperty('--thumb-offset', `${offset}px`);
    }
    if (!initialDone) {
      initialDone = true;
      // Let the first layout paint under the closed gate before starting its reveal.
      requestAnimationFrame(() => resolveInitial());
    }
  }
  function schedule(entry) {
    if (entry && active.has(entry)) dirty.add(entry);
    if (!frame && dirty.size && fontsReady && !disposed && !document.hidden) frame = requestAnimationFrame(measure);
  }
  function scheduleActive() { for (const entry of active) schedule(entry); }
  function activateTarget() {
    let id = '';
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch {}
    const entry = entries.find(entry => entry.id === id) || entries[0];
    if (entry) { active.add(entry); schedule(entry); }
  }

  const visible = new IntersectionObserver(changes => {
    for (const change of changes) {
      if (change.isIntersecting) { active.add(change.target); schedule(change.target); }
      else active.delete(change.target);
    }
  }, {rootMargin:'400px 0px'});
  for (const entry of entries) visible.observe(entry);
  const sizes = new WeakMap();
  const resized = new ResizeObserver(changes => {
    for (const {target, contentRect} of changes) {
      const previous = sizes.get(target);
      if (previous && Math.abs(previous.width-contentRect.width) < .25 && Math.abs(previous.height-contentRect.height) < .25) continue;
      sizes.set(target, {width:contentRect.width, height:contentRect.height});
      schedule(target.closest('.project-entry'));
    }
  });
  // Margin writes change the stretched panels' height, but not these intrinsic content boxes.
  for (const {strip, text} of records.values()) {
    if (strip) resized.observe(strip);
    if (text) resized.observe(text);
  }
  for (const image of document.querySelectorAll('.project-entry img')) {
    if (!image.complete) image.addEventListener('load', () => schedule(image.closest('.project-entry')), {...options, once:true});
  }
  window.addEventListener('resize', scheduleActive, options);
  window.visualViewport?.addEventListener('resize', scheduleActive, options);
  window.addEventListener('hashchange', activateTarget, options);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (frame) cancelAnimationFrame(frame); frame = 0; }
    else scheduleActive();
  }, options);
  window.addEventListener('pageshow', scheduleActive, options);
  window.addEventListener('pagehide', event => {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (!event.persisted) { disposed = true; events.abort(); visible.disconnect(); resized.disconnect(); }
  }, options);
  activateTarget();
  Promise.resolve(window.fontsReadyPromise ?? document.fonts?.ready).catch(() => {}).then(() => {
    if (disposed) return;
    fontsReady = true;
    scheduleActive();
  });
  document.fonts?.ready.then(scheduleActive);
}
