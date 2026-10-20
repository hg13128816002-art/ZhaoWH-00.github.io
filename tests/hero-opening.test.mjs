import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { createVideoReveal, VIDEO_DURATION, VIDEO_REVEAL_START } from '../src/scripts/opening/video-reveal.js';

const source = stripTypeScriptTypes(readFileSync(new URL('../src/scripts/hero-opening.ts', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '').replace('export function initHeroOpening', 'function initHeroOpening');
const entrySource = readFileSync(new URL('../src/scripts/opening/entry.js', import.meta.url), 'utf8').replace('export function', 'function');
const flush = async () => { for (let i=0;i<10;i++) await Promise.resolve(); };
function fixture({loaded=true,navigation='navigate',referrer='',tabStorage=new Map(),storageUnavailable=false,
  transitionReady,reduced=false,theme='dark',mediaLoaded=true,rejectPlay=false,nativeFrames=true}={}) {
  let id=0,intersection,themeChange,disconnected=0,playCalls=0;
  const frames=new Map(),timers=new Map(),loads=[],universeStates=[];
  class Video extends EventTarget {
    currentTime=0;duration=VIDEO_DURATION;readyState=0;paused=true;seeking=false;
    src='';preload='none';muted=false;defaultMuted=false;playbackRate=1;
    load(){loads.push(this.src);this.readyState=0;this.currentTime=0;this.paused=true;}
    play(){playCalls++;this.paused=false;return rejectPlay?Promise.reject(Object.assign(new Error(),{name:'NotAllowedError'})):Promise.resolve();}
    pause(){this.paused=true;}
    removeAttribute(name){if(name==='src')this.src='';}
    requestVideoFrameCallback(fn){frames.set(++id,fn);return id;}
    cancelVideoFrameCallback(key){frames.delete(key);}
  }
  const video=new Video();if(!nativeFrames)video.requestVideoFrameCallback=undefined;
  const motion=Object.assign(new EventTarget(),{matches:reduced});
  const root={hidden:false,style:{},dataset:{state:'loading',darkSrc:'/dark.mp4',lightSrc:'/light.mp4'},
    clientWidth:1280,clientHeight:553,parentElement:{getBoundingClientRect:()=>({bottom:553})},querySelector:()=>video};
  const document=Object.assign(new EventTarget(),{hidden:false,readyState:loaded?'complete':'loading',referrer,
    documentElement:{dataset:{theme}},body:{dataset:{}}});
  const window=Object.assign(new EventTarget(),{matchMedia:()=>motion,fontsReadyPromise:Promise.resolve(),
    pageTransitionReady:transitionReady,location:{origin:'https://portfolio.test'},
    setTimeout:fn=>{timers.set(++id,fn);return id;},clearTimeout:key=>timers.delete(key),sessionStorage:{
      getItem(key){if(storageUnavailable)throw Error();return tabStorage.get(key)??null;},
      setItem(key,value){if(storageUnavailable)throw Error();tabStorage.set(key,value);},
    }});
  const init=vm.runInNewContext(`${entrySource}\n${source}\ninitHeroOpening`,{
    window,document,URL,AbortController,createVideoReveal,
    performance:{getEntriesByType:()=>[{type:navigation}]},
    requestAnimationFrame:fn=>{frames.set(++id,fn);return id;},cancelAnimationFrame:key=>frames.delete(key),
    ResizeObserver:class{observe(){}disconnect(){disconnected++;}},
    IntersectionObserver:class{constructor(fn){intersection=fn;}observe(){}disconnect(){disconnected++;}},
    MutationObserver:class{constructor(fn){themeChange=fn;}observe(){}disconnect(){disconnected++;}},
  });
  const controller=init(root,{setPaused:value=>universeStates.push(value)});
  const ready=()=>{video.readyState=4;video.dispatchEvent(new Event('loadeddata'));};
  if(mediaLoaded&&video.src)ready();
  return {root,video,document,window,motion,controller,loads,frames,timers,universeStates,tabStorage,ready,
    disconnected:()=>disconnected,playCalls:()=>playCalls,
    advance(seconds){if(video.paused)return;video.currentTime+=seconds;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn(0,{mediaTime:video.currentTime}));},
    visible(value){intersection([{isIntersecting:value}]);},
    theme(value){document.documentElement.dataset.theme=value;themeChange();},
  };
}

test('fresh visits load only the matching silent film and autoplay at native speed after page readiness',async()=>{
  for(const theme of ['dark','light']){
    const f=fixture({theme,loaded:false});await flush();
    assert.deepEqual(f.loads,[`/${theme}.mp4`]);assert.equal(f.playCalls(),0);
    assert.equal(f.video.muted,true);assert.equal(f.video.defaultMuted,true);assert.equal(f.video.playbackRate,1);
    f.window.dispatchEvent(new Event('load'));await flush();
    assert.equal(f.root.dataset.state,'playing');assert.equal(f.frames.size,1);
    f.advance(3);assert.equal(f.video.currentTime,3);
  }
});
test('source readiness and page-transition readiness both gate playback',async()=>{
  let reveal;const f=fixture({mediaLoaded:false,transitionReady:new Promise(resolve=>reveal=resolve)});await flush();
  assert.equal(f.playCalls(),0);f.ready();await flush();assert.equal(f.playCalls(),0);
  reveal();await flush();assert.equal(f.playCalls(),1);assert.equal(f.frames.size,1);
});
test('switching theme replaces the film at the same playhead position',async()=>{
  const f=fixture();await flush();f.advance(4);f.theme('light');
  assert.equal(f.video.paused,true);assert.equal(f.frames.size,0);assert.deepEqual(f.loads,['/dark.mp4','/light.mp4']);
  f.ready();assert.equal(f.video.currentTime,4);f.video.dispatchEvent(new Event('seeked'));await flush();
  assert.equal(f.root.dataset.state,'playing');assert.equal(f.video.playbackRate,1);assert.equal(f.frames.size,1);
});
test('the final diagonal reveals the live canvas and releases the media decoder when ended',async()=>{
  const f=fixture();await flush();f.advance(VIDEO_REVEAL_START-.01);assert.deepEqual(f.universeStates,[]);
  f.advance(.02);assert.deepEqual(f.universeStates,[false]);assert.match(f.root.style.clipPath,/^path\(evenodd/);
  f.video.dispatchEvent(new Event('ended'));assert.equal(f.root.hidden,true);assert.equal(f.root.dataset.state,'finished');
  assert.equal(f.video.src,'');assert.equal(f.frames.size,0);assert.equal(f.timers.size,0);assert.equal(f.disconnected(),3);
});
test('offscreen, hidden documents and navigation pause decoding and resume only one frame callback',async()=>{
  const f=fixture();await flush();f.advance(3);f.visible(false);assert.equal(f.video.paused,true);assert.equal(f.frames.size,0);
  f.advance(20);assert.equal(f.video.currentTime,3);f.visible(true);f.visible(true);await flush();assert.equal(f.frames.size,1);
  f.document.hidden=true;f.document.dispatchEvent(new Event('visibilitychange'));assert.equal(f.frames.size,0);
  f.document.hidden=false;f.document.dispatchEvent(new Event('visibilitychange'));await flush();f.advance(1);assert.equal(f.video.currentTime,4);
  f.document.documentElement.dataset.pageTransition='closing';f.window.dispatchEvent(new Event('page-transition-start'));
  assert.equal(f.video.paused,true);delete f.document.documentElement.dataset.pageTransition;
  f.window.dispatchEvent(new Event('page-transition-end'));await flush();assert.equal(f.frames.size,1);
});
test('reload, history, repeat visits and internal returns skip without requesting either video',async()=>{
  for(const options of [{navigation:'reload'},{navigation:'back_forward'},{referrer:'https://portfolio.test/contact'},
    {tabStorage:new Map([['zhao-portfolio-opening-visited','true']])}]){
    const f=fixture(options);await flush();assert.equal(f.root.dataset.state,'skipped');assert.equal(f.loads.length,0);
    assert.equal(f.root.hidden,true);assert.deepEqual(f.universeStates,[false]);
  }
  const first=fixture();await flush();const repeat=fixture({tabStorage:first.tabStorage});await flush();assert.equal(repeat.loads.length,0);
  const fresh=fixture();await flush();assert.equal(fresh.root.dataset.state,'playing');
});
test('unavailable storage still honors navigation fallbacks and reduced motion does not download a film',async()=>{
  const f=fixture({storageUnavailable:true});await flush();assert.equal(f.root.dataset.state,'playing');
  const refresh=fixture({storageUnavailable:true,navigation:'reload'});assert.equal(refresh.loads.length,0);
  const reduced=fixture({reduced:true});assert.equal(reduced.root.hidden,true);assert.ok(reduced.loads.every(src=>!src));
});
test('cached restoration, disposal and failed playback never leave a covered homepage',async()=>{
  const f=fixture();await flush();f.window.dispatchEvent(Object.assign(new Event('pagehide'),{persisted:true}));
  f.window.dispatchEvent(new Event('pageshow'));assert.equal(f.root.hidden,true);assert.equal(f.frames.size,0);
  const pending=fixture({loaded:false});pending.controller.destroy();pending.window.dispatchEvent(new Event('load'));await flush();
  assert.equal(pending.frames.size,0);assert.equal(pending.video.src,'');
  const failed=fixture({rejectPlay:true});await flush();assert.equal(failed.root.hidden,true);assert.equal(failed.frames.size,0);
  const error=fixture({mediaLoaded:false});error.video.dispatchEvent(new Event('error'));assert.equal(error.root.hidden,true);
  const timeout=fixture({mediaLoaded:false});[...timeout.timers.values()].forEach(fn=>fn());assert.equal(timeout.root.hidden,true);
});
test('browsers without native frame callbacks keep the video clock and clean up the fallback',async()=>{
  const f=fixture({nativeFrames:false});await flush();f.advance(5);assert.equal(f.video.currentTime,5);assert.equal(f.frames.size,1);
  f.controller.destroy();assert.equal(f.frames.size,0);
});
test('the diagonal mask starts closed and clears every corner at wide, square and portrait ratios',()=>{
  for(const [width,height] of [[2560,1068],[1440,810],[967,724],[390,633],[2000,600]]){
    const root={style:{}};const reveal=createVideoReveal(root);reveal.resize(width,height);
    assert.equal(reveal.render(VIDEO_REVEAL_START-.01),false);
    reveal.render(VIDEO_DURATION);
    const hole=root.style.clipPath.split('Z M')[1].replace(/Z.*$/,'').split(' L').map(p=>p.split(' ').map(Number));
    const inside=([x,y])=>{let n=false;for(let i=0,j=3;i<4;j=i++){
      const [a,b]=hole[i],[c,d]=hole[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)n=!n;
    }return n;};
    assert.ok([[.1,.1],[width-.1,.1],[.1,height-.1],[width-.1,height-.1]].every(inside),`${width}x${height}`);
  }
});
