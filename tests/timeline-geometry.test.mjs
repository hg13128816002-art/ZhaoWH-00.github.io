import test from 'node:test';
import assert from 'node:assert/strict';
import {createTimelineAnchors,isSectionNearViewport,getTimelineScrollProgress} from '../src/scripts/timeline-geometry.js';

test('viewport checks stay valid when the timeline is inside an offset page container',()=>{
  // The section's offsetTop is zero, but its document top is 1561 and scrollY is 1633.
  assert.equal(isSectionNearViewport({top:-72,bottom:926},1085),true);
  assert.equal(getTimelineScrollProgress(-72,998,1085,598),1);
  assert.equal(isSectionNearViewport({top:1600,bottom:2600},1085),false);
  assert.equal(isSectionNearViewport({top:-2200,bottom:-1200},1085),false);
});

test('growth reaches the endpoint while the timeline is centered, including direct anchor arrivals',()=>{
  for(const viewport of [600,800,1080]){
    const height=viewport*.92, axis=height*.6;
    assert.equal(getTimelineScrollProgress(viewport-axis,height,viewport,axis),0);
    assert.equal(getTimelineScrollProgress((viewport-height)/2,height,viewport,axis),1);
    assert.equal(getTimelineScrollProgress(0,height,viewport,axis),1);
    assert.equal(getTimelineScrollProgress(-viewport*4,height,viewport,axis),1);
  }
});

test('irregular timeline keeps chronological order and leaves cards room at all desktop widths',()=>{
  for(const width of [840,1100,1624,2400]){
    const {points,cardWidth}=createTimelineAnchors(12,width);
    assert.ok(points[0].x-cardWidth/2>=8);
    assert.ok(points.at(-1).x+cardWidth/2<=width-8);
    const gaps=points.slice(1).map((p,i)=>p.x-points[i].x);
    assert.ok(gaps.every(g=>g>0));
    assert.ok(Math.max(...gaps)/Math.min(...gaps)>1.4);
    points.slice(2).forEach((p,i)=>assert.ok(p.x-points[i].x>=cardWidth+13));
    assert.equal(points[1].level,points[2].level);
    assert.equal(points[6].level,points[7].level);
  }
});
