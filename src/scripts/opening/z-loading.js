// Shared by the opening film and the full-page transition. Keep the optical Z corrections.
export function createZLoadingGeometry() {
  const clamp = value => Math.max(0, Math.min(1, value));
  const mix = (a, b, p) => a + (b - a) * p;
  const polygon = points => 'M' + points.map(point => point.map(v => v.toFixed(3)).join(',')).join(' L') + ' Z';
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
  const ease = bezier(.22, 0, .28, 1);
  const phase = (t, a, b, curve = ease) => curve(clamp((t - a) / (b - a)));
  const slope = 18 / 19, width = 2 * Math.hypot(18, 19) / 19, edge = 72 + 18 + width + 3;
  const cut = y => -slope * y;
  const band = (a, b) => polygon([[cut(a) - width, a], [cut(a) + width, a],
    [cut(b) + width, b], [cut(b) - width, b]]);
  function bar(top, collapse) {
    const a = top ? -95 : 57, b = top ? -57 : 94;
    return top ? polygon([[mix(-edge, cut(a) - width, collapse), a], [cut(a) + width, a],
      [cut(b) + width, b], [mix(-edge, cut(b) - width, collapse), b]]) :
      polygon([[cut(a) - width, a], [mix(edge, cut(a) + width, collapse), a],
        [mix(edge, cut(b) + width, collapse), b], [cut(b) - width, b]]);
  }
  const windup = bezier(.42, 0, .65, 1), turn = bezier(.42, 0, .58, 1);
  const settle = bezier(.30, 0, .48, 1);
  function angle(frame) {
    if (frame < 66) return mix(0, -5.5, phase(frame, 60, 66, windup));
    if (frame < 82) return mix(-5.5, 184.5, phase(frame, 66, 82, turn));
    return mix(184.5, 180, phase(frame, 82, 90, settle));
  }
  const normal = [1 / Math.hypot(1, slope), slope / Math.hypot(1, slope)];
  return { mix, polygon, phase, cut, band, bar, angle, normal, tangent:[normal[1], -normal[0]],
    drain:bezier(.30, .12, .55, 1), retract:bezier(.62, 0, .18, 1), open:bezier(.64, 0, .20, 1) };
}
