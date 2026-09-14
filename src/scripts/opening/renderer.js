// Adapted from archive/z-opening-37/opening-37.js. Original glyphs and musical cues are retained.
// Geometry/layout only: playback, audio, visibility and disposal belong to the host controller.
import { createZLoadingGeometry } from './z-loading.js';
export const OPENING_TIMING = { revealStart:1190/60, visualEnd:1220/60, audioEnd:24.624 };
export function createOpeningRenderer(root, { reducedMotion = false } = {}) {

  const $ = selector => root.querySelector(selector);
  const all = selector => [...root.querySelectorAll(selector)];
  const ns = 'http://www.w3.org/2000/svg';
  const make = (name, attrs, parent) => {
    const node = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attrs || {})) node.setAttribute(key, String(value));
    if (parent) parent.appendChild(node);
    return node;
  };
  const attr = (node, key, value) => {
    const text = String(value);
    if (node.getAttribute(key) !== text) node.setAttribute(key, text);
  };
  const visible = (node, value) => {
    attr(node,'visibility',value ? 'visible' : 'hidden');
    attr(node,'display',value ? 'inline' : 'none');
  };
  const transform = (x, y, scale = 1, angle = 0) =>
    'translate(' + x + ' ' + y + ') rotate(' + angle + ') scale(' + scale + ')';
  const clamp = x => Math.max(0, Math.min(1, x));
  const mix = (a, b, p) => a + (b - a) * p;
  const polygon = points => 'M' + points.map(p => p.map(v => v.toFixed(3)).join(',')).join(' L') + ' Z';
  const hash = n => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  };
  function bezier(x1, y1, x2, y2) {
    const at = (t, a, b) => 3 * (1 - t) * (1 - t) * t * a + 3 * (1 - t) * t * t * b + t * t * t;
    return x => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 22; i++) {
        if (at(t, x1, x2) < x) lo = t; else hi = t;
        t = (lo + hi) / 2;
      }
      return at(t, y1, y2);
    };
  }
  const grow = bezier(.18, .72, .22, 1.05);
  const ease = bezier(.22, 0, .28, 1), move = bezier(.55, 0, .20, 1);
  // A firmer attack over three quarters of a beat, with no overshoot or recoil.
  // Only the closing motion changes; the opening and camera curves stay shared.
  const strike = bezier(.22, .04, .18, 1), typeIn = bezier(.16, .70, .28, 1);
  const camera = bezier(.18, .68, .28, 1);
  const phase = (t, a, b, f = ease) => f(clamp((t - a) / (b - a)));

  const BLUE = '#ACDBFB', BLACK = '#040A10';
  // Start on beat 3 to keep the approved shot lengths close to Opening 16.
  // A beat is exactly 40 frames at 60 fps; use frames for cue comparisons.
  const BPM = 90, FPS = 60, FRAME = 1000 / FPS;
  const BEAT_FRAMES = FPS * 60 / BPM, START_BEAT = 2;
  const atBeat = n => n * BEAT_FRAMES * FRAME;
  const BEAT = atBeat(1), SUB_BEAT = BEAT / 8;
  const snap = t => Math.round(t / SUB_BEAT) * SUB_BEAT;
  const phraseCuts = [0,2,4,6,8].map(atBeat);
  const collageCuts = [0,1,2,3,4,5].map(atBeat);
  const detailCuts = [0,2,4,6,8,9,10,11,12,13].map(atBeat);
  const PHRASE_END = atBeat(8), LOGO_START_FRAME = 13 * BEAT_FRAMES;
  const LOGO_START = LOGO_START_FRAME * FRAME;
  // Prepend one full bar. All approved scenes still run on their original clock.
  const LOADING_FRAMES = 4 * BEAT_FRAMES, MOTION_FRAMES = LOADING_FRAMES + 23 * BEAT_FRAMES;
  const MOTION_DURATION = MOTION_FRAMES * FRAME, DURATION = 24624;
  const TOTAL_FRAMES = Math.ceil(DURATION/FRAME);
  const OUTRO_START_FRAME = 29 * BEAT_FRAMES, OUTRO_TIME_SCALE = 1.5;
  const OUTRO_REVEAL_FRAME = OUTRO_START_FRAME + BEAT_FRAMES / 2 * OUTRO_TIME_SCALE;
  const OUTRO_END_FRAME = OUTRO_START_FRAME + BEAT_FRAMES * OUTRO_TIME_SCALE;
  const timing = {
    seedEnd:atBeat(.25),barEnd:atBeat(.75),
    pullStart:atBeat(1),logoSettled:atBeat(1.75),
    sloganStart:atBeat(1.125),sloganStagger:atBeat(.125),sloganDuration:atBeat(.375),
    // Invert on beat 4; reveal the name on the following weak beat, beat 2.
    shakeStart:0,logoInvert:atBeat(4),cut:atBeat(6)
  };
  const background = $('[data-background]'), ink = $('[data-ink]');
  const frameArt = $('#zo-frame-art');
  const phraseScene = $('[data-phrase-scene]'), collageScene = $('[data-collage-scene]');
  const closingScene = $('[data-closing-scene]'), detailScene = $('[data-detail-scene]');
  const collageWindow = $('[data-collage-window]');
  const loadingScene = $('[data-loading-scene]'), loadingMark = $('[data-loading-mark]');
  const loadingRotor = $('[data-loading-rotor]'), loadingDiagonal = $('[data-loading-diagonal]');
  const loadingStream = $('[data-loading-stream]'), loadingIntact = $('[data-loading-intact]');
  const rowWindows = all('[data-row-window]');
  const holes = all('[data-hole]'), sliceClips = all('[data-slice-clip]'), sliceCopies = all('[data-slice-copy]');
  const outroScene = $('[data-outro-scene]'), outroMark = $('[data-outro-mark]');
  const nextContent = $('[data-next-content]'), outroGateLayer = $('[data-outro-gates]');
  const reduced = { matches: reducedMotion };
  const stage = $('.zo-stage'), picture = $('[data-picture]');
  const layout = { width: 1280, height: 534, original: true, portrait: false, blend: 0 };
  let lastTime = 0, lastFrame = -1, loadTravel = 730, loadReach = 730;

  // Original family: 7-unit upright strokes and Z-parallel fine joins.
  const wordmarkZScale = 64 / 189;
  const wordmarkZWidth = 2 * (72 + 18 + 2 * Math.hypot(18, 19) / 19 + 3) * wordmarkZScale;
  const glyphWidths = {
    Z:wordmarkZWidth, h:40, a:40, o:40, W:70, e:36, n:40, H:46,
    F:38, T:42, E:38, r:28, g:40, d:40, x:44, t:26, i:7, y:40,
    M:74.632, k:40, s:36, m:73, f:34, '.':7,
    '#':46, '&':48, '+':38, '?':34, '/':48, '=':38
  };
  const tracking = 7, wordSpace = 24;
  const diagonalSlope = 18 / 19;
  const diagonalThickness = 4 * wordmarkZScale;
  const diagonalBand = diagonalThickness * Math.hypot(1, diagonalSlope);
  const glyphNames = {'.':'period','#':'hash','&':'ampersand','+':'plus','?':'question','/':'slash','=':'equals'};
  const glyphId = letter => '#zo-glyph-' + (glyphNames[letter] || letter);
  function fineJoin(innerX, innerY) {
    const inner = innerX + diagonalSlope * innerY, outer = inner - diagonalBand;
    return {
      ox:y => outer - diagonalSlope * y,
      oy:x => (outer - x) / diagonalSlope,
      ix:y => inner - diagonalSlope * y,
      iy:x => (inner - x) / diagonalSlope
    };
  }
  function setDiagonalGlyph(letter, contours) {
    $('[data-diagonal-glyph="' + letter + '"]').setAttribute('d', contours.map(polygon).join(' '));
  }
  const hJoin = fineJoin(21, -35);
  setDiagonalGlyph('h', [[[0,0],[0,-64],[7,-64],[7,hJoin.oy(7)],[hJoin.ox(-42),-42],
    [40,-42],[40,0],[33,0],[33,-35],[21,-35],[7,hJoin.iy(7)],[7,0]]]);
  const roundJoin = fineJoin(14, -35);
  const nContour = [[0,0],[0,roundJoin.oy(0)],[roundJoin.ox(-42),-42],[40,-42],
    [40,0],[33,0],[33,-35],[14,-35],[7,roundJoin.iy(7)],[7,0]];
  setDiagonalGlyph('o', [
    [[roundJoin.ox(-42),-42],[40,-42],[40,0],[0,0],[0,roundJoin.oy(0)]],
    [[7,roundJoin.iy(7)],[7,-7],[33,-7],[33,-35],[14,-35]]
  ]);
  setDiagonalGlyph('n', [nContour]);
  const aJoin = fineJoin(10, -21);
  setDiagonalGlyph('a', [
    [[6,-42],[40,-42],[40,0],[0,0],[0,aJoin.oy(0)],[aJoin.ox(-28),-28],[33,-28],[33,-35],[6,-35]],
    [[7,aJoin.iy(7)],[7,-7],[33,-7],[33,-21],[10,-21]]
  ]);
  const eJoin = fineJoin(7, -35);
  const tip = [17,-17], tipC = tip[0] + diagonalSlope * tip[1];
  const halfNormal = diagonalThickness / (2 * Math.hypot(1, diagonalSlope));
  const tipPlus = [tip[0] + halfNormal, tip[1] + halfNormal * diagonalSlope];
  const tipMinus = [tip[0] - halfNormal, tip[1] - halfNormal * diagonalSlope];
  setDiagonalGlyph('e', [[[eJoin.ox(-42),-42],[36,-42],
    [36,(tipC + diagonalBand / 2 - 36) / diagonalSlope],tipPlus,tipMinus,
    [29,(tipC - diagonalBand / 2 - 29) / diagonalSlope],[29,-35],[7,-35],
    [7,-7],[36,-7],[36,0],[0,0],[0,eJoin.oy(0)]]]);
  setDiagonalGlyph('r', [[[0,0],[0,roundJoin.oy(0)],[roundJoin.ox(-42),-42],
    [28,-42],[28,-35],[14,-35],[7,roundJoin.iy(7)],[7,0]]]);
  const bowlCounter = [[7,roundJoin.iy(7)],[7,-7],[33,-7],[33,-35],[14,-35]];
  setDiagonalGlyph('g', [
    [[roundJoin.ox(-42),-42],[40,-42],[40,18],[7,18],[7,11],[33,11],[33,0],[0,0],[0,roundJoin.oy(0)]],
    bowlCounter
  ]);
  setDiagonalGlyph('d', [
    [[roundJoin.ox(-42),-42],[33,-42],[33,-64],[40,-64],[40,0],[0,0],[0,roundJoin.oy(0)]],
    bowlCounter
  ]);
  setDiagonalGlyph('x', [
    [[0,-42],[8,-42],[44,0],[36,0]],
    [[42 * diagonalSlope,-42],[42 * diagonalSlope + diagonalBand,-42],[diagonalBand,0],[0,0]]
  ]);

  // Only the missing letters in "Make something different." are added.
  // Each rising arm is computed from the same normal thickness as Z.
  function fineArm(x, y, endY) {
    const c = x + diagonalSlope * y;
    return [[c - diagonalBand / 2 - diagonalSlope * y,y],
      [c + diagonalBand / 2 - diagonalSlope * y,y],
      [c + diagonalBand / 2 - diagonalSlope * endY,endY],
      [c - diagonalBand / 2 - diagonalSlope * endY,endY]];
  }
  setDiagonalGlyph('/', [fineArm(1,0,-48)]);
  // Intersect the existing thick-stroke edges with the two parallel fine edges.
  // One continuous contour avoids opposite-winding overlaps and exposed caps.
  function meetFineEdge(a,b,c) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const u = (c - a[0] - diagonalSlope * a[1]) / (dx + diagonalSlope * dy);
    return [a[0] + u * dx,a[1] + u * dy];
  }
  const mFineC = 35.421 - diagonalSlope * 30;
  const mFineLeft = mFineC - diagonalBand / 2, mFineRight = mFineC + diagonalBand / 2;
  setDiagonalGlyph('M', [[
    [0,0],[0,-64],[7,-64],
    meetFineEdge([7,-64],[37.316,-32],mFineLeft),
    [mFineLeft + diagonalSlope * 64,-64],[74.632,-64],[74.632,0],[67.632,0],
    [67.632,(mFineRight - 67.632) / diagonalSlope],
    meetFineEdge([7,-53],[32.316,-27],mFineRight),[7,-53],[7,0]
  ]]);
  const kFineC = 6.053 - diagonalSlope * 18;
  const kFineLeft = kFineC - diagonalBand / 2, kFineRight = kFineC + diagonalBand / 2;
  setDiagonalGlyph('k', [[
    [0,0],[0,-64],[7,-64],[7,(kFineLeft - 7) / diagonalSlope],
    [kFineLeft + diagonalSlope * 42,-42],[kFineRight + diagonalSlope * 42,-42],
    meetFineEdge([14,-24],[40,-2],kFineRight),[40,-2],[40,0],[31,0],
    [7,-18 + 18 / 25],[7,0]
  ]]);
  setDiagonalGlyph('s', [[[roundJoin.ox(-42),-42],[36,-42],[36,-35],[14,-35],
    [7,roundJoin.iy(7)],[7,-25],[36,-25],[36,0],[0,0],[0,-7],[29,-7],[29,-18],
    [0,-18],[0,roundJoin.oy(0)]]]);
  setDiagonalGlyph('m', [nContour, nContour.map(p => [p[0] + 33,p[1]])]);
  const fJoin = fineJoin(21, -57);
  setDiagonalGlyph('f', [
    [[7,0],[7,fJoin.oy(7)],[fJoin.ox(-64),-64],[34,-64],[34,-57],
      [21,-57],[14,fJoin.iy(14)],[14,0]],
    [[0,-42],[29,-42],[29,-35],[0,-35]]
  ]);

  function geometry(t) {
    // The downbeat itself is the first visibly split frame, not a duplicate bar.
    const u = t < timing.pullStart ? 0 : mix(.008,1,phase(t,timing.pullStart,timing.logoSettled,strike));
    const dx = 72 * u, dy = 76 * u;
    const a = -19 - dy, b = 19 - dy, c = -19 + dy, d = 19 + dy - u;
    const w = 2 * Math.hypot(18,19) / 19, span = 144 + 18 + w + 3;
    const cut = y => -18 / 19 * y;
    const path = polygon([[-span+dx,a],[cut(a)+w,a],[cut(c)+w,c],[span-dx,c],
      [span-dx,d],[cut(d)-w,d],[cut(b)-w,b],[-span+dx,b]]);
    const growth = phase(t,timing.seedEnd,timing.barEnd,grow), sx = mix(3.2 / (2 * span),1,growth);
    const seed = phase(t,0,timing.seedEnd,ease);
    return {path, right:(span-dx)*1.18*sx,
      transform:'scale(' + 1.18 * sx + ' ' + 1.18 * seed + ')'};
  }
  const wordmarkZ = $('[data-wordmark-z]');
  wordmarkZ.setAttribute('d', geometry(timing.logoSettled).path);
  wordmarkZ.setAttribute('transform', 'translate(' + wordmarkZWidth / 2 + ' ' +
    -94 * wordmarkZScale + ') scale(' + wordmarkZScale + ')');

  function createWord(container, text) {
    const cells = [];
    let x = 0;
    for (const letter of text) {
      if (letter === ' ') { x += wordSpace; continue; }
      const node = make('use', {href:glyphId(letter), transform:transform(x,0)}, container);
      cells.push({node, letter, x});
      x += glyphWidths[letter] + tracking;
    }
    return {container, text, cells, width:Math.max(0,x - tracking)};
  }
  // The loading mark uses the actual Z contours, including its optical corrections.
  // Stroke assembly, sand transfer and diagonal shutters occupy the existing four beats.
  let LOAD_MARK_SCALE = .94;
  const LOAD_ENTRY_SCALE = 1.18/.94;
  attr(loadingMark,'transform','translate(640 267) scale('+LOAD_MARK_SCALE+')');
  const loadingGeometry = createZLoadingGeometry();
  const { cut:loadCut, band:loadBand, bar:loadBarPath } = loadingGeometry;
  const loadBars = [true,false].map((top,i) => {
    const node = $(top ? '[data-loading-top]' : '[data-loading-bottom]');
    const clip = make('clipPath',{id:'zo-hourglass-fill-'+i,clipPathUnits:'userSpaceOnUse'},$('defs'));
    const window = make('rect',{x:-110,y:-100,width:220,height:0},clip);
    const body = make('path',{},node);
    const sand = make('path',{'clip-path':'url(#zo-hourglass-fill-'+i+')'},node);
    return {node,body,sand,window,top};
  });
  const loadFlights = [
    {node:loadBars[0].node,from:[-720*LOAD_ENTRY_SCALE,0],hit:[3,0],start:0,end:18,shape:loadBarPath(true,0)},
    {node:loadingDiagonal,from:[520*LOAD_ENTRY_SCALE,-520*LOAD_ENTRY_SCALE/diagonalSlope],hit:[-2,2/diagonalSlope],start:2,end:20,shape:loadBand(-95,94)},
    {node:loadBars[1].node,from:[720*LOAD_ENTRY_SCALE,0],hit:[-3,0],start:4,end:22,shape:loadBarPath(false,0)}
  ];
  const loadEchoes = loadFlights.map(part => make('path',{d:part.shape,opacity:0},$('[data-loading-trails]')));
  const loadFly = bezier(.64,0,.12,1), loadBrake = bezier(.16,.75,.24,1);
  const { drain:loadDrain, angle:loadAngle, retract:loadRetract, open:loadOpen } = loadingGeometry;
  const LOAD_REVEAL_FRAME = 140;
  const FIRST_SCRAMBLE_LEAD = (LOADING_FRAMES-LOAD_REVEAL_FRAME)*FRAME;
  const { normal:loadNormal, tangent:loadTangent } = loadingGeometry;
  const gatePoint = (along,across) => [640+loadTangent[0]*along+loadNormal[0]*across,
    layout.height/2+loadTangent[1]*along+loadNormal[1]*across];
  const loadGates = [-1,1].map(side => {
    const node = make('g',{},$('[data-loading-gates]'));
    // Half-pixel overlap seals the inactive cut; no seam is drawn behind the Z.
    const body = make('path',{fill:BLACK,d:polygon([gatePoint(2200,-side*.5),gatePoint(-2200,-side*.5),
      gatePoint(-2200,side*2200),gatePoint(2200,side*2200)])},node);
    const edge = make('path',{d:polygon([gatePoint(2200,0),gatePoint(-2200,0),
      gatePoint(-2200,side*2*LOAD_MARK_SCALE),gatePoint(2200,side*2*LOAD_MARK_SCALE)])},node);
    return {node,body,edge,side};
  });
  attr(loadingIntact,'d',geometry(timing.logoSettled).path);
  attr(loadingStream,'d','M'+loadCut(-55)+' -55 L'+loadCut(55)+' 55');
  function loadFlightAt(part,f) {
    if (f < part.end) {
      const p = phase(f,part.start,part.end,loadFly);
      return part.from.map((v,i) => mix(v,part.hit[i],p));
    }
    const stop = 1-phase(f,part.end,part.end+4,loadBrake);
    return part.hit.map(v => v*stop);
  }
  function drawLoading(t) {
    const f = t/FRAME;
    const hourglass = phase(f,28,36,ease)*(1-phase(f,116,124,ease));
    const angle = loadAngle(f);
    const second = f >= 90;
    const flow = second ? phase(f,90,116,loadDrain) : phase(f,36,66,loadDrain);
    const topFill = second ? flow : 1-flow;
    const collapse = phase(f,120,136,loadRetract);
    const stretch = phase(f,132,142,loadRetract);
    const opening = phase(f,LOAD_REVEAL_FRAME,159,loadOpen);
    attr(loadingScene,'data-step',f < 28 ? 'assemble' : f < 120 ? 'hourglass' : f < 136 ? 'retract' : f < 140 ? 'extend' : 'reveal');
    attr(loadingScene,'data-open',opening.toFixed(6));
    attr(loadingRotor,'transform','rotate('+angle+')');
    visible(loadingMark,f < LOAD_REVEAL_FRAME);
    loadFlights.forEach((part,i) => {
      const p = loadFlightAt(part,f), previous = loadFlightAt(part,f-1.15);
      attr(part.node,'transform','translate('+p.join(' ')+')');
      attr(loadEchoes[i],'transform','translate('+previous.join(' ')+')');
      attr(loadEchoes[i],'opacity',f < 26 ? .13*clamp(Math.hypot(p[0]-previous[0],p[1]-previous[1])/65) : 0);
    });
    loadBars.forEach(bar => {
      const d = loadBarPath(bar.top,collapse), y = bar.top ? -95 : 57, height = bar.top ? 38 : 37;
      const amount = bar.top ? topFill : 1-topFill;
      // After the flip, local top/bottom exchange roles in screen space.
      attr(bar.window,'y',second ? y : y+height*(1-amount));
      attr(bar.window,'height',height*amount);
      attr(bar.body,'d',d); attr(bar.sand,'d',d);
      attr(bar.body,'opacity',1-.82*hourglass);
      attr(bar.sand,'opacity',hourglass);
    });
    attr(loadingDiagonal,'d',loadBand(mix(-95,-loadReach,stretch),mix(94,loadReach,stretch)));
    attr(loadingDiagonal,'opacity',1-.66*hourglass);
    const flowing = (f >= 36 && f < 66) || (f >= 90 && f < 116);
    attr(loadingStream,'opacity',flowing ? hourglass*.92 : 0);
    attr(loadingStream,'stroke-dashoffset',(second ? 1 : -1)*f*4.2);
    // At the assembled hold a single union contour removes internal antialias seams.
    visible(loadingIntact,f >= 26 && f <= 28);
    loadGates.forEach(gate => {
      const distance = gate.side*loadTravel*opening;
      attr(gate.node,'transform','translate('+loadNormal[0]*distance+' '+loadNormal[1]*distance+')');
      visible(gate.edge,f >= LOAD_REVEAL_FRAME);
    });
    return f < 28 ? '00 · Z 三笔合体' : f < 120 ? '00 · Z 沙漏载入' :
      f < LOAD_REVEAL_FRAME ? '00 · 收束为斜杠' : '00 · 斜切开场';
  }
  const phraseWords = all('[data-phrase-word]').map(node => createWord(node,node.dataset.phraseWord));
  const rowTexts = ['Zhao','WenHao','Zhao WenHao','Zhao WenHao','Zhao WenHao','Zhao WenHao'];
  const collageRows = all('[data-collage-row]').map((node,i) => createWord(node,rowTexts[i]));
  const chunkSizes = {};
  all('[data-glyph-content]').forEach(container => {
    const word = createWord(container,container.dataset.glyphContent);
    chunkSizes[word.text] = word.width;
  });
  function restoreWord(word) {
    for (const cell of word.cells) {
      attr(cell.node,'href',glyphId(cell.letter));
      attr(cell.node,'transform',transform(cell.x,0));
      attr(cell.node,'opacity',1);
    }
  }
  const scramblePool = 'MZWHakensomfhritdxg#&+?/=';
  function scrambleWord(word, local, duration, seed, amount = 1) {
    // Keep the symbol vocabulary with slower changes and small local offsets.
    // Brightness stays constant, and characters settle without column swaps.
    const tick = Math.floor(local / SUB_BEAT + 1e-7);
    word.cells.forEach((cell,i) => {
      const lockAt = Math.round(duration * (.26 + .36 * hash(seed + i * 3.91)) / (BEAT / 4)) * (BEAT / 4);
      const locked = local >= lockAt;
      const noise = hash(seed + i * 41.7 + tick * 19.3);
      const letter = locked ? cell.letter : scramblePool[Math.floor(noise * scramblePool.length)];
      const dx = locked ? 0 : Math.round((hash(seed + tick * 5.2 + i * 31) - .5) * 8) * 3 * amount;
      const dy = locked ? 0 : Math.round((hash(seed + tick * 3.1 + i * 17) - .5) * 4) * 2 * amount;
      attr(cell.node,'href',glyphId(letter));
      attr(cell.node,'transform',transform(cell.x + dx,dy));
      attr(cell.node,'opacity',1);
    });
  }

  // Each cut has its own composition, anchored to letter geometry or its crop seam.
  // Anchor coordinates use the approved glyphs; they follow text placement without
  // inheriting the rapid individual character substitutions of the glitch effect.
  const anchors = words => words.map(word => (cell,x,y) => ({word,cell,x,y}));
  const [pm,ps,pd] = anchors(phraseWords), pc = anchors(collageRows);
  const guide = (points,options = {}) => ({kind:'guide',points,opacity:.42,delay:0,span:360,...options});
  const chip = (at,options = {}) => ({kind:'chip',at,shape:'block',w:6,h:6,opacity:.84,delay:0,...options});
  const decorationShots = [
    {name:'make-diagonals',start:0,end:1450,items:[
      guide([pm(0,-24,-40),pm(0,3,-68.5)],{span:880,travel:true,opacity:.34}),
      guide([pm(0,39,-24),pm(0,65,-51.444)],{delay:340,span:860,travel:true,opacity:.40}),
      guide([pm(0,-17,3),pm(0,9,3),pm(0,9,1)],{delay:140,opacity:.52}),
      guide([pm(0,-4,-57),pm(0,-4,-67),pm(0,5,-67)],{delay:65,opacity:.52}),
      chip(pm(0,-16,-50),{shape:'box',w:8,h:8,delay:160,to:pm(0,-14,-52.111)}),
      chip(pm(0,33,-12),{w:32,h:4,delay:390,to:pm(0,37,-12),out:.87}),
      chip(pm(0,42,-19),{shape:'cut',w:9,h:9.5,delay:710,to:pm(0,45,-22.167)})
    ]},
    {name:'something-steps',start:1450,end:2900,items:[
      guide([ps(0,-77,-25),ps(0,-14,-25)],{span:1060,travel:true,opacity:.38}),
      guide([ps(0,-9,-12),ps(0,-9,22),ps(0,14,22)],{delay:250,span:610,opacity:.46}),
      guide([ps(0,-46,31),ps(0,-25,8.833)],{delay:400,span:850,travel:true,opacity:.32}),
      guide([ps(0,-68,-34),ps(0,-78,-34),ps(0,-78,-38)],{delay:100,opacity:.56}),
      chip(ps(0,-38,-33),{shape:'cut',w:11,h:11.611,delay:120,out:.72}),
      chip(ps(0,-35,-33),{shape:'cut',w:11,h:11.611,delay:220,out:.84}),
      chip(ps(0,-13,4),{w:56,h:4,delay:480,to:ps(0,-7,4)}),
      chip(ps(0,-40,18),{shape:'box',w:8,h:8,delay:700,to:ps(0,-38,15.889)})
    ]},
    {name:'different-crossbars',start:2900,end:4200,items:[
      guide([pd(3,4,-66),pd(3,4,-78),pd(3,28,-78)],{delay:90,span:600,travel:true,opacity:.52}),
      guide([pd(3,-5,-35),pd(3,-5,-2)],{delay:280,span:850,opacity:.32}),
      guide([pd(2,-18,-72),pd(2,16,-72)],{span:910,travel:true,opacity:.42}),
      chip(pd(3,35,-78),{shape:'cut',w:10,h:10.556,delay:120,out:.70}),
      chip(pd(3,38,-78),{shape:'cut',w:10,h:10.556,delay:240,out:.83}),
      chip(pd(3,-5,-11),{w:3,h:18,delay:470,to:pd(3,-5,-6)}),
      chip(pd(2,9,-72),{w:24,h:4,delay:610,to:pd(2,16,-72)})
    ]},
    {name:'phrase-margins',start:4200,end:5300,items:[
      guide([pm(3,48,-18),pm(3,223,-18)],{delay:40,span:850,travel:true,opacity:.40}),
      guide([ps(0,-20,-36),ps(0,-26,-36),ps(0,-26,-8)],{delay:190,span:510,opacity:.58}),
      guide([pd(9,18,0),pd(9,26,0),pd(9,26,-13)],{delay:310,span:430,opacity:.58}),
      chip(pm(3,64,-18),{w:30,h:3,delay:280,to:pm(3,82,-18)}),
      chip(pd(9,22,-20),{shape:'box',w:7,h:7,delay:390,out:.84}),
      chip(ps(8,50,-12),{w:4,h:15,delay:540,to:ps(8,50,-7)})
    ]},
    {name:'collage-baseline-cuts',start:5300,end:6180,items:[
      guide([pc[0](2,4,2.4),pc[0](2,38,2.4)],{span:710,travel:true,opacity:.52}),
      guide([pc[1](0,4,-66),pc[1](0,60,-66)],{delay:70,span:650,opacity:.42}),
      guide([pc[0](3,4,2.4),pc[0](3,26,2.4),pc[0](3,26,1)],{delay:140,span:420,opacity:.38}),
      chip([1180,253],{w:34,h:4,delay:40,to:[1128,253]}),
      chip(pc[1](0,35,-64),{shape:'cut',w:10,h:10.556,delay:240,to:pc[1](0,38,-64)}),
      chip(pc[0](2,15,2.4),{shape:'box',w:8,h:8,delay:370,to:pc[0](2,25,2.4)})
    ]},
    {name:'collage-wordmark-frame',start:6180,end:6880,items:[
      guide([pc[1](0,-8,-4),pc[1](0,-8,9),pc[1](0,56,9)],{span:540,travel:true,opacity:.55}),
      guide([pc[1](3,3,-74),pc[1](3,43,-74),pc[1](3,43,-67)],{delay:100,span:470,opacity:.46}),
      guide([pc[1](4,-8,-52),pc[1](4,8,-68.889)],{delay:190,span:460,opacity:.32}),
      chip(pc[1](5,46,-3),{w:4,h:22,delay:80,to:pc[1](5,46,-9)}),
      chip(pc[1](0,19,9),{w:36,h:4,delay:250,to:pc[1](0,32,9)}),
      chip(pc[1](3,27,-74),{shape:'box',w:8,h:8,delay:350,out:.90})
    ]},
    {name:'collage-negative-bay',start:6880,end:7560,items:[
      guide([[80,332],[394,332],[430,370]],{span:540,travel:true,opacity:.44}),
      guide([pc[1](3,-5,3),pc[1](3,46,3)],{delay:90,span:440,opacity:.50}),
      guide([[116,352],[116,385],[222,385]],{delay:180,span:390,opacity:.54}),
      chip([302,332],{w:42,h:4,delay:100,to:[362,332]}),
      chip([72,370],{shape:'cut',w:11,h:11.611,delay:220,out:.85}),
      chip([96,370],{shape:'cut',w:11,h:11.611,delay:310}),
      chip(pc[0](0,38,-20),{shape:'box',w:8,h:8,delay:350,to:pc[0](0,42,-24.222)})
    ]},
    {name:'collage-band-stitches',start:7560,end:8150,items:[
      guide([[44,103],[218,103]],{span:440,travel:true,opacity:.60}),
      guide([[755,329],[1170,329]],{delay:70,span:460,travel:true,opacity:.50}),
      guide([pc[3](0,71,-43),pc[3](0,71,-16)],{delay:120,span:350,opacity:.32}),
      chip([920,329],{w:52,h:3,delay:110,to:[1016,329]}),
      chip([302,103],{w:7,h:7,delay:230,to:[336,103],out:.90}),
      chip([722,329],{shape:'box',w:7,h:7,delay:290})
    ]},
    {name:'collage-focus-brackets',start:8150,end:8600,items:[
      guide([pc[2](0,-9,-54),pc[2](0,-9,-70),pc[2](0,11,-70)],{span:150,opacity:.58}),
      guide([pc[2](9,49,-12),pc[2](9,49,7),pc[2](9,29,7)],{delay:25,span:150,opacity:.58}),
      guide([pc[2](0,3,13),pc[2](9,36,13)],{span:290,travel:true,opacity:.34}),
      chip(pc[2](0,-9,-49),{w:4,h:17,delay:35,to:pc[2](0,-9,-43)}),
      chip(pc[2](9,49,-18),{shape:'box',w:7,h:7,delay:90})
    ]}
  ];
  for (const [index,shot] of decorationShots.entries()) {
    const oldDuration = shot.end - shot.start;
    shot.start = detailCuts[index]; shot.end = detailCuts[index + 1];
    shot.focus = index === decorationShots.length - 1;
    const duration = shot.end - shot.start, ratio = duration / oldDuration;
    // Retain each decoration's geometry and relative timing, then nudge its
    // entrances and completed strokes onto the same small rhythmic subdivisions.
    for (const item of shot.items) {
      const originalEnd = (item.delay + (item.span || 0)) * ratio;
      item.delay = Math.min(duration - 2 * SUB_BEAT,snap(item.delay * ratio));
      item.drawEnd = Math.max(item.delay + SUB_BEAT,Math.min(duration - SUB_BEAT,snap(originalEnd)));
      item.leaveAt = Math.max(item.delay + SUB_BEAT,Math.min(duration - SUB_BEAT,snap(duration * (item.out || .97))));
    }
    shot.node = make('g',{'data-decoration-shot':shot.name,visibility:'hidden',
      'data-start-frame':Math.round(shot.start / FRAME),'data-end-frame':Math.round(shot.end / FRAME)},detailScene);
    if (shot.focus) attr(shot.node,'clip-path','url(#zo-collage-window)');
    for (const item of shot.items) {
      item.node = make('g',{'data-decoration-kind':item.kind,opacity:0},shot.node);
      if (item.kind === 'guide') {
        item.path = make('path',{pathLength:1,'stroke-dasharray':1,'stroke-dashoffset':1},item.node);
        if (item.travel) item.marker = make('rect',{width:5,height:5,fill:'currentColor',stroke:'none'},item.node);
      } else if (item.shape === 'cut') {
        make('path',{d:polygon([[-item.w/2,item.h/2],[item.w/2,-item.h/2],[item.w/2,item.h/2]]),fill:'currentColor',stroke:'none'},item.node);
      } else {
        make('rect',{x:-item.w/2,y:-item.h/2,width:item.w,height:item.h,
          fill:item.shape === 'box' ? 'none' : 'currentColor',stroke:item.shape === 'box' ? 'currentColor' : 'none'},item.node);
      }
    }
  }
  function decorationPoint(point) {
    if (Array.isArray(point)) return [point[0], point[1] * layout.height / 534];
    let x = point.word.cells[point.cell].x + point.x, y = point.y;
    const list = point.word.container.transform.baseVal;
    for (let i = list.numberOfItems - 1; i >= 0; i--) {
      const m = list.getItem(i).matrix, nextX = m.a*x + m.c*y + m.e;
      y = m.b*x + m.d*y + m.f; x = nextX;
    }
    return [x,y];
  }
  function alongGuide(points,progress) {
    const lengths = points.slice(1).map((p,i) => Math.hypot(p[0]-points[i][0],p[1]-points[i][1]));
    let remaining = lengths.reduce((sum,length) => sum + length,0) * progress;
    for (let i = 0; i < lengths.length; i++) {
      if (remaining <= lengths[i] || i === lengths.length - 1) {
        const p = lengths[i] > 0 ? clamp(remaining/lengths[i]) : 0;
        return [mix(points[i][0],points[i+1][0],p),mix(points[i][1],points[i+1][1],p)];
      }
      remaining -= lengths[i];
    }
    return points[0];
  }
  function drawDetails(t) {
    const current = decorationShots.find(shot => t >= shot.start && t < shot.end);
    visible(detailScene,!!current);
    if (!current) return;
    const local = t-current.start, duration = current.end-current.start;
    // The last set shares the name's narrowing crop and fades with that transition.
    attr(detailScene,'opacity',current.focus ? 1-phase(local,BEAT / 2,BEAT,move) : 1);
    for (const shot of decorationShots) visible(shot.node,shot === current);
    for (const item of current.items) {
      const enter = phase(local,item.delay,item.delay+SUB_BEAT,ease);
      const leave = 1-phase(local,item.leaveAt,duration,ease);
      attr(item.node,'opacity',item.opacity*enter*leave);
      if (item.kind === 'guide') {
        const points = item.points.map(decorationPoint);
        attr(item.path,'d','M'+points.map(p => p.map(v => v.toFixed(3)).join(' ')).join(' L'));
        const drawn = phase(local,item.delay,item.drawEnd,move);
        attr(item.path,'stroke-dashoffset',1-drawn);
        if (item.marker) {
          const travel = phase(local,item.delay,duration-SUB_BEAT,camera);
          const [x,y] = alongGuide(points,Math.min(drawn,travel));
          attr(item.marker,'x',x-2.5); attr(item.marker,'y',y-2.5);
        }
      } else {
        const from = decorationPoint(item.at), to = item.to ? decorationPoint(item.to) : from;
        const p = phase(local,item.delay,duration-SUB_BEAT,move);
        attr(item.node,'transform',transform(mix(from[0],to[0],p),mix(from[1],to[1],p)));
      }
    }
  }
  function palette(inverted) {
    const fg = inverted ? BLACK : BLUE, bg = inverted ? BLUE : BLACK;
    attr(background,'fill',bg);
    attr(ink,'color',fg);
    attr(frameArt,'color',fg);
    attr(frameArt,'fill',fg);
  }
  function slices(local, strength, seed) {
    const tick = Math.floor(local / SUB_BEAT + 1e-7);
    for (let i = 0; i < 3; i++) {
      const h = strength > 0 ? 4 + hash(seed + tick * 11 + i * 31) * 27 : 0;
      const y = 25 + hash(seed + tick * 7 + i * 57) * (layout.height - 70);
      const dx = (hash(seed + tick * 17 + i * 49) - .5) * 180 * strength;
      attr(holes[i],'y',y); attr(holes[i],'height',h);
      attr(sliceClips[i],'y',y); attr(sliceClips[i],'height',h);
      attr(sliceCopies[i],'transform',transform(dx,0));
      attr(sliceCopies[i],'opacity',1);
    }
  }
  // Opening 05's settled framing and scale, now fixed for each entire shot.
  // Only the glyph substitutions, small offsets and short glitch slices animate.
  const macroShots = [
    {cell:0, anchor:[35.421,-30], scale:6.6, at:[472,292], jitter:.44},
    {cell:0, anchor:[0,-18], scale:6.3, at:[598,166], jitter:.40},
    {cell:3, anchor:[7,-42], scale:5.85, at:[794,286], jitter:.42}
  ];
  function drawPhrase(t) {
    let shot = 0;
    while (shot < phraseCuts.length - 2 && t >= phraseCuts[shot + 1]) shot++;
    const local = t - phraseCuts[shot], duration = phraseCuts[shot + 1] - phraseCuts[shot];
    // Only the first glitch clock starts under the opening shutters. Shot cuts
    // and all later animation clocks keep their original absolute timing.
    const glitchLocal = shot === 0 ? Math.round((local+FIRST_SCRAMBLE_LEAD)/FRAME)*FRAME : local;
    palette(shot === 1);
    const p = phase(local,0,duration,camera);
    phraseWords.forEach((word,i) => {
      visible(word.container,shot === 3 || i === shot);
      if (shot !== 3 && i !== shot) return;
      if (shot < 3) {
        const view = macroShots[shot];
        const anchorX = word.cells[view.cell].x + view.anchor[0];
        const scale = view.scale * (layout.portrait ? layout.height / 534 : Math.min(2.1, layout.height / 534));
        const x = view.at[0] - anchorX * scale;
        // Keep the macro letter in the vertical centre instead of stranding it
        // at the top of a tall canvas. The original widescreen framing is intact.
        const y = layout.portrait ? layout.height / 2 + (shot === 1 ? 21 : 32) * scale :
          view.at[1] * layout.height / 534 - view.anchor[1] * scale;
        attr(word.container,'transform',transform(x,y,scale));
      }
      if (shot === 3) {
        const poses = [[80,148],[206,326],[80,506]];
        const scale = layout.original ? 2.3 : Math.min(1280 * (layout.portrait ? .86 : .83) / word.width, layout.height * .19 / 64);
        const x = layout.original ? poses[i][0] : [92, 170, 92][i];
        const y = layout.original ? poses[i][1] : layout.height * [ .28, .57, .86 ][i];
        attr(word.container,'transform',transform(x + 14 * (1 - p),y,scale));
      }
      scrambleWord(word,glitchLocal,shot === 3 ? BEAT / 2 : duration,100 + shot * 81 + i * 57,
        shot === 3 ? .24 : macroShots[shot].jitter);
    });
    const burst = glitchLocal < BEAT / 4 || (shot < 3 &&
      ((glitchLocal >= BEAT * .625 && glitchLocal < BEAT * .75) || (glitchLocal >= BEAT * 1.125 && glitchLocal < BEAT * 1.25)));
    slices(glitchLocal,burst ? (shot === 3 ? .24 : .65) : 0,shot * 31 + 9);
    return shot === 3 ? '02 · Make something different.' : '01 · 句子特写 · 乱码重组';
  }

  function rowCrop(index,y,height) {
    attr(rowWindows[index],'y',y);
    attr(rowWindows[index],'height',height);
  }
  function rowPose(index,x,y,scale,opacity = 1) {
    const row = collageRows[index];
    visible(row.container,true);
    attr(row.container,'transform',transform(x,y,scale));
    attr(row.container,'opacity',opacity);
    restoreWord(row);
  }
  function drawResponsiveCollage(shot, p, q) {
    const h = layout.height;
    const fit = (i, width = .88) => 1280 * width / collageRows[i].width;
    const large = Math.min(12, Math.max(5.6, h * .44 / 64));
    if (shot === 0) {
      rowPose(0,mix(-150,-240,p),h*.44,large);
      rowPose(1,mix(-90,18,p),h*1.08,large*.8);
      rowPose(2,-360+40*p,h*.10,fit(2,.9),.17);
      rowCrop(0,0,h*.48); rowCrop(1,h*.48,h*.52);
    } else if (shot === 1) {
      rowPose(0,mix(-320,-390,p),h*.24,large,.08);
      rowPose(1,mix(100,68,p),h*.62,fit(1,.88));
      rowPose(2,74,h*.095,fit(2,.44),.36);
      rowPose(5,900,h*.91,fit(5,.23),.24);
    } else if (shot === 2) {
      rowPose(1,mix(-120,-225,p),h*.49,large);
      rowPose(0,mix(630,540,p),h*1.09,large*.94);
      rowPose(5,38,h*.95,fit(5,.44),.38);
      rowCrop(1,0,h*.52); rowCrop(0,h*.52,h*.48);
    } else if (shot === 3) {
      const scale = Math.min(10,Math.max(fit(2,1.65),h*.29/64));
      rowPose(2,mix(-360,-290,p),h*.22,scale);
      rowPose(3,mix(55,-51,p),h*.59,scale*.9);
      rowPose(4,1450-collageRows[4].width*scale-70*p,h*1.06,scale);
      rowCrop(2,0,h*.26); rowCrop(3,h*.26,h*.37); rowCrop(4,h*.63,h*.37);
    } else {
      const scale = fit(2);
      rowPose(2,640-collageRows[2].width*scale/2,h/2+32*scale,scale);
      rowPose(3,640-collageRows[3].width*fit(3,1.2)/2,h*.12,fit(3,1.2),.22);
      rowPose(4,640-collageRows[4].width*fit(4,1.2)/2,h*.96,fit(4,1.2),.22);
      const width = 1280 * (1-phase(q,BEAT/2,BEAT,move));
      attr(collageWindow,'x',(1280-width)/2); attr(collageWindow,'width',width);
    }
  }

  function drawCollage(t) {
    const local = Math.round((t - PHRASE_END) / FRAME) * FRAME;
    let shot = 0;
    while (shot < collageCuts.length - 2 && local >= collageCuts[shot + 1]) shot++;
    const a = collageCuts[shot], b = collageCuts[shot + 1], q = local - a;
    const p = phase(local,a,b,camera);
    collageRows.forEach(row => visible(row.container,false));
    rowWindows.forEach((node,i) => rowCrop(i,0,layout.height));
    attr(collageWindow,'x',0); attr(collageWindow,'width',1280);
    palette(shot === 0 || shot === 2);
    if (!layout.original) {
      drawResponsiveCollage(shot, p, q);
    } else if (shot === 0) {
      // Restore Opening 05's layout outside the selected 6.18–6.88 s shot.
      rowPose(0,mix(-184,-265,p),234,7.0);
      rowPose(1,mix(-72,26,p),619,5.6);
      rowPose(2,-760 + 40 * p,60,2.4,.17);
      rowCrop(0,0,252); rowCrop(1,252,282);
    } else if (shot === 1) {
      // Only this screenshot-selected shot keeps Opening 06's new hierarchy.
      rowPose(0,mix(-560,-600,p),100,7.6,.08);
      rowPose(1,mix(190,146,p),374,3.05);
      rowPose(2,74,80,.68,.36);
      rowPose(5,890,476,.46,.24);
    } else if (shot === 2) {
      rowPose(1,mix(-124,-238,p),271,7.0);
      rowPose(0,mix(715,638,p),615,6.6);
      rowPose(5,38,511,1.5,.38);
      rowCrop(1,0,277); rowCrop(0,277,257);
    } else if (shot === 3) {
      rowPose(2,mix(-710,-606,p),93,4.0);
      rowPose(3,mix(55,-51,p),318,3.3);
      // Retain the old lower band's bounds while reading the English upright.
      rowPose(4,mix(1570,1500,p) - collageRows[4].width * 3.9,340 + 64 * 3.9,3.9);
      rowCrop(2,0,116); rowCrop(3,116,218); rowCrop(4,334,200);
      if (q < BEAT / 4) {
        collageRows[3].cells.forEach((cell,i) => {
          const source = collageRows[3].cells[(i + Math.floor(q / SUB_BEAT + 1e-7) + 3) % collageRows[3].cells.length];
          attr(cell.node,'href',glyphId(source.letter));
        });
      }
    } else {
      // The collage contracts into a narrow central cut, then the original
      // zero-length seed stroke starts on its own clock at LOGO_START.
      const scale = 1.95;
      rowPose(2,640 - collageRows[2].width * scale / 2,321,scale);
      rowPose(3,640 - collageRows[3].width * 2.65 / 2,77,2.65,.22);
      rowPose(4,640 - collageRows[4].width * 2.65 / 2,654,2.65,.22);
      const close = phase(q,BEAT / 2,BEAT,move);
      const w = mix(1280,0,close);
      attr(collageWindow,'x',(1280 - w) / 2);
      attr(collageWindow,'width',w);
    }
    const burst = shot < 4 && (q < BEAT / 4 || (q >= BEAT / 2 && q < BEAT * .625));
    slices(q,burst ? .70 : 0,shot * 121 + 40);
    return '03 · Zhao WenHao · 字母拼贴';
  }

  // Keep the approved logo and slogan. Show the final name fully on its first frame.
  const logoScene = $('[data-logo-scene]'), nameScene = $('[data-name-scene]');
  const sloganLines = all('[data-slogan-line]');
  const nameLayout = $('[data-name-layout]');
  const words = Object.fromEntries(all('[data-word]').map(node => [node.dataset.word,node]));
  const clips = Object.fromEntries(all('[data-reveal]').map(node => [node.dataset.reveal,node]));
  function measureClosing() {
    const logoWidth = 2 * (72 + 18 + 2 * Math.hypot(18,19) / 19 + 3) * .98;
    const logoTop = 180 - 95 * .98, logoBottom = 180 + 94 * .98;
    const sloganWidths = sloganLines.map(node => chunkSizes[node.querySelector('[data-glyph-content]').dataset.glyphContent]);
    const longestSlogan = Math.max(...sloganWidths);
    const sloganScale = Math.min(.82,(592 - logoWidth - 36) / longestSlogan);
    const firstBaseline = logoTop + 64 * sloganScale, lastBaseline = logoBottom;
    const lineBaselines = [firstBaseline,(firstBaseline + lastBaseline) / 2,lastBaseline];
    const lockupWidth = logoWidth + 36 + longestSlogan * sloganScale;
    const lockupLeft = (640 - lockupWidth) / 2, sizes = chunkSizes;
    const fullPositions = {Z:0};
    fullPositions.hao = sizes.Z + tracking;
    fullPositions.W = fullPositions.hao + sizes.hao + wordSpace;
    fullPositions.en = fullPositions.W + sizes.W + tracking;
    fullPositions.H = fullPositions.en + sizes.en + tracking;
    fullPositions.ao = fullPositions.H + sizes.H + tracking;
    const textWidth = fullPositions.ao + sizes.ao;
    return {
      logoX:lockupLeft + logoWidth / 2, sloganX:lockupLeft + logoWidth + 36,
      sloganScale,lineBaselines,sizes,fullPositions,textWidth,
      nameScale:Math.min(1,520 / textWidth),baseline:32
    };
  }
  let measured = measureClosing();
  const lockupNodes = node => ({node,logo:node.querySelector('[data-logo]'),
    placement:node.querySelector('[data-logo-placement]'),slogan:node.querySelector('[data-slogan]'),
    lines:[...node.querySelectorAll('[data-slogan-line]')]});
  const primaryLockup = lockupNodes(logoScene);
  const rgbMotion = make('g',{'data-rgb-motion':'',visibility:'hidden',style:'isolation:isolate'},closingScene);
  closingScene.insertBefore(rgbMotion,nameScene);
  // Each channel samples an earlier shape, like the approved outline trails.
  // The current placement is shared, so the two Z strokes trail in opposite
  // diagonal directions rather than translating the entire letter sideways.
  const historyChannels = [
    {name:'r',lag:65,color:'#AC0000'},
    {name:'g',lag:32.5,color:'#00DB00'},
    {name:'b',lag:0,color:'#0000FB'}
  ].map(config => {
    const node = logoScene.cloneNode(true), targets = lockupNodes(node);
    for (const item of [node,...node.querySelectorAll('*')]) {
      for (const key of [...item.attributes].map(a => a.name)) {
        if (key.startsWith('data-')) item.removeAttribute(key);
      }
    }
    attr(node,'data-rgb-history',config.name);
    attr(node,'color',config.color); attr(node,'fill',config.color);
    attr(node,'style','mix-blend-mode:screen');
    rgbMotion.appendChild(node);
    return {...config,...targets};
  });
  function lockupAt(t) {
    const g = geometry(t), p = phase(t,timing.pullStart,timing.logoSettled,strike);
    const placedX = mix(320,measured.logoX,p), placedScale = mix(1,.98 / 1.18,p);
    const sloganX = Math.max(measured.sloganX,placedX + g.right*placedScale + 36);
    return {path:g.path,logoPose:g.transform,
      placement:'translate(' + placedX + ' 180) scale(' + placedScale + ')',
      sloganPose:transform(sloganX,0),sloganOpacity:t >= timing.sloganStart ? 1 : 0,
      lines:measured.lineBaselines.map((baseline,i) => {
        const start = timing.sloganStart + i * timing.sloganStagger;
        const entry = phase(t,start,start + timing.sloganDuration,typeIn);
        return {opacity:phase(t,start,start + SUB_BEAT),
          pose:transform(10 * (1 - entry),baseline + 16 * (1 - entry),measured.sloganScale * mix(.92,1,entry))};
      })};
  }
  function paintLockup(target,state) {
    attr(target.logo,'d',state.path); attr(target.logo,'transform',state.logoPose);
    attr(target.placement,'transform',state.placement);
    attr(target.slogan,'opacity',state.sloganOpacity); attr(target.slogan,'transform',state.sloganPose);
    target.lines.forEach((node,i) => {
      attr(node,'opacity',state.lines[i].opacity); attr(node,'transform',state.lines[i].pose);
    });
  }
  function closingShake(t) {
    if (t <= timing.shakeStart || reduced.matches) return [0,0];
    const elapsed = t - timing.shakeStart;
    const sample = elapsed / 160, index = Math.floor(sample), blend = ease(sample - index);
    const strength = phase(elapsed,0,180,ease);
    const x = (mix(hash(index + 411),hash(index + 412),blend) - .5) * 1.536 * strength;
    const y = (mix(hash(index + 971),hash(index + 972),blend) - .5) * .96 * strength;
    return [x,y];
  }
  function motionRgb(t,current) {
    const moving = t > timing.pullStart && t < timing.logoSettled && !reduced.matches;
    visible(rgbMotion,moving);
    if (!moving) return false;
    const strength = phase(t,timing.pullStart,timing.pullStart + SUB_BEAT,ease) *
      (1 - phase(t,timing.logoSettled - BEAT / 4,timing.logoSettled,ease));
    historyChannels.forEach(channel => {
      const sampledAt = Math.max(timing.barEnd,t - channel.lag * strength);
      const textAt = Math.max(timing.barEnd,t - channel.lag * .30 * strength);
      const shape = lockupAt(sampledAt), text = lockupAt(textAt);
      // Match the original geometric trails: sample the Z shape, keep the
      // current placement. Shorter text history keeps words readable while
      // following their actual previous position and scale in the same direction.
      const state = {...text,path:shape.path,logoPose:shape.logoPose,placement:current.placement};
      paintLockup(channel,state);
      attr(channel.node,'data-sample-time',sampledAt);
      attr(channel.node,'data-text-sample-time',textAt);
    });
    return true;
  }
  function drawClosing(t) {
    // Invert the complete Z/slogan lockup, then cut directly to the dark name card.
    palette(t >= timing.logoInvert && t < timing.cut);
    const [shakeX,shakeY] = closingShake(t);
    const view = closingView(t >= timing.cut);
    attr(closingScene,'transform',transform(view.x + shakeX,view.y + shakeY,view.scale));
    slices(0,0,0);
    const current = lockupAt(t);
    paintLockup(primaryLockup,current);
    const rgbActive = motionRgb(t,current);
    visible(logoScene,t < timing.cut && !rgbActive);
    visible(nameScene,t >= timing.cut);
    attr(nameLayout,'transform',transform(320 - measured.textWidth * measured.nameScale / 2,
      180 + measured.baseline * measured.nameScale,measured.nameScale));
    for (const [key,node] of Object.entries(words)) {
      attr(node,'transform',transform(measured.fullPositions[key],0));
      attr(node,'opacity',1);
    }
    for (const [key,node] of Object.entries(clips)) {
      attr(node,'width',measured.sizes[key]);
    }
    return t < timing.pullStart ? '04 · 中央细线 · 横向生长' :
      t < timing.logoSettled ? '05 · Z 展开 · 标语同步入场' :
      t < timing.logoInvert ? '06 · Forge The Extraordinary' :
      t < timing.cut ? '07 · Z＋标语 · 蓝底黑字' : '08 · Zhao WenHao · 黑底蓝字';
  }
  // The exit starts at the exact frozen wordmark Z, with no recentering or zoom.
  // Reuse the loader's contours, retract curve and perpendicular shutter motion.
  let outroScale = 1, outroOrigin = [0,0], outroTravel = 0;
  const outroPoint = (along,across) => [
    outroOrigin[0]+loadTangent[0]*along+loadNormal[0]*across,
    outroOrigin[1]+loadTangent[1]*along+loadNormal[1]*across
  ];
  const outroGates = [-1,1].map(side => {
    const node = make('g',{'data-outro-gate':side},outroGateLayer);
    const body = make('path',{fill:BLACK,d:polygon([outroPoint(2200,-side*.5),outroPoint(-2200,-side*.5),
      outroPoint(-2200,side*2200),outroPoint(2200,side*2200)])},node);
    const edge = make('path',{d:polygon([outroPoint(2200,0),outroPoint(-2200,0),
      outroPoint(-2200,side*2*outroScale),outroPoint(2200,side*2*outroScale)])},node);
    return {node,body,edge,side};
  });
  attr(outroMark,'transform',transform(outroOrigin[0],outroOrigin[1],outroScale));
  function drawOutro(f) {
    const local = (f-OUTRO_START_FRAME)/OUTRO_TIME_SCALE;
    const collapse = phase(local,0,16,loadRetract);
    const stretch = phase(local,12,22,loadRetract);
    const opening = phase(f,OUTRO_REVEAL_FRAME,OUTRO_END_FRAME,loadOpen);
    const revealing = f >= OUTRO_REVEAL_FRAME;
    const reach = (layout.original ? 1400 : Math.max(1280,layout.height)*2)/outroScale;
    attr(outroScene,'data-step',revealing ? 'reveal' : local < 16 ? 'retract' : 'extend');
    attr(outroScene,'data-open',opening.toFixed(6));
    attr(outroMark,'d',local === 0 ? geometry(timing.logoSettled).path :
      loadBarPath(true,collapse)+' '+loadBarPath(false,collapse)+' '+
      loadBand(mix(-95,-reach,stretch),mix(94,reach,stretch)));
    visible(outroMark,!revealing);
    visible(nextContent,revealing);
    visible(outroGateLayer,revealing && f < OUTRO_END_FRAME);
    outroGates.forEach(gate => {
      const distance = gate.side*outroTravel*opening;
      attr(gate.node,'transform','translate('+loadNormal[0]*distance+' '+loadNormal[1]*distance+')');
    });
    for (const [key,node] of Object.entries(words))
      attr(node,'opacity',key === 'Z' ? 0 : 1-phase(local,0,12,loadRetract));
    if (f >= OUTRO_END_FRAME) return '11 · 转场完成';
    return revealing ? '10 · Z 斜切转场' : '09 · 姓名 Z 回缩';
  }
  function paint(t) {
    const elapsed = Math.max(0,Math.min(DURATION,t));
    const musicFrame = Math.min(TOTAL_FRAMES,Math.floor(elapsed/FRAME + 1e-7));
    // Hold the exact final picture, including its camera offset, after 18 seconds.
    const frameNumber = Math.min(MOTION_FRAMES,musicFrame);
    t = frameNumber * FRAME;
    const openingFrame = frameNumber - LOADING_FRAMES, openingTime = openingFrame * FRAME;
    const loading = openingFrame < 0;
    const revealing = loading && frameNumber >= LOAD_REVEAL_FRAME;
    const exiting = musicFrame >= OUTRO_START_FRAME;
    visible(outroScene,exiting);
    visible(picture,musicFrame < OUTRO_REVEAL_FRAME);
    if (loading || openingTime < LOGO_START) visible(rgbMotion,false);
    visible(loadingScene,loading);
    visible(phraseScene,revealing || (!loading && openingTime < PHRASE_END));
    visible(collageScene,!loading && openingTime >= PHRASE_END && openingTime < LOGO_START);
    visible(closingScene,!loading && openingTime >= LOGO_START);
    let label;
    if (loading) {
      // Negative pre-roll plus FIRST_SCRAMBLE_LEAD is continuous across frame 160.
      if (revealing) { drawPhrase(openingTime); drawDetails(0); }
      else { palette(false); slices(0,0,0); visible(detailScene,false); }
      label = drawLoading(t);
    } else {
      label = openingTime < PHRASE_END ? drawPhrase(openingTime) :
        openingTime < LOGO_START ? drawCollage(openingTime) : drawClosing((openingFrame - LOGO_START_FRAME) * FRAME);
      drawDetails(openingTime);
    }
    if (elapsed >= MOTION_DURATION) label = '08 · Zhao WenHao · 尾帧定格';
    if (exiting) label = drawOutro(musicFrame);
    root.dataset.frame = String(musicFrame);
    root.dataset.phase = label;
  }

  function closingView(name) {
    if (layout.original) return { x:256, y:51, scale:1.2 };
    let scale, centerY;
    if (name) {
      scale = mix(1.2,1280*.84/(measured.textWidth*measured.nameScale),layout.blend);
      scale = Math.min(scale,layout.height*.58/125);
      centerY = 180;
    } else {
      // Preserve the original horizontal lockup; fit the entire group uniformly.
      scale = Math.min(mix(1.2,1.72,layout.blend),layout.height*.65/240);
      centerY = 180;
    }
    return { x:640-320*scale, y:layout.height/2-centerY*scale, scale };
  }
  function resize(width, height) {
    if (!(width > 0 && height > 0)) return;
    layout.height = 1280 * height / width;
    layout.original = Math.abs(layout.height-534) < .5;
    layout.portrait = height/width > .95;
    layout.blend = clamp(Math.abs(layout.height-534)/400);
    attr(stage,'viewBox',`0 0 1280 ${layout.height}`);
    attr(background,'height',layout.height);
    attr($('#zo-intact'),'height',layout.height);
    attr($('#zo-intact > rect'),'height',layout.height);
    attr(collageWindow,'height',layout.height);
    measured = measureClosing();
    LOAD_MARK_SCALE = .94 * Math.min(1.8,layout.height/534);
    attr(loadingMark,'transform',transform(640,layout.height/2,LOAD_MARK_SCALE));
    const corners = [[0,0],[1280,0],[0,layout.height],[1280,layout.height]];
    const extent = layout.original ? 2200 : Math.max(1280,layout.height)*3;
    loadTravel = layout.original ? 730 : 16 + Math.max(...corners.map(([x,y])=>Math.abs((x-640)*loadNormal[0]+(y-layout.height/2)*loadNormal[1])));
    loadReach = layout.original ? 730 : extent/LOAD_MARK_SCALE;
    const view = closingView(true);
    const shake = closingShake((MOTION_FRAMES-LOADING_FRAMES-LOGO_START_FRAME)*FRAME);
    outroScale = view.scale*measured.nameScale*wordmarkZScale;
    outroOrigin = [view.x+shake[0]+view.scale*(320-measured.textWidth*measured.nameScale/2+measured.nameScale*wordmarkZWidth/2),
      view.y+shake[1]+view.scale*(180+measured.nameScale*(measured.baseline-94*wordmarkZScale))];
    outroTravel = 16+Math.max(...corners.map(([x,y])=>Math.abs((x-outroOrigin[0])*loadNormal[0]+(y-outroOrigin[1])*loadNormal[1])));
    attr(outroMark,'transform',transform(outroOrigin[0],outroOrigin[1],outroScale));
    for (const [gates,point,markScale] of [[loadGates,gatePoint,LOAD_MARK_SCALE],[outroGates,outroPoint,outroScale]]) {
      gates.forEach(gate=>{
        const side=gate.side;
        attr(gate.body,'d',polygon([point(extent,-side*.5),point(-extent,-side*.5),point(-extent,side*extent),point(extent,side*extent)]));
        attr(gate.edge,'d',polygon([point(extent,0),point(-extent,0),point(-extent,side*2*markScale),point(extent,side*2*markScale)]));
      });
    }
    lastFrame = -1;
    render(lastTime);
  }
  function render(milliseconds) {
    lastTime = Math.max(0,Math.min(DURATION,milliseconds));
    const frame = Math.floor(lastTime/FRAME+1e-7);
    if (frame === lastFrame) return;
    lastFrame = frame;
    if (reduced.matches && frame > 0) {
      // Preserve the soundtrack clock while replacing motion with the final wordmark.
      paint(MOTION_DURATION);
      visible(outroScene,false);
      visible(picture,frame < OUTRO_END_FRAME);
      root.dataset.frame = String(frame);
    } else paint(lastTime);
  }
  resize(root.clientWidth,root.clientHeight);
  return { render, resize, setReducedMotion(value) { reduced.matches=value; lastFrame=-1; resize(root.clientWidth,root.clientHeight); } };
}
