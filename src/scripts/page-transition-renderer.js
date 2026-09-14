// A small SVG renderer: two shutters, three Z strokes and two clipped sand fills.
export function createPageTransitionRenderer(root, geometry) {
  const { mix, polygon, phase, cut, band, bar, angle, normal, tangent, drain, retract, open } = geometry;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = root.querySelector('svg');
  const attr = (node, key, value) => {
    const text = String(value);
    if (node.getAttribute(key) !== text) node.setAttribute(key, text);
  };
  function make(tag, attributes, parent) {
    const node = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attributes)) attr(node, key, value);
    parent.appendChild(node);
    return node;
  }
  const defs = make('defs', {}, svg);
  const gates = [-1, 1].map(side => {
    const group = make('g', {'data-z-shutter':side}, svg);
    return { side, group, body:make('path', {fill:'#040A10'}, group), edge:make('path', {fill:'#ACDBFB'}, group) };
  });
  const mark = make('g', {'data-z-mark':'', fill:'#ACDBFB', color:'#ACDBFB'}, svg);
  const rotor = make('g', {'data-z-rotor':''}, mark);
  const bars = [true, false].map((top, i) => {
    const clip = make('clipPath', {id:'page-z-sand-'+i, clipPathUnits:'userSpaceOnUse'}, defs);
    const window = make('rect', {x:-110, y:-100, width:220, height:0}, clip);
    return { top, window, body:make('path', {}, rotor),
      sand:make('path', {'clip-path':'url(#page-z-sand-'+i+')'}, rotor) };
  });
  const diagonal = make('path', {}, rotor);
  const solidBars = [bar(true, 0), bar(false, 0)], solidDiagonal = band(-95, 94);
  const stream = make('path', {d:`M${cut(-55)} -55 L${cut(55)} 55`, fill:'none', stroke:'currentColor',
    'stroke-width':4, 'stroke-dasharray':'7 17'}, rotor);
  let height = 534, scale = .46, reach = 2200, travel = 730;
  let last = {mode:'loading', elapsed:0, boundary:0, reduced:false};
  const point = (along, across) => [640 + tangent[0]*along + normal[0]*across,
    height/2 + tangent[1]*along + normal[1]*across];

  function draw(mode, elapsed, boundary = 0, reduced = false) {
    last = {mode, elapsed, boundary, reduced};
    const frame = Math.max(0, elapsed) * 60 / 1000;
    let rotation = 0, hourglass = 0, topFill = 1, second = false, flow = 0;
    let collapse = 0, stretch = 0, opening = 0, showMark = true, showEdges = false;
    if (!reduced && mode === 'loading') {
      const half = Math.floor(frame / 54), local = frame % 54;
      second = half % 2 === 1;
      flow = phase(local, 0, 30, drain);
      topFill = second ? flow : 1-flow;
      rotation = (half % 2)*180 + angle(36+local);
      hourglass = phase(frame, 0, 8);
    } else if (!reduced && mode === 'opening') {
      const half = Math.round(boundary / 900);
      rotation = (half % 2)*180;
      second = half % 2 === 1;
      topFill = second ? 0 : 1;
      hourglass = 1-phase(frame, 0, 8);
    }
    if (!reduced && mode === 'closing') {
      // Close, visibly shorten, hold the single stroke, then grow both horizontal bars.
      opening = 1-phase(frame, 0, 18, open);
      stretch = 1-phase(frame, 18, 34);
      collapse = 1-phase(frame, 39, 52, retract);
      showMark = frame >= 18;
      showEdges = frame < 18;
    } else if (!reduced && mode === 'opening') {
      const f = Math.max(0, frame-8);
      collapse = phase(f, 0, 16, retract);
      stretch = phase(f, 12, 22, retract);
      opening = phase(f, 20, 39, open);
      showMark = f < 20;
      showEdges = f >= 20;
    }
    attr(mark, 'visibility', showMark ? 'visible' : 'hidden');
    attr(rotor, 'transform', `rotate(${rotation})`);
    for (const part of bars) {
      const d = collapse === 0 ? solidBars[part.top ? 0 : 1] : bar(part.top, collapse);
      const y = part.top ? -95 : 57, size = part.top ? 38 : 37;
      const amount = part.top ? topFill : 1-topFill;
      attr(part.window, 'y', second ? y : y+size*(1-amount));
      attr(part.window, 'height', size*amount);
      attr(part.body, 'd', d); attr(part.sand, 'd', d);
      attr(part.body, 'opacity', 1-.82*hourglass); attr(part.sand, 'opacity', hourglass);
    }
    attr(diagonal, 'd', stretch === 0 ? solidDiagonal : band(mix(-95, -reach, stretch), mix(94, reach, stretch)));
    attr(diagonal, 'opacity', 1-.66*hourglass);
    attr(stream, 'opacity', mode === 'loading' && flow > 0 && flow < 1 ? hourglass*.92 : 0);
    attr(stream, 'stroke-dashoffset', (second ? 1 : -1)*frame*4.2);
    for (const gate of gates) {
      const distance = gate.side*travel*opening;
      attr(gate.group, 'transform', `translate(${normal[0]*distance} ${normal[1]*distance})`);
      attr(gate.edge, 'visibility', showEdges ? 'visible' : 'hidden');
    }
    root.dataset.transitionFrame = String(Math.floor(frame));
    root.dataset.transitionStep = mode === 'closing' ? (frame < 18 ? 'close' : frame < 34 ? 'shorten' : frame < 39 ? 'hold-stroke' : 'form-z') :
      mode === 'loading' ? 'hourglass' : opening > 0 ? 'reveal' : collapse > 0 ? 'extend' : 'settle';
  }
  function resize(width, pixelsHigh) {
    if (!(width > 0 && pixelsHigh > 0)) return;
    height = 1280*pixelsHigh/width;
    scale = .46*Math.min(1.8, height/534);
    const extent = Math.max(1280, height)*3;
    // Start contraction just beyond the visible diagonal, not several screens away.
    reach = (Math.min(height/2, 640/Math.abs(cut(1)))+12)/scale;
    const corners = [[0,0], [1280,0], [0,height], [1280,height]];
    travel = 16+Math.max(...corners.map(([x,y]) => Math.abs((x-640)*normal[0]+(y-height/2)*normal[1])));
    attr(svg, 'viewBox', `0 0 1280 ${height}`);
    attr(mark, 'transform', `translate(640 ${height/2}) scale(${scale})`);
    for (const gate of gates) {
      const side = gate.side;
      attr(gate.body, 'd', polygon([point(extent,-side*.5), point(-extent,-side*.5),
        point(-extent,side*extent), point(extent,side*extent)]));
      attr(gate.edge, 'd', polygon([point(extent,0), point(-extent,0),
        point(-extent,side*2*scale), point(extent,side*2*scale)]));
    }
    draw(last.mode, last.elapsed, last.boundary, last.reduced);
  }
  return {draw, resize};
}
