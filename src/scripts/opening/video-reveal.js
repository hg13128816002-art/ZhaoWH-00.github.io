import { createZLoadingGeometry } from './z-loading.js';

// Cue on the supplied 60 fps films: the final diagonal starts opening at frame 586.
export const VIDEO_REVEAL_START = 586 / 60;
export const VIDEO_DURATION = 616 / 60;

export function createVideoReveal(root) {
  const { normal, tangent, open } = createZLoadingGeometry();
  let width = 1, height = 1, origin = [0, 0], travel = 1, extent = 1;
  function resize(w, h) {
    width = Math.max(1, w); height = Math.max(1, h);
    const fit = Math.min(width / 2560, height / 1068);
    origin = [(width - 2560 * fit) / 2 + 728.4 * fit, height / 2];
    const corners = [[0,0], [width,0], [0,height], [width,height]];
    travel = 32 * fit + Math.max(...corners.map(([x,y]) =>
      Math.abs((x-origin[0])*normal[0] + (y-origin[1])*normal[1])));
    extent = Math.hypot(width, height) * 3;
  }
  function render(seconds) {
    if (seconds < VIDEO_REVEAL_START) return false;
    const progress = open(Math.min(1, (seconds-VIDEO_REVEAL_START) / (VIDEO_DURATION-VIDEO_REVEAL_START)));
    const gap = travel * progress;
    const point = (along, across) => [origin[0]+tangent[0]*along+normal[0]*across,
      origin[1]+tangent[1]*along+normal[1]*across];
    const hole = [[extent,-gap],[-extent,-gap],[-extent,gap],[extent,gap]]
      .map(([along,across]) => point(along,across).map(n => n.toFixed(2)).join(' ')).join(' L');
    // Native MP4 has no alpha: open a window through its final diagonal to the live canvas.
    root.style.clipPath = `path(evenodd, "M0 0H${width}V${height}H0Z M${hole}Z")`;
    return true;
  }
  return { resize, render };
}
