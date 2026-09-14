import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createZLoadingGeometry} from '../src/scripts/opening/z-loading.js';
import {createPageTransitionRenderer} from '../src/scripts/page-transition-renderer.js';
const source = readFileSync(new URL('../src/scripts/page-transition.js', import.meta.url), 'utf8').replace('export function', 'function');
const key = 'zhao-page-transition-v1';
const flush = async () => { for (let i=0; i<8; i++) await Promise.resolve(); };
function fixture({url='https://portfolio.test/', skip=true, loaded=true, fonts=Promise.resolve(), content=undefined, storage=new Map(), now=1000000, reduced=false, referrer='', unavailable=false}={}) {
  const assigned=[], draws=[], sizes=[], frames=new Map(); let id=0;
  const root={hidden:skip,dataset:{skipInitial:String(skip)}};
  const motion=Object.assign(new EventTarget(), {matches:reduced});
  const window=Object.assign(new EventTarget(), {innerWidth:1280,innerHeight:800,fontsReadyPromise:fonts,pageTransitionContentReady:content,
    location:{href:url,assign:href=>assigned.push(href)},matchMedia:()=>motion,
    sessionStorage:{getItem(k){if(unavailable)throw Error();return storage.get(k)??null},setItem(k,v){if(unavailable)throw Error();storage.set(k,v)},removeItem(k){if(unavailable)throw Error();storage.delete(k)}}});
  const document=Object.assign(new EventTarget(),{hidden:false,readyState:loaded?'complete':'loading',referrer,
    documentElement:{dataset:{}},head:{appendChild(){}},createElement:()=>({})});
  const init=vm.runInNewContext(source+'\ninitPageTransition',{window,document,performance:{getEntriesByType:()=>[{type:'navigate'}]},
    Date:{now:()=>now},URL,Event,AbortController,requestAnimationFrame:cb=>{frames.set(++id,cb);return id},cancelAnimationFrame:id=>frames.delete(id)});
  init(root,{draw:(...args)=>draws.push(args),resize:(...args)=>sizes.push(args)});
  return {root,window,document,assigned,draws,sizes,frames,storage,
    advance(time){now=time;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(cb=>cb())},
    event(type,props={}){window.dispatchEvent(Object.assign(new Event(type),props))},
    click(href,props={}){
      const link={href,target:props.target??'',hasAttribute:name=>name==='download'&&!!props.download};
      const e=new Event('click',{cancelable:true});
      const {target,download,...eventProps}=props;
      Object.assign(e,{button:0,...eventProps});Object.defineProperty(e,'target',{value:{closest:()=>link}});
      document.dispatchEvent(e);return e;
    }};
}

test('close completely before navigating once; the source keeps looping while navigation loads',async()=>{
  const f=fixture();await flush();await f.window.pageTransitionReady;
  assert.equal(f.root.hidden,true);assert.equal(f.frames.size,0);
  assert.equal(f.click('https://portfolio.test/contact').defaultPrevented,true);
  assert.equal(f.root.dataset.transitionState,'closing');assert.equal(f.assigned.length,0);
  f.advance(1000600);assert.equal(f.assigned.length,0);
  f.advance(1000867);assert.deepEqual(f.assigned,['https://portfolio.test/contact']);
  assert.equal(f.root.dataset.transitionState,'loading');
  f.click('https://portfolio.test/profile');f.advance(1030000);
  assert.equal(f.assigned.length,1);assert.equal(f.root.dataset.transitionState,'loading');
  assert.equal(JSON.parse(f.storage.get(key)).started,1000867);
});

