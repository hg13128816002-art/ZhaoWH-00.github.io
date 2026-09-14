// 恢复原版二维轨道模型：低分辨率画布、30fps 上限、一次生成的字符图集。
// 装饰线由静态 SVG 承担，动画中不再绘制字体、排序深度或重绘背景纹理。
export function initHeroUniverse(canvas: HTMLCanvasElement, options: { paused?: boolean } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const stage = canvas.parentElement!;
  const decoration = stage.querySelector<SVGSVGElement>('.hero-decoration');
  const mobile = window.matchMedia('(max-width: 899px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const TAU = Math.PI * 2;
  const FRAME_INTERVAL = 1000 / 30;
  const creed = 'INTEGRATE THINKING INTO DESIGN • ';
  const baseChars = [...'设计思维先锋01+#×·'];
  let scale = 1, offsetX = 0, offsetY = 0;
  let frame = 0, lastPaint = 0;
  let ready = false, visible = true, pointerInside = false;
  let paused = options.paused ?? false;
  let cursorAngle = 0;
  const pointer = { x: -10000, y: -10000, targetX: -10000, targetY: -10000 };

  const desktopLayout = [
    { x: 915, y: 370, coreR: 164, ringRX: 306, ringRY: 100, tilt: -0.2, orbitRotation: -0.08 },
    { x: 335, y: 185, coreR: 82, ringRX: 165, ringRY: 54, tilt: 0.26, orbitRotation: 0.14 },
    { x: 370, y: 582, coreR: 46, ringRX: 96, ringRY: 31, tilt: -0.16, orbitRotation: -0.06 },
  ];
  const mobileLayout = [
    { x: 256, y: 284, coreR: 84, ringRX: 145, ringRY: 46, tilt: -0.2, orbitRotation: -0.08 },
    { x: 112, y: 104, coreR: 39, ringRX: 74, ringRY: 24, tilt: 0.26, orbitRotation: 0.14 },
    { x: 110, y: 488, coreR: 26, ringRX: 52, ringRY: 17, tilt: -0.16, orbitRotation: -0.06 },
  ];
  const planets = desktopLayout.map((layout, index) => ({
    ...layout,
    direction: index === 1 ? -1 : 1,
    coreCount: [150, 76, 42][index],
    ringCount: [160, 86, 54][index],
    baseSize: [16, 13, 10][index],
    fieldPadding: [48, 32, 24][index],
  }));
  type Particle = {
    planet: number; ring: boolean; angle: number; speed: number;
    radius: number; spread: number; size: number; char: string;
    x: number; y: number; slot: number; capture: number; captured: boolean;
  };
  const particles: Particle[] = [];
  planets.forEach((planet, planetIndex) => {
    for (let i = 0; i < planet.coreCount + planet.ringCount; i++) {
      const ring = i >= planet.coreCount;
      const index = i - planet.coreCount;
      const slot = Math.floor(index * creed.length / planet.ringCount);
      const assigned = ring && (index === 0 || slot !== Math.floor((index - 1) * creed.length / planet.ringCount));
      particles.push({
        planet: planetIndex, ring,
        angle: ring ? index / planet.ringCount * TAU : Math.random() * TAU,
        speed: (ring ? 0.09 + Math.random() * 0.09 : 0.12 + Math.random() * 0.24) * planet.direction,
        radius: Math.sqrt(Math.random()), spread: 0.82 + Math.random() * 0.36,
        size: planet.baseSize + Math.random() * (ring ? 4 : 6),
        char: baseChars[Math.floor(Math.random() * baseChars.length)],
        x: 0, y: 0, slot: assigned ? slot : -1, capture: 0, captured: false,
      });
    }
  });

  // 把所有字形一次性栅格化；每帧只从同一张小图集复制像素。
  const atlas = document.createElement('canvas');
  const atlasContext = atlas.getContext('2d')!;
  const glyphs = [...new Set([...baseChars, ...creed])];
  const glyphIndex = new Map(glyphs.map((char, index) => [char, index]));
  const CELL = 36, COLUMNS = 12;
  function buildAtlas() {
    atlas.width = CELL * COLUMNS;
    atlas.height = CELL * Math.ceil(glyphs.length / COLUMNS);
    atlasContext.font = 'bold 24px "Noto Sans SC Local", monospace';
    atlasContext.textAlign = 'center';
    atlasContext.textBaseline = 'middle';
    atlasContext.fillStyle = '#040a12';
    glyphs.forEach((char, index) => {
      atlasContext.fillText(char, index % COLUMNS * CELL + CELL / 2, Math.floor(index / COLUMNS) * CELL + CELL / 2);
    });
  }
  function drawGlyph(char: string, size: number, x: number, y: number) {
    const index = glyphIndex.get(char)!;
    const side = size * CELL / 24;
    ctx!.drawImage(atlas, index % COLUMNS * CELL, Math.floor(index / COLUMNS) * CELL, CELL, CELL, x - side / 2, y - side / 2, side, side);
  }

  function resize() {
    const width = stage.clientWidth, height = stage.clientHeight;
    if (!width || !height) return;
    const sceneWidth = mobile.matches ? 430 : 1440;
    const sceneHeight = mobile.matches ? 590 : 760;
    stage.style.setProperty('--hero-canvas-height', `${height}px`);
    // 保持原版 1x 像素尺寸，避免 Retina 大画布成倍增加绘制负担。
    canvas.width = width; canvas.height = height;
    scale = Math.min(width / sceneWidth, height / sceneHeight);
    offsetX = (width - sceneWidth * scale) / 2;
    offsetY = (height - sceneHeight * scale) / 2;
    planets.forEach((planet, index) => Object.assign(planet, (mobile.matches ? mobileLayout : desktopLayout)[index]));
    decoration?.setAttribute('viewBox', `0 0 ${sceneWidth} ${sceneHeight}`);
    decoration?.querySelectorAll<SVGGElement>('[data-orbit]').forEach((group, index) => {
      const planet = planets[index];
      const angle = (planet.tilt + planet.orbitRotation) * 180 / Math.PI;
      group.setAttribute('transform', `translate(${planet.x} ${planet.y}) rotate(${angle})`);
      group.querySelector('ellipse')?.setAttribute('rx', String(planet.ringRX * 1.08));
      group.querySelector('ellipse')?.setAttribute('ry', String(planet.ringRY * 1.08));
    });
    pointerInside = false;
    particles.forEach((particle) => { particle.capture = 0; particle.captured = false; });
    syncPlayback();
  }

  function paint(dt: number, still: boolean) {
    ctx!.setTransform(1, 0, 0, 1, 0, 0);
    ctx!.clearRect(0, 0, canvas.width, canvas.height);
    ctx!.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    const follow = Math.min(1, dt * 8);
    pointer.x += (pointer.targetX - pointer.x) * follow;
    pointer.y += (pointer.targetY - pointer.y) * follow;
    cursorAngle += still ? 0 : dt * 0.65;
    planets.forEach((planet, planetIndex) => {
      const cosTilt = Math.cos(planet.tilt), sinTilt = Math.sin(planet.tilt);
      const cosRotation = Math.cos(planet.orbitRotation), sinRotation = Math.sin(planet.orbitRotation);
      const cosField = cosTilt * cosRotation - sinTilt * sinRotation;
      const sinField = sinTilt * cosRotation + cosTilt * sinRotation;
      // 用真实鼠标位置判断临界线，避免光标缓动使越界释放延迟。
      const dx = pointer.targetX - planet.x, dy = pointer.targetY - planet.y;
      const fieldX = dx * cosField + dy * sinField;
      const fieldY = -dx * sinField + dy * cosField;
      // 以球核和星环的最外层字符为轮廓，向各方向留出一圈引力缓冲。
      // 1.18 对应字符星环的最大 spread，避免边缘字符落在引力范围外。
      const fieldRX = planet.ringRX * 1.18 + planet.fieldPadding;
      const fieldRY = planet.ringRY * 1.18 + planet.fieldPadding;
      const fieldCoreR = planet.coreR + planet.fieldPadding;
      const contourDistance = Math.min(
        Math.hypot(fieldX / fieldRX, fieldY / fieldRY),
        Math.hypot(dx, dy) / fieldCoreR,
      );
      const withinField = pointerInside && !still && contourDistance < 1;
      const depth = withinField ? 1 - contourDistance : 0;
      const strength = depth * depth * (3 - 2 * depth);
      const pullRadius = fieldRX * 0.12 + planet.ringRX * (0.32 + 1.1 * strength);
      const captureRate = 1.5 + 5 * strength;
      particles.forEach((particle) => {
        if (particle.planet !== planetIndex) return;
        if (!still) particle.angle += particle.speed * dt;
        let localX: number, localY: number;
        if (particle.ring) {
          const x = Math.cos(particle.angle) * planet.ringRX * particle.spread;
          const y = Math.sin(particle.angle) * planet.ringRY * particle.spread;
          localX = x * cosTilt - y * sinTilt;
          localY = x * sinTilt + y * cosTilt;
        } else {
          localX = Math.cos(particle.angle) * particle.radius * planet.coreR;
          localY = Math.sin(particle.angle) * particle.radius * planet.coreR;
        }
        const baseX = planet.x + localX * cosRotation - localY * sinRotation;
        const baseY = planet.y + localX * sinRotation + localY * cosRotation;
        // 仅捕获鼠标附近的字符；靠近中心时，捕获半径与吸力同步增加。
        // 已捕获的字符持续跟随，直到鼠标越过所属星球的临界线。
        if (!withinField) {
          particle.captured = false;
        } else if (!particle.captured) {
          const dx = baseX - pointer.targetX, dy = baseY - pointer.targetY;
          particle.captured = dx * dx + dy * dy < pullRadius * pullRadius;
        }
        const captured = particle.captured;
        particle.capture += ((captured ? 1 : 0) - particle.capture) * Math.min(1, dt * (captured ? captureRate : 8));
        if (still) particle.capture = 0;
        const ringAngle = cursorAngle + particle.slot / creed.length * TAU;
        let targetX = baseX, targetY = baseY;
        if (captured || particle.capture > 0.001) {
          if (particle.slot >= 0) {
            targetX = pointer.x + Math.cos(ringAngle) * 110;
            targetY = pointer.y + Math.sin(ringAngle) * 110;
          } else {
            // 其余字符也随鼠标聚拢，在文字环内保留原来的游离层。
            const dx = baseX - pointer.x, dy = baseY - pointer.y;
            const distance = Math.max(1, Math.hypot(dx, dy));
            targetX = pointer.x + dx / distance * 80;
            targetY = pointer.y + dy / distance * 80;
          }
        }
        particle.x = baseX + (targetX - baseX) * particle.capture;
        particle.y = baseY + (targetY - baseY) * particle.capture;
        const size = particle.size * (mobile.matches ? 0.62 : 1) * (1 - particle.capture * 0.2);
        ctx!.globalAlpha = particle.ring ? 0.3 : 0.42;
        if (particle.slot >= 0 && particle.capture > 0.65) {
          ctx!.save();
          ctx!.globalAlpha = 0.9;
          ctx!.translate(particle.x, particle.y);
          ctx!.rotate(ringAngle + Math.PI / 2);
          drawGlyph(creed[particle.slot], 15, 0, 0);
          ctx!.restore();
        } else {
          drawGlyph(particle.char, size, particle.x, particle.y);
        }
      });
    });
    ctx!.globalAlpha = 1;
  }

  function tick(timestamp: number) {
    frame = 0;
    if (!ready || !visible || document.hidden || paused) return;
    const elapsed = timestamp - lastPaint;
    if (elapsed >= FRAME_INTERVAL - 0.5) {
      paint(lastPaint ? Math.min(elapsed / 1000, 0.08) : 1 / 30, false);
      lastPaint = timestamp;
    }
    frame = requestAnimationFrame(tick);
  }
  function syncPlayback() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; lastPaint = 0;
    canvas.dataset.playback = paused || !visible || document.hidden ? 'paused' : mobile.matches || reducedMotion.matches ? 'static' : 'running';
    if (!ready || !visible || document.hidden) return;
    canvas.style.visibility = 'visible';
    paint(1 / 30, paused || mobile.matches || reducedMotion.matches);
    lastPaint = performance.now();
    if (!paused && !mobile.matches && !reducedMotion.matches) frame = requestAnimationFrame(tick);
  }
  stage.addEventListener('pointermove', (event) => {
    if (paused || event.pointerType === 'touch' || mobile.matches || reducedMotion.matches) return;
    const rect = canvas.getBoundingClientRect();
    pointer.targetX = (event.clientX - rect.left - offsetX) / scale;
    pointer.targetY = (event.clientY - rect.top - offsetY) / scale;
    if (!pointerInside) { pointer.x = pointer.targetX; pointer.y = pointer.targetY; }
    pointerInside = true;
  }, { passive: true });
  stage.addEventListener('pointerleave', () => { pointerInside = false; });
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncPlayback();
  }).observe(stage);
  document.addEventListener('visibilitychange', syncPlayback);
  mobile.addEventListener('change', resize);
  reducedMotion.addEventListener('change', syncPlayback);
  resize();
  (window.fontsReadyPromise ?? Promise.resolve()).then(() => {
    buildAtlas(); ready = true; syncPlayback();
  });
  return {
    setPaused(value: boolean) {
      if (paused === value) return;
      paused = value;
      if (paused) pointerInside = false;
      syncPlayback();
    },
  };
}
