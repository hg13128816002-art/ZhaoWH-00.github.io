// A composed polyline: unequal runs, short plateaus and asymmetric changes in direction.
const steps = [1.12, .84, 1.26, .8, 1.04, .92, 1.18, .84, 1.12, .8, 1.08];
const levels = [.36, .10, .10, -.52, -.34, -.02, .28, .28, .08, -.16, -.16, -.32];

export function createTimelineAnchors(count, width) {
  if (!count) return {cardWidth:0, points:[]};
  const positions = [0];
  for (let i = 1; i < count; i++) positions.push(positions[i-1] + steps[(i-1) % steps.length]);
  const total = positions.at(-1) || 1;
  const fractions = positions.map(x => x / total);
  const sameRowGap = count > 2 ? Math.min(...fractions.slice(2).map((x, i) => x-fractions[i])) : 1;
  const gap = Math.min(26, Math.max(14, width*.016)), inset = 8;
  // Fit cards against their nearest neighbour in the same row, despite unequal spacing.
  const cardWidth = Math.floor(Math.min(260, (sameRowGap*(width-2*inset)-gap)/(1+sameRowGap)));
  const pad = cardWidth/2+inset, span = width-2*pad;
  return {cardWidth, points:fractions.map((x, i) => ({
    x:count === 1 ? width/2 : pad+x*span,
    level:levels[i % levels.length],
  }))};
}

export function isSectionNearViewport(rect, viewportHeight, lead = 1.15, tail = .45) {
  return rect.top <= viewportHeight*lead && rect.bottom >= -viewportHeight*tail;
}

export function getTimelineScrollProgress(top, height, viewportHeight, axisOffset) {
  const start = viewportHeight-axisOffset;
  const end = (viewportHeight-height)/2;
  return Math.min(1, Math.max(0, (start-top)/Math.max(1, start-end)));
}
