/** Ground-glass surfaces are prepared once, never drawing a clear frame to the gallery. */
const surfaces = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
let grain: HTMLCanvasElement | undefined;
function glassGrain() {
  if (grain) return grain;
  grain = document.createElement('canvas');
  grain.width = grain.height = 160;
  const ctx = grain.getContext('2d')!;
  const pixels = ctx.createImageData(160, 160);
  let seed = 2;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const value = seed >>> 24;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
    pixels.data[i + 3] = 18;
  }
  ctx.putImageData(pixels, 0, 0);
  return grain;
}

export function drawClassifiedMedia(
  ctx: CanvasRenderingContext2D, image: HTMLImageElement | undefined,
  x: number, y: number, width: number, height: number,
) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
  ctx.fillStyle = '#a4b1b6'; ctx.fillRect(x, y, width, height);
  if (image?.complete && image.naturalWidth > 0) {
    let surface = surfaces.get(image);
    if (!surface) {
      surface = document.createElement('canvas');
      const ratio = image.naturalWidth / image.naturalHeight;
      surface.width = ratio >= 1 ? 480 : Math.round(480 * ratio);
      surface.height = ratio >= 1 ? Math.round(480 / ratio) : 480;
      const paint = surface.getContext('2d')!;
      paint.filter = 'blur(22px) saturate(1.12) brightness(1.08)';
      // Overscan seals the glass edge without a transparent blur halo.
      paint.drawImage(image, -48, -48, surface.width + 96, surface.height + 96);
      surfaces.set(image, surface);
    }
    const scale = Math.max(width / surface.width, height / surface.height);
    const sw = width / scale, sh = height / scale;
    ctx.drawImage(surface, (surface.width - sw) / 2, (surface.height - sh) / 2, sw, sh, x, y, width, height);
  }
  const light = ctx.createLinearGradient(x, y, x + width, y + height);
  light.addColorStop(0, 'rgba(255,255,255,.30)');
  light.addColorStop(.38, 'rgba(245,250,251,.08)');
  light.addColorStop(.72, 'rgba(235,243,247,.14)');
  light.addColorStop(1, 'rgba(255,255,255,.24)');
  ctx.fillStyle = light; ctx.fillRect(x, y, width, height);
  ctx.fillStyle = ctx.createPattern(glassGrain(), 'repeat')!;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `400 ${Math.max(16, Math.min(28, width * .047))}px Arial, Helvetica, sans-serif`;
  ctx.fillText('Coming Soon', x + width / 2, y + height / 2);
  ctx.restore();
}
