import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { OPENING_TIMING, openingSourceTime } from '../src/scripts/opening/timing.js';

const source = stripTypeScriptTypes(readFileSync(new URL('../src/scripts/hero-opening.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '').replace('export function initHeroOpening', 'function initHeroOpening');
const entrySource = readFileSync(new URL('../src/scripts/opening/entry.js', import.meta.url), 'utf8').replace('export function', 'function');
const flush = async () => { for (let i=0; i<6; i++) await Promise.resolve(); };

function fixture({ loaded=true, navigation='navigate', referrer='', tabStorage=new Map(), storageUnavailable=false, transitionReady, reduced=false }={}) {
  let now=0, nextFrame=0, intersection, disconnected=0, resized=0;
  const frames=new Map(), rendered=[], universeStates=[];
  const stage={getBoundingClientRect:()=>({bottom:553})};
  const root={hidden:false,dataset:{state:'loading'},clientWidth:1280,clientHeight:553,parentElement:stage};
  const motion=Object.assign(new EventTarget(),{matches:reduced});
  const document=Object.assign(new EventTarget(),{hidden:false,readyState:loaded?'complete':'loading',
    documentElement:{dataset:{}},body:{dataset:{}},referrer});
  const window=Object.assign(new EventTarget(),{matchMedia:()=>motion,fontsReadyPromise:Promise.resolve(),
    pageTransitionReady:transitionReady,location:{origin:'https://portfolio.test'},sessionStorage:{
      getItem(key){if(storageUnavailable)throw Error();return tabStorage.get(key)??null;},
      setItem(key,value){if(storageUnavailable)throw Error();tabStorage.set(key,value);},
    }});
  const init=vm.runInNewContext(`${entrySource}\n${source}\ninitHeroOpening`,{
    window,document,URL,AbortController,OPENING_TIMING,
    performance:{now:()=>now,getEntriesByType:()=>[{type:navigation}]},
    createOpeningRenderer:()=>({render:t=>rendered.push(t),resize(){resized++;},setReducedMotion(){}}),
    requestAnimationFrame:callback=>{frames.set(++nextFrame,callback);return nextFrame;},
    cancelAnimationFrame:id=>frames.delete(id),
    ResizeObserver:class{observe(){}disconnect(){disconnected++;}},
    IntersectionObserver:class{constructor(callback){intersection=callback;}observe(){}disconnect(){disconnected++;}},
  });
  const controller=init(root,{setPaused:value=>universeStates.push(value)});
  return {root,motion,document,window,controller,frames,rendered,universeStates,tabStorage,
    resized:()=>resized,disconnected:()=>disconnected,
    advance(seconds){now=seconds*1000;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());},
    visible(value){intersection([{isIntersecting:value}]);},
  };
}

test('fresh entry autoplays after page load without media elements or a user gesture',async()=>{
  const f=fixture({loaded:false});await flush();
  assert.equal(f.root.dataset.state,'loading');assert.equal(f.frames.size,0);
  f.window.dispatchEvent(new Event('load'));await flush();
  assert.equal(f.root.dataset.state,'playing');assert.equal(f.frames.size,1);
  f.advance(3);assert.equal(f.rendered.at(-1),3000);
});

test('opening starts on the final collage and extends its hold without slowing later motion',()=>{
  assert.equal(OPENING_TIMING.visualEnd,10);
  for(const [playback,frame] of [[0,640],[20/60*1000,660],[30/60*1000,660],
    [40/60*1000,660],[1000,680],[2200,752],[5000,920],[9000,1160],
    [9500,1190],[10000,1220]]){
    assert.ok(Math.abs(openingSourceTime(playback)-frame/60*1000)<1e-7);
  }
  for(let t=1000;t<10000;t+=100){
    assert.ok(Math.abs(openingSourceTime(t+100)-openingSourceTime(t)-100)<1e-7);
  }
  assert.equal(openingSourceTime(-1000),640/60*1000);
  assert.ok(Math.abs(openingSourceTime(99999)-1220/60*1000)<1e-7);
});

test('universe resumes during the reveal and the animation ends without an audio tail',async()=>{
  const f=fixture();await flush();
  f.advance(OPENING_TIMING.revealStart-.01);assert.deepEqual(f.universeStates,[]);
  f.advance(OPENING_TIMING.revealStart);assert.deepEqual(f.universeStates,[false]);
  f.advance(OPENING_TIMING.visualEnd);assert.equal(f.root.hidden,true);assert.equal(f.root.dataset.state,'finished');
  assert.equal(f.frames.size,0);assert.equal(f.document.body.dataset.heroOpening,'revealed');
});

test('offscreen and background time is excluded, with only one loop after resuming',async()=>{
  const f=fixture();await flush();f.advance(3);f.visible(false);
  assert.equal(f.root.dataset.state,'paused');assert.equal(f.frames.size,0);
  f.advance(20);f.visible(true);f.visible(true);f.advance(22);
  assert.equal(f.rendered.at(-1),5000);assert.equal(f.frames.size,1);
  f.document.hidden=true;f.document.dispatchEvent(new Event('visibilitychange'));
  f.advance(40);f.document.hidden=false;f.document.dispatchEvent(new Event('visibilitychange'));f.advance(41);
  assert.equal(f.rendered.at(-1),6000);
});

test('reload, history and internal returns skip the opening',async()=>{
  for(const options of [{navigation:'reload'},{navigation:'back_forward'},{referrer:'https://portfolio.test/contact'}]){
    const f=fixture(options);await flush();assert.equal(f.root.dataset.state,'skipped');
    assert.equal(f.root.hidden,true);assert.equal(f.frames.size,0);assert.equal(f.resized(),0);
    assert.deepEqual(f.universeStates,[false]);
  }
});

test('one tab plays once while a fresh tab plays automatically',async()=>{
  const first=fixture();await flush();assert.equal(first.root.dataset.state,'playing');
  const repeat=fixture({tabStorage:first.tabStorage});await flush();assert.equal(repeat.root.dataset.state,'skipped');
  const fresh=fixture();await flush();assert.equal(fresh.root.dataset.state,'playing');
});

test('refresh before page load still skips; unavailable storage keeps navigation fallbacks',async()=>{
  const first=fixture({loaded:false});const refresh=fixture({tabStorage:first.tabStorage,navigation:'reload'});await flush();
  assert.equal(refresh.root.dataset.state,'skipped');
  const fresh=fixture({storageUnavailable:true});await flush();assert.equal(fresh.root.dataset.state,'playing');
  const reload=fixture({storageUnavailable:true,navigation:'reload'});await flush();assert.equal(reload.root.dataset.state,'skipped');
});

test('cached page restoration finishes instead of replaying an interrupted opening',async()=>{
  const f=fixture();await flush();f.advance(4);
  f.window.dispatchEvent(Object.assign(new Event('pagehide'),{persisted:true}));
  f.window.dispatchEvent(Object.assign(new Event('pageshow'),{persisted:true}));
  assert.equal(f.root.hidden,true);assert.equal(f.frames.size,0);
});

test('disposal cancels frames and pending initialization and releases observers',async()=>{
  const f=fixture();await flush();f.controller.destroy();
  assert.equal(f.frames.size,0);assert.equal(f.disconnected(),2);
  f.document.dispatchEvent(new Event('visibilitychange'));assert.equal(f.frames.size,0);
  const pending=fixture();pending.controller.destroy();await flush();assert.equal(pending.frames.size,0);
});

test('page gate and navigation transitions suspend and resume the current frame',async()=>{
  let reveal;const f=fixture({transitionReady:new Promise(resolve=>reveal=resolve)});await flush();
  assert.equal(f.frames.size,0);reveal();await flush();f.advance(4);
  f.document.documentElement.dataset.pageTransition='closing';f.window.dispatchEvent(new Event('page-transition-start'));
  f.advance(30);f.window.dispatchEvent(new Event('pageshow'));assert.equal(f.frames.size,0);
  delete f.document.documentElement.dataset.pageTransition;f.window.dispatchEvent(new Event('page-transition-end'));
  f.advance(31);assert.equal(f.rendered.at(-1),5000);assert.equal(f.frames.size,1);
});

test('reduced motion reveals the homepage immediately',async()=>{
  const f=fixture({reduced:true});await flush();assert.equal(f.root.hidden,true);assert.equal(f.frames.size,0);
});
