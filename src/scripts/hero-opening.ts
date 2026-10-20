import { claimOpeningEntry } from './opening/entry.js';
import { createVideoReveal } from './opening/video-reveal.js';

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

  const video = root.querySelector<HTMLVideoElement>('[data-opening-video]')!;
  const stage = root.parentElement!;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reveal = createVideoReveal(root);
  const events = new AbortController();
  const options = { signal: events.signal };
  let pageReady = false, mediaReady = false, disposed = false, finished = false;
  let revealing = false, playPending = false, sourceVersion = 0, pendingTime = 0;
  let inView = stage.getBoundingClientRect().bottom > 0;
  let frame = 0;
  let frameType: 'video' | 'animation' = 'animation';
  let resizeObserver: ResizeObserver | undefined;
  let intersectionObserver: IntersectionObserver | undefined;
  let themeObserver: MutationObserver | undefined;
  let loadTimer = 0;

  video.muted = true;
  video.defaultMuted = true;
  video.playbackRate = 1;

  function stopFrame() {
    if (!frame) return;
    if (frameType === 'video') video.cancelVideoFrameCallback(frame);
    else cancelAnimationFrame(frame);
    frame = 0;
  }
  function paint(seconds = video.currentTime) {
    if (reveal.render(seconds) && !revealing) {
      revealing = true;
      root.dataset.revealing = 'true';
      universe?.setPaused(false);
    }
  }
  function scheduleFrame() {
    if (frame || disposed || finished || video.paused) return;
    if (typeof video.requestVideoFrameCallback === 'function') {
      frameType = 'video';
      frame = video.requestVideoFrameCallback((_now, metadata) => {
        frame = 0;
        if (disposed || finished) return;
        paint(metadata.mediaTime);
        scheduleFrame();
      });
    } else {
      frameType = 'animation';
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (disposed || finished) return;
        paint();
        scheduleFrame();
      });
    }
  }
  function pause() {
    video.pause();
    stopFrame();
    if (!finished && !disposed && mediaReady) root.dataset.state = 'paused';
  }
  function releaseMedia() {
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
  function cleanup() {
    if (disposed) return;
    disposed = true;
    events.abort();
    stopFrame();
    window.clearTimeout(loadTimer);
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
    themeObserver?.disconnect();
    releaseMedia();
  }
  function finish() {
    if (finished || disposed) return;
    finished = true;
    root.dataset.revealed = 'true';
    root.dataset.state = 'finished';
    root.hidden = true;
    document.body.dataset.heroOpening = 'revealed';
    universe?.setPaused(false);
    cleanup();
  }
  function canPlay() {
    return pageReady && mediaReady && inView && !document.hidden &&
      !document.documentElement.dataset.pageTransition && !disposed && !finished;
  }
  function syncVisibility() {
    if (disposed || finished) return;
    if (motion.matches) { finish(); return; }
    if (!canPlay()) { pause(); return; }
    if (playPending || !video.paused) return;
    const version = sourceVersion;
    playPending = true;
    video.play().then(() => {
      if (version !== sourceVersion || disposed || finished) return;
      playPending = false;
      if (!canPlay()) { pause(); return; }
      root.dataset.state = 'playing';
      scheduleFrame();
    }, error => {
      if (version !== sourceVersion || disposed || finished) return;
      playPending = false;
      // An interrupted play is retried after visibility/source readiness changes.
      if (error?.name === 'AbortError') { syncVisibility(); return; }
      finish();
    });
  }
  function chooseSource() {
    if (disposed || finished) return;
    const theme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
    if (root.dataset.theme === theme) return;
    pendingTime = mediaReady ? video.currentTime : pendingTime;
    ++sourceVersion;
    playPending = false;
    mediaReady = false;
    pause();
    root.dataset.theme = theme;
    root.dataset.state = 'loading';
    root.dataset.mediaReady = 'false';
    video.preload = 'auto';
    video.src = theme === 'light' ? root.dataset.lightSrc! : root.dataset.darkSrc!;
    video.load();
    window.clearTimeout(loadTimer);
    // Loading failure must not leave the homepage permanently covered.
    loadTimer = window.setTimeout(finish, 15000);
  }
  function onMediaReady() {
    if (disposed || finished || video.readyState < 2 || video.seeking) return;
    if (pendingTime > 0) {
      const time = Math.min(pendingTime, Math.max(0, video.duration - .02));
      pendingTime = 0;
      if (Math.abs(video.currentTime - time) > .025) {
        video.currentTime = time;
        return;
      }
    }
    mediaReady = true;
    root.dataset.mediaReady = 'true';
    window.clearTimeout(loadTimer);
    paint();
    syncVisibility();
  }
  function destroy() {
    if (disposed) return;
    root.hidden = true;
    universe?.setPaused(false);
    cleanup();
  }

  document.body.dataset.heroOpening = 'active';
  if (motion.matches) { finish(); return { destroy }; }
  video.addEventListener('loadeddata', onMediaReady, options);
  video.addEventListener('canplay', onMediaReady, options);
  video.addEventListener('seeked', onMediaReady, options);
  video.addEventListener('ended', finish, options);
  video.addEventListener('error', finish, options);
  video.addEventListener('timeupdate', () => { if (!disposed) paint(); }, options);
  document.addEventListener('visibilitychange', syncVisibility, options);
  window.addEventListener('page-transition-start', pause, options);
  window.addEventListener('page-transition-end', syncVisibility, options);
  motion.addEventListener('change', syncVisibility, options);
  window.addEventListener('pagehide', event => {
    if (event.persisted) finish(); else destroy();
  }, options);
  window.addEventListener('pageshow', syncVisibility, options);

  resizeObserver = new ResizeObserver(() => {
    if (disposed) return;
    reveal.resize(root.clientWidth, root.clientHeight);
    if (mediaReady) paint();
  });
  resizeObserver.observe(root);
  reveal.resize(root.clientWidth, root.clientHeight);
  intersectionObserver = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    syncVisibility();
  });
  intersectionObserver.observe(stage);
  themeObserver = new MutationObserver(chooseSource);
  themeObserver.observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
  chooseSource();

  const loaded = document.readyState === 'complete' ? Promise.resolve() :
    new Promise<void>(resolve => window.addEventListener('load', () => resolve(), { ...options, once:true }));
  Promise.all([loaded, window.fontsReadyPromise ?? Promise.resolve(),
    window.pageTransitionReady ?? Promise.resolve()]).then(() => {
    if (disposed || finished) return;
    pageReady = true;
    syncVisibility();
  });
  return { destroy };
}