test('destination resumes the handoff clock and waits for BOTH load and fonts before a settled opening',async()=>{
  let fontsReady;const fonts=new Promise(resolve=>fontsReady=resolve);
  const storage=new Map([[key,JSON.stringify({to:'https://portfolio.test/contact',started:1000000})]]);
  const f=fixture({url:'https://portfolio.test/contact/',skip:false,now:1000400,loaded:false,fonts,storage});
  assert.equal(f.draws.at(-1)[1],400);assert.equal(storage.has(key),false);
  let revealed=false;f.window.pageTransitionReady.then(()=>revealed=true);
  f.advance(1004000);assert.equal(f.root.dataset.transitionState,'loading');
  f.event('load');await flush();f.advance(1005000);assert.equal(f.root.dataset.transitionState,'loading');
  fontsReady();await flush();f.advance(1005100);assert.equal(revealed,false);
  f.advance(1005400);assert.equal(f.root.dataset.transitionState,'opening');
  assert.deepEqual(f.draws.at(-1).slice(0,3),['opening',0,5400]);
  f.advance(1006200);await flush();assert.equal(f.root.hidden,true);assert.equal(revealed,true);assert.equal(f.frames.size,0);
});

test('same-document hashes, downloads, new tabs and external links retain native behavior',async()=>{
  for(const [href,props] of [
    ['https://portfolio.test/#works',{}],['https://external.test/',{}],['mailto:me@example.test',{}],
    ['https://portfolio.test/contact',{metaKey:true}],['https://portfolio.test/contact',{button:1}],
    ['https://portfolio.test/contact',{target:'_blank'}],['https://portfolio.test/file.pdf',{download:true}],
  ]){const f=fixture();await flush();assert.equal(f.click(href,props).defaultPrevented,false);assert.equal(f.root.hidden,true)}
  const query=fixture();await flush();assert.equal(query.click('https://portfolio.test/?view=other#works').defaultPrevented,true);
});

test('browser cache restoration reopens the cached page without repeating its previous navigation',async()=>{
  const f=fixture();await flush();f.window.triggerPureTransition('/contact');f.advance(1000867);
  f.event('pagehide',{persisted:true});assert.equal(f.frames.size,0);
  f.advance(1005000);f.event('pageshow',{persisted:true});f.advance(1005001);f.advance(1005900);f.advance(1006700);
  assert.equal(f.assigned.length,1);assert.equal(f.root.hidden,true);assert.equal(f.frames.size,0);
});

test('reduced motion uses a static Z but still waits for real page readiness',async()=>{
  const f=fixture({skip:false,loaded:false,reduced:true});await flush();f.advance(1000100);
  assert.equal(f.root.hidden,false);assert.equal(f.frames.size,0);
  f.event('load');await flush();f.advance(1000200);assert.equal(f.root.hidden,true);
  f.window.triggerPureTransition('/contact');assert.equal(f.assigned.length,1);assert.equal(f.draws.at(-1)[3],true);
});

test('incoming home navigation still has a gate when storage is unavailable; direct home does not',async()=>{
  const f=fixture({unavailable:true,referrer:'https://portfolio.test/contact'});await flush();
  assert.equal(f.root.hidden,false);f.advance(1000010);f.advance(1000900);f.advance(1001700);
  assert.equal(f.root.hidden,true);
  const direct=fixture({unavailable:true});await flush();assert.equal(direct.root.hidden,true);
});

test('hidden documents and disposed navigations stop animation work',async()=>{
  const f=fixture({skip:false,loaded:false});await flush();assert.equal(f.frames.size,1);
  f.document.hidden=true;f.document.dispatchEvent(new Event('visibilitychange'));assert.equal(f.frames.size,0);
  f.document.hidden=false;f.document.dispatchEvent(new Event('visibilitychange'));assert.equal(f.frames.size,1);
  f.event('pagehide',{persisted:false});assert.equal(f.frames.size,0);f.event('load');await flush();
  f.window.triggerPureTransition('/contact');assert.equal(f.assigned.length,0);assert.equal(f.frames.size,0);
});

