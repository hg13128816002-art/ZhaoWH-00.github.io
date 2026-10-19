import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
const source=stripTypeScriptTypes(readFileSync(new URL('../src/scripts/contact-terminal.ts',import.meta.url),'utf8')).replace('void initSatellite();','');
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function fixture({secure=true,rejectClipboard=false}={}) {
  let now=0,id=0;const timers=new Map(),animations=[],calls=[],pending=[],fallback=[],navigations=[];
  class Element extends EventTarget {
    dataset={};style={};textContent='';value='';hidden=false;
    getBoundingClientRect(){return {left:0,top:0,right:400,width:400,height:100};}
    setAttribute(){}getAttribute(){return null;}select(){}setSelectionRange(){}remove(){}focus(){}
    animate(){const animation={finished:new Promise(()=>{}),cancel(){this.cancelled=true;},cancelled:false};animations.push(animation);return animation;}
  }
  const status=new Element(),canvas=new Element(),linkLabel=new Element(),readout=new Element();
  const message=new Element(),countdown=new Element(),countdownValue=new Element(),cancel=new Element(),feedback=new Element();
  feedback.hidden=true;countdown.hidden=true;
  const feedbackNodes={'[data-feedback-message]':message,'[data-countdown]':countdown,'[data-countdown-value]':countdownValue,'[data-cancel-navigation]':cancel};
  feedback.querySelector=selector=>feedbackNodes[selector];
  const points=[new Element(),new Element()],paths=[new Element(),new Element()],link=new Element();
  link.querySelectorAll=()=>paths;link.querySelector=()=>paths[0];
  const channels=Array.from({length:3},()=>new Element());
  channels[0].dataset.copy='zhaowenhaodesign@163.com';channels[1].dataset.copy='Zwh1326562';
  channels[2].getAttribute=name=>name==='href'?'https://space.bilibili.com/430411383':null;
  channels.forEach(c=>{c.querySelector=()=>new Element();c.querySelectorAll=()=>points;});
  const root=new Element(),workspace=new Element();
  const nodes={'.terminal-workspace':workspace,'.satellite-stage':new Element(),'[data-satellite-canvas]':canvas,'[data-copy-status]':status,'.signal-link':link,'[data-channel-readout]':readout,'[data-link-label]':linkLabel,'.satellite-source':new Element()};
  root.querySelector=selector=>nodes[selector]??new Element();root.querySelectorAll=()=>channels;
  const window=Object.assign(new EventTarget(),{isSecureContext:secure,location:{assign:url=>navigations.push(url)},matchMedia:()=>Object.assign(new EventTarget(),{matches:false}),setTimeout:(fn,delay)=>{timers.set(++id,{fn,due:now+delay});return id;},clearTimeout:id=>timers.delete(id)});
  const document=Object.assign(new EventTarget(),{querySelector:selector=>selector==='[data-signal-feedback]'?feedback:root,hidden:false,fonts:{ready:Promise.resolve()},createElement:()=>new Element(),body:{appendChild(){}},execCommand:command=>{fallback.push(command);return true;}});
  const navigator={clipboard:{writeText:text=>{calls.push(text);return rejectClipboard?Promise.reject(Error('Permission denied')):new Promise(resolve=>pending.push(resolve));}}};
  vm.runInNewContext(source,{window,document,navigator,performance:{now:()=>now},ResizeObserver:class{observe(){}disconnect(){}}});
  return {status,root,channels,calls,pending,fallback,message,feedback,countdownValue,cancel,navigations,animations,window,
    click(index,options={}){const e=Object.assign(new Event('click',{cancelable:true}),options);channels[index].dispatchEvent(e);return e;},
    advance(ms){const end=now+ms;for(let n=0;n<100;n++){const next=[...timers].sort((a,b)=>a[1].due-b[1].due)[0];if(!next||next[1].due>end)break;now=next[1].due;timers.delete(next[0]);next[1].fn();}now=end;},
  };
}
test('hover aims without copying, navigating, or emitting a packet; activation copies immediately',async()=>{
  const f=fixture();f.channels[0].dispatchEvent(new Event('pointerenter'));
  assert.equal(f.root.dataset.linkState,'aiming');assert.equal(f.calls.length,0);assert.equal(f.animations.length,0);assert.equal(f.navigations.length,0);
  f.click(0);assert.deepEqual(f.calls,['zhaowenhaodesign@163.com']);assert.equal(f.root.dataset.linkState,'transmitting');
  f.pending[0]();await flush();assert.equal(f.feedback.hidden,false);assert.equal(f.message.textContent,'/你成功的复制了我的联系方式/');
  f.advance(1800);assert.equal(f.feedback.hidden,true);
});
test('a late copy result cannot overwrite feedback from a later click',async()=>{
  const f=fixture();f.click(0);f.click(1);f.pending[1]();await flush();assert.equal(f.status.textContent,'微信号已复制');
  f.pending[0]();await flush();assert.equal(f.status.textContent,'微信号已复制');
});
test('HTTP preview and denied clipboard permission both fall back with one click',async()=>{
  for(const options of [{secure:false},{rejectClipboard:true}]){const f=fixture(options);f.click(1);await flush();assert.deepEqual(f.fallback,['copy']);assert.equal(f.message.textContent,'/你成功的复制了我的联系方式/');}
});
test('bilibili displays 3, 2, 1 and navigates exactly once after three seconds',()=>{
  const f=fixture();const event=f.click(2);assert.equal(event.defaultPrevented,true);assert.equal(f.message.textContent,'即将跳转到 bilibili');assert.equal(f.countdownValue.textContent,'3');assert.equal(f.navigations.length,0);
  f.advance(1000);assert.equal(f.countdownValue.textContent,'2');f.advance(1000);assert.equal(f.countdownValue.textContent,'1');f.advance(999);assert.equal(f.navigations.length,0);
  f.advance(1);assert.deepEqual(f.navigations,['https://space.bilibili.com/430411383']);f.advance(10000);assert.equal(f.navigations.length,1);
});
test('cancelling, clicking another option, and leaving the page clear a pending redirect',()=>{
  for(const action of ['cancel','copy','leave']){const f=fixture();f.click(2);f.advance(1000);if(action==='cancel')f.cancel.dispatchEvent(new Event('click'));if(action==='copy')f.click(0);if(action==='leave')f.window.dispatchEvent(Object.assign(new Event('pagehide'),{persisted:true}));f.advance(5000);assert.equal(f.navigations.length,0);}
});
test('modifier clicks retain native external-link behavior',()=>{
  const f=fixture();const event=f.click(2,{metaKey:true});assert.equal(event.defaultPrevented,false);assert.equal(f.feedback.hidden,true);f.advance(5000);assert.equal(f.navigations.length,0);
});
