import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/components/SiteHeader.astro', import.meta.url), 'utf8')
  .match(/<script is:inline>([\s\S]*?)<\/script>/)[1];

function fixture() {
  let id = 0;
  const frames = new Map(), timers = new Map();
  const header = Object.assign(new EventTarget(), {
    dataset: { visible: 'true' }, style: {}, attributes: {}, hovered: false, focused: false,
    setAttribute(key, value) { this.attributes[key] = value; },
    querySelector: () => ({ style: {} }),
    matches() { return this.hovered; },
    contains() { return this.focused; },
  });
  const document = Object.assign(new EventTarget(), {
    documentElement: { dataset: {}, style: {}, scrollHeight: 3000 },
    activeElement: null,
    querySelector: () => header,
    querySelectorAll: () => [],
  });
  const window = Object.assign(new EventTarget(), {
    scrollY: 0, innerHeight: 800, location: { pathname: '/' },
    requestAnimationFrame(fn) { frames.set(++id, fn); return id; },
    setTimeout(fn) { timers.set(++id, fn); return id; },
    clearTimeout(key) { timers.delete(key); },
  });
  vm.runInNewContext(source, { window, document, localStorage: { getItem: () => null } });
  return {
    header, document, window, frames,
    scroll(y) {
      window.scrollY = y;
      window.dispatchEvent(new Event('scroll'));
      const pending = [...frames.values()]; frames.clear();
      pending.forEach(fn => fn());
    },
  };
}

test('navigation hides downward, ignores tiny reversals, reveals upward and at the top', () => {
  const f = fixture();
  f.scroll(60); assert.equal(f.header.dataset.visible, 'true');
  f.scroll(150); assert.equal(f.header.dataset.visible, 'false');
  assert.equal(f.header.inert, true);
  assert.equal(f.header.attributes['aria-hidden'], 'true');
  f.scroll(146); f.scroll(149); f.scroll(145);
  assert.equal(f.header.dataset.visible, 'false');
  f.scroll(130); assert.equal(f.header.dataset.visible, 'true');
  f.scroll(300); assert.equal(f.header.dataset.visible, 'false');
  f.scroll(0); assert.equal(f.header.dataset.visible, 'true');
});

test('hover, keyboard access and restored pages keep the navigation reachable', () => {
  const f = fixture();
  f.header.hovered = true; f.scroll(200);
  assert.equal(f.header.dataset.visible, 'true');
  f.header.hovered = false; f.scroll(300);
  const tab = new Event('keydown'); Object.defineProperty(tab, 'key', { value: 'Tab' });
  f.document.dispatchEvent(tab);
  assert.equal(f.header.dataset.visible, 'true'); assert.equal(f.header.inert, false);
  f.header.focused = true; f.scroll(400);
  assert.equal(f.header.dataset.visible, 'true');
  f.header.focused = false; f.scroll(500);
  f.window.dispatchEvent(new Event('pageshow'));
  assert.equal(f.header.dataset.visible, 'true');
});

test('bottom overscroll rebound does not falsely reveal the navigation', () => {
  const f = fixture();
  f.scroll(2200); f.scroll(2350); f.scroll(2200);
  assert.equal(f.header.dataset.visible, 'false');
  f.scroll(2160); assert.equal(f.header.dataset.visible, 'true');
});
