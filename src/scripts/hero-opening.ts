import { createOpeningRenderer, OPENING_TIMING } from './opening/renderer.js';

type Universe = { setPaused(value: boolean): void } | undefined;
const TAB_SOUND_CHOICE_KEY = 'zhao-portfolio-tab-audio-choice';

function currentTabAllowedSound() {
  try { return window.sessionStorage.getItem(TAB_SOUND_CHOICE_KEY) === 'allowed'; }
  catch { return false; }
}

function homepageEntry() {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  // A reload can retain the previous page's referrer, so check it first.
  if (navigation?.type === 'reload') return 'reload';
  // A newly restored document (including a reopened tab) asks again.
  if (navigation?.type === 'back_forward') return 'direct';
  try {
    const from = new URL(document.referrer);
    if (from.origin === window.location.origin && from.pathname !== '/' && from.pathname !== '/index.html') {
      return 'internal';
    }
  } catch { /* Direct visits have no referrer. */ }
  return 'direct';
}

export function initHeroOpening(root: HTMLElement, universe: Universe) {
  const stage = root.parentElement!;
  const audio = root.querySelector<HTMLAudioElement>('[data-opening-audio]')!;
  const startButton = root.querySelector<HTMLButtonElement>('[data-opening-start]')!;
  const startLabel = root.querySelector<HTMLElement>('[data-opening-start-label]')!;
  const controls = stage.querySelector<HTMLElement>('[data-opening-controls]')!;
  const pauseButton = controls.querySelector<HTMLButtonElement>('[data-opening-pause]')!;
  const soundButton = controls.querySelector<HTMLButtonElement>('[data-opening-sound]')!;
  const status = root.querySelector<HTMLElement>('[data-opening-status]')!;
  const consent = stage.querySelector<HTMLDialogElement>('[data-opening-consent]')!;
  const allowButton = consent.querySelector<HTMLButtonElement>('[data-opening-allow]')!;
  const denyButton = consent.querySelector<HTMLButtonElement>('[data-opening-deny]')!;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = createOpeningRenderer(root, { reducedMotion: motion.matches });
  const events = new AbortController();
  const eventOptions = { signal: events.signal };
  let frame = 0, attempt = 0, soundAttempt = 0;
  let ready = false, playing = false, disposed = false, revealed = false, revealing = false;
  let inView = stage.getBoundingClientRect().bottom > 0;
  let resumeWhenVisible = false, userPaused = false;
  let soundAllowed: boolean | null = null;
  let usingAudioClock = false;
  let silentElapsed = 0, silentStartedAt = 0;

  // Remember explicit choices only for reloads in this tab, never for a new visit.
  audio.muted = true;
  audio.volume = 0.8;

  function setState(state: string) { root.dataset.state = state; }
  function elapsedSeconds() {
    if (usingAudioClock) return audio.currentTime;
    return (silentElapsed + (playing ? performance.now() - silentStartedAt : 0)) / 1000;
  }
  function updateControls() {
    controls.hidden = disposed || root.hidden || soundAllowed === null ||
      !['playing', 'paused', 'starting'].includes(root.dataset.state!);
    const soundLabel = soundAllowed ? '关闭声音' : '打开声音';
    soundButton.dataset.enabled = String(!!soundAllowed);
    soundButton.setAttribute('aria-pressed', String(!!soundAllowed));
    soundButton.setAttribute('aria-label', soundLabel);
    soundButton.setAttribute('title', soundLabel);
    root.dataset.audio = soundAllowed ? 'enabled' : 'disabled';
    const pauseLabel = `${playing ? '暂停' : '继续播放'}开场${soundAllowed ? '音乐与动画' : '动画'}`;
    pauseButton.dataset.paused = String(!playing);
    pauseButton.setAttribute('aria-label', pauseLabel);
    pauseButton.setAttribute('title', pauseLabel);
  }
  function closeConsent() {
    if (consent.open) consent.close();
    delete document.documentElement.dataset.openingConsent;
  }
  function chooseSound(allowed: boolean, remember = true) {
    if (!ready || disposed || soundAllowed !== null) return;
    if (remember) {
      try { window.sessionStorage.setItem(TAB_SOUND_CHOICE_KEY, allowed ? 'allowed' : 'denied'); }
      catch { /* The current choice still works if storage is unavailable. */ }
    }
    soundAllowed = allowed;
    audio.muted = !allowed;
    closeConsent();
    // Keep play() on this same click stack to retain browser user activation.
    void start();
  }
  function showStart(label: string, message = '') {
    startLabel.textContent = label;
    startButton.hidden = false;
    updateControls();
    status.textContent = message;
  }
  async function toggleSound() {
    if (!ready || disposed || root.hidden || soundAllowed === null) return;
    const currentSoundAttempt = ++soundAttempt;
    soundAllowed = !soundAllowed;
    audio.muted = !soundAllowed;
    status.textContent = '';
    updateControls();
    if (!soundAllowed) {
      // Keep an established media clock running silently to preserve synchronization.
      if (!usingAudioClock) audio.pause();
      return;
    }
    // A sound toggle must never resume a paused opening.
    if (usingAudioClock || !playing) return;
    try {
      audio.currentTime = elapsedSeconds();
      // Keep this call on the user's click stack; loading must not stop the picture.
      await audio.play();
      if (disposed || currentSoundAttempt !== soundAttempt || !playing || root.hidden) return;
      audio.currentTime = elapsedSeconds();
      usingAudioClock = true;
    } catch {
      if (disposed || currentSoundAttempt !== soundAttempt) return;
      soundAllowed = false;
      audio.muted = true;
      audio.pause();
      status.textContent = '声音暂时无法播放，请再次点击打开声音';
      updateControls();
    }
  }
  function updatePicture(seconds = elapsedSeconds()) {
    renderer.render(seconds * 1000);
    if (!revealing && seconds >= OPENING_TIMING.revealStart) {
      revealing = true;
      universe?.setPaused(false);
    }
    if (!revealed && seconds >= OPENING_TIMING.visualEnd) {
      revealed = true;
      root.dataset.revealed = 'true';
      document.body.dataset.heroOpening = 'revealed';
      status.textContent = '开场画面结束';
    }
  }
  function tick() {
    frame = 0;
    if (!playing || disposed || document.hidden || !inView) return;
    const seconds = elapsedSeconds();
    updatePicture(seconds);
    if (!usingAudioClock && seconds >= OPENING_TIMING.visualEnd) { finish(); return; }
    // The final four seconds are audio only; the SVG no longer needs a frame loop.
    if (!revealed) frame = requestAnimationFrame(tick);
  }
  function stopFrames() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }
  function pause(byUser = false) {
    const wasActive = playing || root.dataset.state === 'starting';
    if (!usingAudioClock && playing) silentElapsed = elapsedSeconds() * 1000;
    attempt++;
    soundAttempt++;
    playing = false;
    stopFrames();
    audio.pause();
    if (byUser) { userPaused = true; resumeWhenVisible = false; }
    else if (wasActive) resumeWhenVisible = true;
    if (!wasActive) return;
    updatePicture();
    setState('paused');
    startButton.hidden = true;
    updateControls();
  }
  async function start() {
    if (!ready || disposed || playing || soundAllowed === null || root.hidden || root.dataset.state === 'starting') return;
    if (!inView || document.hidden || document.documentElement.dataset.pageTransition) { resumeWhenVisible = true; return; }
    userPaused = false;
    resumeWhenVisible = false;
    if (root.dataset.state === 'error') {
      audio.load();
      audio.currentTime = 0;
      silentElapsed = 0;
      revealed = revealing = false;
      root.dataset.revealed = 'false';
      document.body.dataset.heroOpening = 'active';
      universe?.setPaused(true);
    }
    const currentAttempt = ++attempt;
    soundAttempt++;
    const seconds = elapsedSeconds();
    setState('starting');
    updateControls();
    startButton.hidden = true;
    status.textContent = '';
    audio.muted = !soundAllowed;
    if (!soundAllowed && !usingAudioClock) {
      // Silent playback never depends on downloading or starting an audio file.
      silentStartedAt = performance.now();
      playing = true;
      setState('playing');
      updateControls();
      tick();
      return;
    }
    try {
      if (!usingAudioClock) audio.currentTime = seconds;
      // Called directly from the button handler when a browser requires a gesture.
      await audio.play();
      if (disposed || currentAttempt !== attempt) return;
      usingAudioClock = true;
      playing = true;
      setState('playing');
      updateControls();
      tick();
    } catch (error) {
      if (disposed || currentAttempt !== attempt) return;
      playing = false;
      audio.pause();
      const blocked = (error as DOMException).name === 'NotAllowedError';
      setState(blocked ? 'blocked' : 'error');
      if (!audio.currentTime) renderer.render(26 / 60 * 1000);
      showStart(blocked ? '播放开场 · 开启声音' : '重新加载开场音乐',
        blocked ? '点击播放，开启动画和音乐' : '音乐加载失败，请点击重试');
    }
  }
  function syncVisibility() {
    if (!ready || disposed || soundAllowed === null) return;
    if (!inView || document.hidden || document.documentElement.dataset.pageTransition) pause();
    else if (resumeWhenVisible && !userPaused) void start();
  }
  function finish() {
    attempt++;
    soundAttempt++;
    playing = false;
    resumeWhenVisible = false;
    stopFrames();
    audio.pause();
    renderer.render(OPENING_TIMING.visualEnd * 1000);
    universe?.setPaused(false);
    revealed = true;
    root.dataset.revealed = 'true';
    document.body.dataset.heroOpening = 'revealed';
    setState('finished');
    root.hidden = true;
    updateControls();
  }
  function onError() {
    if (disposed || !usingAudioClock) return;
    attempt++;
    playing = false;
    stopFrames();
    audio.pause();
    setState('error');
    showStart('重新加载开场音乐', '音乐加载失败，请点击重试');
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

  startButton.addEventListener('click', () => void start(), eventOptions);
  allowButton.addEventListener('click', () => chooseSound(true), eventOptions);
  denyButton.addEventListener('click', () => chooseSound(false), eventOptions);
  consent.addEventListener('cancel', event => { event.preventDefault(); chooseSound(false); }, eventOptions);
  pauseButton.addEventListener('click', () => {
    if (playing || root.dataset.state === 'starting') pause(true);
    else void start();
  }, eventOptions);
  soundButton.addEventListener('click', () => void toggleSound(), eventOptions);
  audio.addEventListener('ended', () => { if (usingAudioClock) finish(); }, eventOptions);
  audio.addEventListener('error', onError, eventOptions);
  document.addEventListener('visibilitychange', syncVisibility, eventOptions);
  window.addEventListener('page-transition-start', () => pause(), eventOptions);
  window.addEventListener('page-transition-end', syncVisibility, eventOptions);
  motion.addEventListener('change', () => renderer.setReducedMotion(motion.matches), eventOptions);
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) pause();
    else destroy();
  }, eventOptions);
  window.addEventListener('pageshow', syncVisibility, eventOptions);

  function destroy() {
    if (disposed) return;
    disposed = true;
    attempt++;
    soundAttempt++;
    controls.hidden = true;
    events.abort();
    closeConsent();
    stopFrames();
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }

  document.body.dataset.heroOpening = 'active';
  const pageReady = document.readyState === 'complete' ? Promise.resolve() :
    new Promise<void>(resolve => window.addEventListener('load', () => resolve(), { ...eventOptions, once: true }));
  Promise.all([window.fontsReadyPromise ?? Promise.resolve(), pageReady,
    window.pageTransitionReady ?? Promise.resolve()]).then(() => {
    if (disposed) return;
    ready = true;
    renderer.resize(root.clientWidth, root.clientHeight);
    renderer.render(0);
    const entry = homepageEntry();
    root.dataset.entry = entry;
    if (entry === 'internal' || (entry === 'reload' && currentTabAllowedSound())) {
      // Automatic silence must not overwrite an explicit earlier allow/deny choice.
      chooseSound(false, false);
      return;
    }
    if (entry === 'direct') {
      // Also reset copied/restored tab storage when opening the site afresh.
      try { window.sessionStorage.removeItem(TAB_SOUND_CHOICE_KEY); }
      catch { /* New visits ask regardless of storage availability. */ }
    }
    setState('consent');
    document.documentElement.dataset.openingConsent = 'true';
    consent.showModal();
  });
  return { destroy };
}
