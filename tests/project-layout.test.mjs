import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {initProjectLayout} from '../src/scripts/project-layout.js';

test('project layout measures only nearby entries and batches reads before style writes',async()=>{
  const operations=[], frames=new Map(); let next=0, intersections;
  const entries=Array.from({length:3},(_,i)=>{
    const entry={id:`project-${i}`,style:{setProperty:(key,value)=>operations.push(['write',i,key,value])}};
    const strip={getBoundingClientRect:()=>{operations.push(['read',i]);return {top:100,height:40}}};
    const text={getBoundingClientRect:()=>{operations.push(['read',i]);return {bottom:240}}};
    entry.querySelector=selector=>selector==='.thumb-strip'?strip:text;
    return entry;
  });
  const window=Object.assign(new EventTarget(),{location:{hash:''},matchMedia:()=>({matches:true}),fontsReadyPromise:Promise.resolve()});
  const document=Object.assign(new EventTarget(),{hidden:false,querySelectorAll:selector=>selector==='.project-entry'?entries:[]});
  const run=vm.runInNewContext('('+initProjectLayout.toString()+')',{
    window,document,AbortController,getComputedStyle:()=>({marginTop:'8px'}),
    IntersectionObserver:class{constructor(callback){intersections=callback}observe(){}disconnect(){}},
    ResizeObserver:class{observe(){}disconnect(){}},
    requestAnimationFrame:callback=>{frames.set(++next,callback);return next},cancelAnimationFrame:id=>frames.delete(id),
  });
  const advance=()=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(callback=>callback())};
  run();intersections([{target:entries[1],isIntersecting:true}]);
  for(let i=0;i<4;i++)await Promise.resolve();
  let ready=false;window.pageTransitionContentReady.then(()=>ready=true);
  advance();assert.equal(ready,false);
  assert.deepEqual(operations.map(op=>op[0]),['read','read','read','read','write','write']);
  assert.ok(operations.every(op=>op[1]!==2));
  assert.deepEqual(operations.filter(op=>op[0]==='write').map(op=>op[3]),['108px','108px']);
  advance();await Promise.resolve();assert.equal(ready,true);
  operations.length=0;
  intersections([{target:entries[0],isIntersecting:false},{target:entries[1],isIntersecting:false},{target:entries[2],isIntersecting:true}]);
  advance();assert.ok(operations.length>0);assert.ok(operations.every(op=>op[1]===2));
});