// Minimal SVG document: assert actual geometry covers every aspect ratio and stage joins are continuous.
class SvgNode {
  constructor(tag){this.tag=tag;this.attributes={};this.children=[];this.dataset={}}
  setAttribute(k,v){this.attributes[k]=String(v)}getAttribute(k){return this.attributes[k]??null}
  appendChild(n){this.children.push(n)}querySelector(){return this.children[0]}
}
function svgFixture(){
  const root=new SvgNode('div');root.appendChild(new SvgNode('svg'));
  const create=vm.runInNewContext('('+createPageTransitionRenderer.toString()+')',{document:{createElementNS:(_,tag)=>new SvgNode(tag)}});
  return {root,svg:root.children[0],renderer:create(root,createZLoadingGeometry())};
}
function inside(point,poly){let result=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [x,y]=poly[i],[px,py]=poly[j];if((y>point[1])!==(py>point[1])&&point[0]<(px-x)*(point[1]-y)/(py-y)+x)result=!result;
}return result}
function covered(svg,point){return svg.children.filter(n=>n.attributes['data-z-shutter']).some(g=>{
  const move=g.attributes.transform.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const numbers=g.children[0].attributes.d.match(/-?\d+(?:\.\d+)?/g).map(Number),poly=[];
  for(let i=0;i<numbers.length;i+=2)poly.push([numbers[i]+move[0],numbers[i+1]+move[1]]);
  return inside(point,poly);
})}

test('shutters fully cover and fully clear wide, square and tall screens',()=>{
  for(const [w,h]of [[1280,534],[1920,1080],[800,800],[390,844],[2560,720]]){
    const {renderer,svg}=svgFixture();renderer.resize(w,h);const H=1280*h/w;
    const corners=[[.1,.1],[1279.9,.1],[.1,H-.1],[1279.9,H-.1],[640,H/2]];
    renderer.draw('closing',52*1000/60);assert.ok(corners.every(p=>covered(svg,p)),`closed ${w}x${h}`);
    renderer.draw('closing',0);assert.ok(corners.every(p=>!covered(svg,p)),`open ${w}x${h}`);
  }
});

test('Z formation, hourglass and opening meet without changing the visible contours',()=>{
  const {renderer,svg}=svgFixture();renderer.resize(1280,800);
  const snapshot=n=>({tag:n.tag,attributes:Object.fromEntries(Object.entries(n.attributes).filter(([k])=>k!=='stroke-dashoffset')),children:n.children.map(snapshot)});
  renderer.draw('closing',52*1000/60);const closed=snapshot(svg);
  renderer.draw('loading',0);assert.deepEqual(snapshot(svg),closed);
  for(const boundary of [900,1800,2700]){
    renderer.draw('loading',boundary);const end=snapshot(svg);
    renderer.draw('opening',0,boundary);assert.deepEqual(snapshot(svg),end);
  }
});


test('destination keeps the hourglass until its first content layout has painted',async()=>{
  let ready; const content=new Promise(resolve=>ready=resolve);
  const f=fixture({skip:false,content});await flush();
  f.advance(1003600);assert.equal(f.root.dataset.transitionState,'loading');
  ready();await flush();f.advance(1003610);
  assert.equal(f.root.dataset.transitionState,'loading');
  f.advance(1004500);assert.equal(f.root.dataset.transitionState,'opening');
});

test('closing visibly shortens the diagonal before growing the horizontal strokes',()=>{
  const {renderer,svg,root}=svgFixture();renderer.resize(1280,800);
  const rotor=svg.children.find(n=>'data-z-mark' in n.attributes).children[0];
  const stroke=()=>rotor.children[4].attributes.d;
  renderer.draw('closing',300);const long=stroke();
  renderer.draw('closing',500);const middle=stroke();
  renderer.draw('closing',590);const short=stroke();
  assert.notEqual(long,middle);assert.notEqual(middle,short);
  assert.equal(root.dataset.transitionStep,'hold-stroke');
  const collapsed=rotor.children[0].attributes.d;
  renderer.draw('closing',630);assert.equal(stroke(),short);
  assert.equal(rotor.children[0].attributes.d,collapsed);
  renderer.draw('closing',780);assert.equal(stroke(),short);
  assert.notEqual(rotor.children[0].attributes.d,collapsed);
  assert.equal(root.dataset.transitionStep,'form-z');
});
