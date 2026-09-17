import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';

// Exercise the host lifecycle independently of SVG layout and real autoplay policy.
const source = stripTypeScriptTypes(readFileSync(new URL('../src/scripts/hero-opening.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '')
  .replace('export function initHeroOpening', 'function initHeroOpening');
const entrySource = readFileSync(new URL('../src/scripts/opening/entry.js', import.meta.url), 'utf8').replace('export function', 'function');
const timing = { revealStart:1190/60, visualEnd:1220/60, audioEnd:24.624 };
const tabSoundChoiceKey = 'zhao-portfolio-tab-audio-choice';

function fixture({ allowed = true, loaded = true, navigation = 'navigate', referrer = '', storage = new Map(), tabStorage = new Map(), storageUnavailable = false, transitionReady } = {}) {
  const element = () => Object.assign(new EventTarget(), { hidden:true, textContent:'', dataset:{},
    attributes:{}, setAttribute(name, value) { this.attributes[name] = value; } });
  const start = element(), label = element(), pause = element(), sound = element(), status = element();
  const controls = Object.assign(element(), {
    querySelector:selector => selector === '[data-opening-pause]' ? pause : sound,
  });
  const allow = element(), deny = element();
  const consent = Object.assign(element(), { open:false, showModal() { this.open=true; }, close() { this.open=false; },
    querySelector:selector => selector === '[data-opening-allow]' ? allow : deny });
  let playCalls = 0, playingAllowed = allowed, nextFrame = 0, now = 0;
  const frames = new Map(), rendered = [], universeStates = [];
  const audio = Object.assign(element(), {
    currentTime:0, muted:true, volume:0, paused:true, source:'music.mp3',
    play() {
      playCalls++;
      if (!playingAllowed) return Promise.reject(new DOMException('Blocked', 'NotAllowedError'));
      this.paused = false;
      return Promise.resolve();
    },
    pause() { this.paused = true; },
    load() {},
    removeAttribute(name) { if (name === 'src') this.source = null; },
  });
  const elements = { '[data-opening-audio]':audio, '[data-opening-start]':start,
    '[data-opening-start-label]':label, '[data-opening-pause]':pause, '[data-opening-status]':status };
  const stage = { getBoundingClientRect:() => ({ bottom:553 }),
    querySelector:selector => selector === '[data-opening-controls]' ? controls : consent };
  const root = Object.assign(element(), { hidden:false, clientWidth:1280, clientHeight:553,
    parentElement:stage, querySelector:selector => elements[selector] });
  root.dataset.state = 'loading';
  const motion = Object.assign(element(), { matches:false });
  const window = Object.assign(new EventTarget(), { fontsReadyPromise:Promise.resolve(), pageTransitionReady:transitionReady, matchMedia:() => motion,
    location:{origin:'https://portfolio.test'},
    localStorage:{
      getItem(key) { if (storageUnavailable) throw new Error('Storage unavailable'); return storage.get(key) ?? null; },
      setItem(key,value) { if (storageUnavailable) throw new Error('Storage unavailable'); storage.set(key,value); },
    } });
  window.sessionStorage = {
    getItem(key) { if (storageUnavailable) throw new Error('Storage unavailable'); return tabStorage.get(key) ?? null; },
    setItem(key,value) { if (storageUnavailable) throw new Error('Storage unavailable'); tabStorage.set(key,value); },
    removeItem(key) { if (storageUnavailable) throw new Error('Storage unavailable'); tabStorage.delete(key); },
  };
  const document = Object.assign(new EventTarget(), { hidden:false, readyState:loaded ? 'complete' : 'loading',
    body:{dataset:{}}, documentElement:{dataset:{}}, referrer });
  let intersection, resized = false, disconnected = 0;
  const renderer = { render:t => rendered.push(t), resize(){ resized = true; }, setReducedMotion(){} };
  const init = vm.runInNewContext(`${entrySource}\n${source}\ninitHeroOpening`, {
    window, document, AbortController, URL, OPENING_TIMING:timing, createOpeningRenderer:() => renderer,
    performance:{ now:() => now, getEntriesByType:() => [{type:navigation}] },
    requestAnimationFrame:callback => { frames.set(++nextFrame,callback); return nextFrame; },
    cancelAnimationFrame:id => frames.delete(id),
    ResizeObserver:class { observe(){} disconnect(){ disconnected++; } },
    IntersectionObserver:class { constructor(callback){ intersection=callback; } observe(){} disconnect(){ disconnected++; } },
  });
  const controller = init(root, { setPaused:value => universeStates.push(value) });
  return { root, start, label, pause, sound, controls, audio, document, window, frames, rendered, universeStates, controller, consent, storage, tabStorage,
    choose:sound => (sound ? allow : deny).dispatchEvent(new Event('click')),
    allow:() => { playingAllowed = true; },
    playCalls:() => playCalls,
    resized:() => resized,
    disconnected:() => disconnected,
    click:target => target.dispatchEvent(new Event('click')),
    advance(seconds) {
      audio.currentTime = seconds;
      now = seconds * 1000;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback());
    },
    advanceSilent(seconds) {
      now = seconds * 1000;
      const pending = [...frames.values()]; frames.clear(); pending.forEach(callback => callback());
    },
    visible(value) { intersection([{ isIntersecting:value }]); },
  };
}
const flush = async () => { for (let i=0; i<6; i++) await Promise.resolve(); };

test('the full-page choice waits for load and nothing plays before permission', async () => {
  const f = fixture({ loaded:false }); await flush();
  assert.equal(f.consent.open, false); assert.equal(f.playCalls(), 0);
  f.window.dispatchEvent(new Event('load')); await flush();
  assert.equal(f.consent.open, true); assert.equal(f.root.dataset.state, 'consent');
  assert.equal(f.rendered.at(-1), 0);
  assert.equal(f.document.documentElement.dataset.openingConsent, 'true');
  assert.equal(f.playCalls(), 0); assert.equal(f.frames.size, 0); assert.equal(f.audio.muted, true);
  f.choose(true);
  assert.equal(f.playCalls(), 1); // play() is invoked synchronously by the user's click.
  await flush();
  assert.equal(f.consent.open, false); assert.equal(f.audio.muted, false);
  assert.equal(f.document.documentElement.dataset.openingConsent, undefined);
});

test('refused sound playback can be retried without silently advancing the opening', async () => {
  const f = fixture({ allowed:false }); await flush();
  f.choose(true); await flush();
  assert.equal(f.root.dataset.state, 'blocked');
  assert.equal(f.start.hidden, false);
  assert.equal(f.audio.currentTime, 0);
  assert.equal(f.frames.size, 0);
  assert.equal(f.audio.muted, false);
  f.allow(); f.click(f.start); await flush();
  assert.equal(f.root.dataset.state, 'playing');
  assert.equal(f.audio.paused, false);
  assert.equal(f.start.hidden, true);
  assert.equal(f.frames.size, 1);
});

test('visual reveal restores the universe while music continues to its own ending', async () => {
  const f = fixture(); await flush();
  f.choose(true); await flush();
  assert.equal(f.resized(), true);
  f.advance(19.7); assert.equal(f.universeStates.length, 0);
  f.advance(19.9); assert.deepEqual(f.universeStates, [false]);
  assert.notEqual(f.root.dataset.revealed, 'true');
  f.advance(20.34);
  assert.equal(f.root.dataset.revealed, 'true');
  assert.equal(f.audio.paused, false);
  assert.equal(f.root.hidden, false);
  assert.equal(f.frames.size, 0);
  f.audio.currentTime = timing.audioEnd;
  f.audio.dispatchEvent(new Event('ended'));
  assert.equal(f.root.hidden, true);
  assert.equal(f.root.dataset.state, 'finished');
});

test('offscreen pauses both clocks, then resumes without duplicate loops; user pause stays paused', async () => {
  const f = fixture(); await flush(); f.choose(true); await flush(); f.advance(8);
  f.visible(false);
  assert.equal(f.audio.paused, true); assert.equal(f.frames.size, 0);
  f.visible(true); await flush();
  assert.equal(f.audio.currentTime, 8); assert.equal(f.frames.size, 1);
  f.click(f.pause); f.visible(false); f.visible(true); await flush();
  assert.equal(f.audio.paused, true); assert.equal(f.frames.size, 0);
});

test('disposal releases the modal, observers, audio and pending promises', async () => {
  const first = fixture(); await flush(); first.choose(true); await flush(); assert.equal(first.playCalls(), 1);
  first.controller.destroy();
  assert.equal(first.audio.source, null); assert.equal(first.frames.size, 0);
  assert.equal(first.disconnected(), 2);
  const refreshed = fixture(); await flush();
  assert.equal(refreshed.playCalls(), 0); assert.equal(refreshed.audio.currentTime, 0);
  assert.equal(refreshed.consent.open, true);
  refreshed.controller.destroy(); assert.equal(refreshed.consent.open, false);
  assert.equal(refreshed.document.documentElement.dataset.openingConsent, undefined);
  const pending = fixture(); pending.controller.destroy(); await flush();
  assert.equal(pending.playCalls(), 0); assert.equal(pending.frames.size, 0);
});

test('refresh never plays or asks for sound, regardless of the previous choice', async () => {
  for (const choice of [null, 'allowed', 'denied']) {
    const f = fixture({navigation:'reload', tabStorage:new Map(choice ? [[tabSoundChoiceKey,choice]] : [])});
    await flush();
    assert.equal(f.root.dataset.state,'skipped'); assert.equal(f.root.hidden,true);
    assert.equal(f.consent.open,false); assert.equal(f.playCalls(),0); assert.equal(f.frames.size,0);
    assert.equal(f.resized(),false); assert.equal(f.audio.source,null);
    assert.deepEqual(f.universeStates,[false]);
  }
});

test('internal and history returns show the universe directly, even without stored choices', async () => {
  for (const options of [{referrer:'https://portfolio.test/contact'}, {navigation:'back_forward'}]) {
    const f=fixture(options); await flush();
    assert.equal(f.root.dataset.state,'skipped'); assert.equal(f.consent.open,false);
    assert.equal(f.root.hidden,true); assert.equal(f.controls.hidden,true); assert.equal(f.frames.size,0);
  }
});

test('one tab plays once; a new tab session asks and plays again for either sound choice', async () => {
  for (const allowed of [true,false]) {
    const first=fixture(); await flush(); first.choose(allowed); await flush();
    assert.equal(first.root.dataset.state,'playing');
    const repeat=fixture({tabStorage:first.tabStorage}); await flush();
    assert.equal(repeat.root.dataset.state,'skipped'); assert.equal(repeat.consent.open,false);
    const reopened=fixture({storage:first.storage}); await flush();
    assert.equal(reopened.consent.open,true); reopened.choose(allowed); await flush();
    assert.equal(reopened.root.dataset.state,'playing');
  }
});

test('even a refresh before permission is answered skips the opening', async () => {
  const first=fixture({loaded:false});
  const refreshed=fixture({navigation:'reload',tabStorage:first.tabStorage}); await flush();
  assert.equal(refreshed.root.hidden,true); assert.equal(refreshed.consent.open,false);
});

test('storage failure still permits fresh visits and skips reloads and internal returns', async () => {
  const f=fixture({storageUnavailable:true}); await flush();
  assert.equal(f.consent.open,true); f.choose(false); assert.equal(f.root.dataset.state,'playing');
  for(const options of [{navigation:'reload'},{referrer:'https://portfolio.test/contact'},{navigation:'back_forward'}]) {
    const returned=fixture({...options,storageUnavailable:true}); await flush();
    assert.equal(returned.root.hidden,true); assert.equal(returned.consent.open,false);
  }
});

test('restoring a cached page does not resume its interrupted film or consent dialog', async () => {
  for(const started of [true,false]) {
    const f=fixture(); await flush();
    if(started){f.choose(true);await flush();f.advance(4);}
    f.window.dispatchEvent(Object.assign(new Event('pagehide'),{persisted:true}));
    f.window.dispatchEvent(Object.assign(new Event('pageshow'),{persisted:true}));await flush();
    assert.equal(f.root.hidden,true);assert.equal(f.controls.hidden,true);assert.equal(f.consent.open,false);
    assert.equal(f.frames.size,0);assert.equal(f.audio.paused,true);
    assert.equal(f.document.body.dataset.heroOpening,'revealed');
  }
});

test('audio failure exposes retry and never silently advances the film', async () => {
  const f = fixture(); await flush(); f.choose(true); await flush(); f.advance(4);
  f.audio.dispatchEvent(new Event('error'));
  assert.equal(f.root.dataset.state, 'error'); assert.equal(f.start.hidden, false);
  assert.equal(f.audio.paused, true); assert.equal(f.frames.size, 0);
  f.click(f.start); await flush();
  assert.equal(f.audio.currentTime, 0); assert.equal(f.root.dataset.state, 'playing');
});

test('denial runs the entire animation silently even when audio is unavailable', async () => {
  const f = fixture({ allowed:false }); await flush(); f.choose(false);
  assert.equal(f.audio.muted, true); assert.equal(f.audio.paused, true); assert.equal(f.playCalls(), 0);
  assert.equal(f.consent.open, false); assert.equal(f.root.dataset.state, 'playing');
  f.audio.dispatchEvent(new Event('error'));
  assert.equal(f.root.dataset.state, 'playing');
  f.advance(19.9); assert.deepEqual(f.universeStates, [false]);
  f.advance(20.34);
  assert.equal(f.root.hidden, true); assert.equal(f.root.dataset.state, 'finished');
  assert.equal(f.frames.size, 0); assert.equal(f.playCalls(), 0);
});

test('silent playback excludes time offscreen and Escape chooses silence', async () => {
  const f = fixture(); await flush();
  const cancel = new Event('cancel', {cancelable:true}); f.consent.dispatchEvent(cancel);
  assert.equal(cancel.defaultPrevented, true); assert.equal(f.audio.muted, true);
  f.advance(8); f.visible(false); f.advance(20); f.visible(true); f.advance(25);
  assert.equal(f.rendered.at(-1), 13000); assert.equal(f.frames.size, 1);
  f.click(f.pause); f.visible(false); f.visible(true);
  assert.equal(f.frames.size, 0); assert.equal(f.pause.attributes['aria-label'], '继续播放开场动画');
  assert.equal(f.controls.hidden, false); assert.equal(f.start.hidden, true);
  assert.equal(f.playCalls(), 0);
});

test('sound can join a silent opening at its current time and mute without changing playback or volume', async () => {
  const tabStorage = new Map([[tabSoundChoiceKey,'allowed']]);
  const f = fixture({tabStorage}); await flush(); f.choose(false);
  assert.equal(f.controls.hidden, false); assert.equal(f.sound.attributes['aria-label'], '打开声音');
  f.advanceSilent(6);
  f.click(f.sound);
  assert.equal(f.playCalls(), 1); assert.equal(f.audio.currentTime, 6);
  await flush();
  assert.equal(f.audio.muted, false); assert.equal(f.root.dataset.state, 'playing');
  assert.equal(f.sound.attributes['aria-pressed'], 'true');
  f.advance(8); f.click(f.sound);
  assert.equal(f.audio.muted, true); assert.equal(f.audio.paused, false);
  assert.equal(f.audio.currentTime, 8); assert.equal(f.frames.size, 1);
  f.advance(9); f.click(f.sound); await flush();
  assert.equal(f.audio.muted, false); assert.equal(f.audio.currentTime, 9);
  assert.equal(f.rendered.at(-1), 9000); assert.equal(f.playCalls(), 1);
  assert.equal(f.audio.volume, 0.8); assert.equal(tabStorage.get(tabSoundChoiceKey), 'denied');
});

test('toggling sound while paused changes only sound; the same pause control resumes in sync', async () => {
  const f = fixture(); await flush(); f.choose(false); f.advanceSilent(4); f.click(f.pause);
  f.click(f.sound); await flush();
  assert.equal(f.root.dataset.state, 'paused'); assert.equal(f.playCalls(), 0);
  assert.equal(f.frames.size, 0); assert.equal(f.rendered.at(-1), 4000);
  assert.equal(f.pause.attributes['aria-label'], '继续播放开场音乐与动画');
  f.click(f.pause); await flush();
  assert.equal(f.audio.currentTime, 4); assert.equal(f.audio.paused, false);
  assert.equal(f.root.dataset.state, 'playing'); assert.equal(f.frames.size, 1);
  f.click(f.pause); f.click(f.sound);
  assert.equal(f.audio.muted, true); assert.equal(f.audio.paused, true);
  assert.equal(f.root.dataset.state, 'paused'); assert.equal(f.audio.currentTime, 4);
});

test('a failed mid-opening sound request leaves animation running and can be retried', async () => {
  const f = fixture({allowed:false}); await flush(); f.choose(false); f.advanceSilent(3);
  f.click(f.sound); await flush();
  assert.equal(f.root.dataset.state, 'playing'); assert.equal(f.audio.muted, true);
  assert.equal(f.sound.attributes['aria-label'], '打开声音'); assert.equal(f.frames.size, 1);
  f.advanceSilent(5); assert.equal(f.rendered.at(-1), 5000);
  f.allow(); f.click(f.sound); await flush();
  assert.equal(f.audio.currentTime, 5); assert.equal(f.audio.muted, false);
  assert.equal(f.root.dataset.state, 'playing');
});

test('slow sound startup catches up to the picture and cancelled requests cannot resume playback', async () => {
  const f = fixture(); await flush(); f.choose(false); f.advanceSilent(4);
  let resolvePlay;
  f.audio.play = () => new Promise(resolve => { resolvePlay = resolve; });
  f.click(f.sound); f.advanceSilent(7);
  assert.equal(f.rendered.at(-1), 7000);
  resolvePlay(); await flush();
  assert.equal(f.audio.currentTime, 7); assert.equal(f.frames.size, 1);

  const cancelled = fixture(); await flush(); cancelled.choose(false); cancelled.advanceSilent(4);
  let resolveCancelled;
  cancelled.audio.play = () => new Promise(resolve => { resolveCancelled = resolve; });
  cancelled.click(cancelled.sound); cancelled.click(cancelled.sound);
  cancelled.advanceSilent(6); resolveCancelled(); await flush();
  assert.equal(cancelled.audio.muted, true); assert.equal(cancelled.audio.paused, true);
  assert.equal(cancelled.root.dataset.state, 'playing');
  cancelled.advanceSilent(8); assert.equal(cancelled.rendered.at(-1), 8000);
});

test('muted audio tail finishes normally and disposal removes both small controls and listeners', async () => {
  const f = fixture(); await flush(); f.choose(true); await flush();
  f.advance(20.34); f.click(f.sound);
  assert.equal(f.audio.muted, true); assert.equal(f.controls.hidden, false); assert.equal(f.frames.size, 0);
  f.audio.dispatchEvent(new Event('ended'));
  assert.equal(f.root.hidden, true); assert.equal(f.controls.hidden, true);
  const disposed = fixture(); await flush(); disposed.choose(false); disposed.controller.destroy();
  disposed.click(disposed.sound); disposed.click(disposed.pause); await flush();
  assert.equal(disposed.controls.hidden, true); assert.equal(disposed.playCalls(), 0);
});

test('home waits for the page gate; transition events pause and resume without replay', async () => {
  let reveal;
  const transitionReady = new Promise(resolve => { reveal = resolve; });
  const f = fixture({transitionReady}); await flush();
  assert.equal(f.root.dataset.state, 'loading'); assert.equal(f.frames.size, 0); assert.equal(f.playCalls(), 0);
  reveal(); await flush(); f.choose(false);
  assert.equal(f.root.dataset.state, 'playing'); assert.equal(f.audio.muted, true);
  f.advanceSilent(4);
  f.document.documentElement.dataset.pageTransition = 'closing';
  f.window.dispatchEvent(new Event('page-transition-start'));
  assert.equal(f.root.dataset.state, 'paused'); assert.equal(f.frames.size, 0);
  f.window.dispatchEvent(new Event('pageshow'));
  assert.equal(f.frames.size, 0);
  delete f.document.documentElement.dataset.pageTransition;
  f.window.dispatchEvent(new Event('page-transition-end')); await flush();
  assert.equal(f.root.dataset.state, 'playing'); assert.equal(f.rendered.at(-1), 4000);
});
