const terminal = document.querySelector<HTMLElement>('[data-contact-terminal]');
if (terminal) {
  const channels = [...terminal.querySelectorAll<HTMLElement>('[data-channel]')];
  const workspace = terminal.querySelector<HTMLElement>('.terminal-workspace')!;
  const stage = terminal.querySelector<HTMLElement>('.satellite-stage')!;
  const canvas = terminal.querySelector<HTMLCanvasElement>('[data-satellite-canvas]')!;
  const status = terminal.querySelector<HTMLElement>('[data-copy-status]')!;
  const link = terminal.querySelector<SVGElement>('.signal-link')!;
  const readout = terminal.querySelector<HTMLElement>('[data-channel-readout]')!;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const linkLabel = terminal.querySelector<HTMLElement>('[data-link-label]')!;
  const feedback = document.querySelector<HTMLElement>('[data-signal-feedback]')!;
  const message = feedback.querySelector<HTMLElement>('[data-feedback-message]')!;
  const countdown = feedback.querySelector<HTMLElement>('[data-countdown]')!;
  const countdownValue = feedback.querySelector<HTMLElement>('[data-countdown-value]')!;
  const cancelNavigation = feedback.querySelector<HTMLButtonElement>('[data-cancel-navigation]')!;
  const names = ['E-MAIL', 'WECHAT', 'BILIBILI'];
  let selected = 1;
  let actionId = 0;
  let disposed = false;
  let feedbackTimer = 0;
  let navigationTimer = 0;
  let visualTimer = 0;
  const effects = new Set<Animation>();
  let turnSatellite: (index: number, animate?: boolean) => void = () => {};

  function effect(element: Element, frames: Keyframe[], options: KeyframeAnimationOptions) {
    if (reduced.matches) return;
    const animation = element.animate(frames, options);
    effects.add(animation);
    animation.finished.then(() => {
      effects.delete(animation);
      animation.cancel();
    }, () => effects.delete(animation));
  }
  function cancelEffects() {
    window.clearTimeout(visualTimer);
    effects.forEach(animation => animation.cancel());
    effects.clear();
  }
  function connect() {
    const origin = workspace.getBoundingClientRect();
    const source = terminal!.querySelector('.satellite-source')!.getBoundingClientRect();
    const target = channels[selected].querySelector('[data-station-target]')!.getBoundingClientRect();
    const x = source.left - origin.left;
    const y = source.top - origin.top;
    const endX = target.left + target.width / 2 - origin.left;
    const endY = target.top + target.height / 2 - origin.top;
    link.querySelectorAll('path').forEach(p => p.setAttribute('d', `M ${x} ${y} L ${endX} ${endY}`));
    link.querySelector('polygon')!.setAttribute('points', `${x-3},${y} ${x+3},${y} ${endX+12},${endY} ${endX-12},${endY}`);
    readout.textContent = `CH 0${selected + 1} / ${names[selected]}`;
  }
  function aim(index: number, animate = true) {
    selected = index;
    cancelEffects();
    terminal!.dataset.aiming = 'true';
    terminal!.dataset.linkState = 'aiming';
    channels.forEach((channel, i) => { channel.dataset.aimed = String(i === index); });
    connect();
    turnSatellite(index, animate && !reduced.matches);
    linkLabel.textContent = 'TARGET ACQUIRED';
  }
  function fire(index: number) {
    aim(index);
    terminal!.dataset.linkState = 'transmitting';
    linkLabel.textContent = 'TRANSMITTING';
    // A single packet travels from the satellite to the station, only on activation.
    effect(link.querySelector('.signal-beam')!, [
      { opacity:0 }, { opacity:.12, offset:.2 }, { opacity:.07, offset:.65 }, { opacity:0 },
    ], { duration:850, easing:'ease-out' });
    effect(link.querySelector('.signal-pulse')!, [
      { strokeDashoffset:'100', opacity:0 },
      { strokeDashoffset:'0', opacity:1, offset:.12 },
      { strokeDashoffset:'-1000', opacity:1, offset:.9 },
      { strokeDashoffset:'-1100', opacity:0 },
    ], { duration:650, easing:'linear' });
    channels[index].querySelectorAll('.station-target i').forEach((ring, i) => {
      effect(ring, [{ transform:'scale(.4)', opacity:.9 }, { transform:'scale(3.2)', opacity:0 }],
        { duration:500, delay:550 + i * 100, easing:'ease-out', fill:'backwards' });
    });
    visualTimer = window.setTimeout(() => {
      terminal!.dataset.linkState = 'ready';
      linkLabel.textContent = 'SIGNAL RECEIVED';
    }, 900);
  }
  function hideFeedback() {
    window.clearTimeout(feedbackTimer);
    window.clearTimeout(navigationTimer);
    navigationTimer = 0;
    feedback.hidden = true;
    countdown.hidden = true;
  }
  function showFeedback(text: string) {
    message.textContent = text;
    feedback.hidden = false;
  }
  function beginCountdown(destination: string) {
    countdown.hidden = false;
    showFeedback('即将跳转到 bilibili');
    const deadline = performance.now() + 3000;
    const tick = () => {
      const remaining = deadline - performance.now();
      countdownValue.textContent = String(Math.max(0, Math.ceil(remaining / 1000)));
      if (remaining <= 0) {
        navigationTimer = 0;
        window.location.assign(destination);
        return;
      }
      navigationTimer = window.setTimeout(tick, Math.min(1000, remaining));
    };
    tick();
  }
  function legacyCopy(text: string, button: HTMLElement) {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.cssText = 'position:fixed;left:-9999px;top:0;';
    document.body.appendChild(input);
    try {
      input.select();
      input.setSelectionRange(0, text.length);
      if (!document.execCommand('copy')) throw new Error('Clipboard unavailable');
    } finally {
      input.remove();
      button.focus({ preventScroll:true });
    }
  }
  async function copy(text: string, button: HTMLElement) {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(text); return; } catch { /* Fall back on HTTP and restrictive browsers. */ }
    }
    legacyCopy(text, button);
  }
  channels.forEach((channel, index) => {
    channel.addEventListener('pointerenter', () => aim(index));
    channel.addEventListener('focus', () => aim(index));
    channel.addEventListener('click', (event: MouseEvent) => {
      const destination = channel.getAttribute('href');
      if (destination && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0)) return;
      if (destination) event.preventDefault();
      const request = ++actionId;
      hideFeedback();
      status.textContent = '';
      const text = channel.dataset.copy;
      // Clipboard access stays within the click gesture; the satellite never gates it.
      const copying = text ? copy(text, channel) : null;
      fire(index);
      if (destination) {
        beginCountdown(destination);
        return;
      }
      if (!copying) return;
      copying.then(() => {
        if (request !== actionId || disposed) return;
        showFeedback('/你成功的复制了我的联系方式/');
        status.textContent = index === 0 ? '邮箱已复制' : '微信号已复制';
        feedbackTimer = window.setTimeout(() => { feedback.hidden = true; status.textContent = ''; }, 1800);
      }, () => {
        if (request !== actionId || disposed) return;
        showFeedback('复制未完成，请手动复制下方账号');
        status.textContent = text!;
        feedbackTimer = window.setTimeout(() => { feedback.hidden = true; }, 2600);
      });
    });
  });
  cancelNavigation.addEventListener('click', hideFeedback);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') hideFeedback(); });
  const layoutObserver = new ResizeObserver(() => {
    connect();
    turnSatellite(selected, false);
  });
  layoutObserver.observe(workspace);
  document.fonts.ready.then(connect);
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelEffects(); });
  reduced.addEventListener('change', () => { if (reduced.matches) cancelEffects(); });
  window.addEventListener('page-transition-start', cancelEffects);
  window.addEventListener('pagehide', event => {
    ++actionId;
    cancelEffects();
    hideFeedback();
    if (!event.persisted) { disposed = true; layoutObserver.disconnect(); }
  });

  async function initSatellite() {
    let releaseRenderer: (() => void) | undefined;
    try {
      const {
        ACESFilmicToneMapping, Box3, CanvasTexture, DirectionalLight,
        EquirectangularReflectionMapping, GLTFLoader, Group, HemisphereLight,
        MathUtils, Object3D, PMREMGenerator, PerspectiveCamera, PointLight,
        Quaternion, SRGBColorSpace, Scene, Vector3, WebGLRenderer,
      } = await import('./contact-three');
      if (disposed) return;
      const renderer = new WebGLRenderer({ canvas, alpha:true, antialias:true, powerPreference:'low-power' });
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.toneMapping = ACESFilmicToneMapping;
      const scene = new Scene();
      const camera = new PerspectiveCamera(32, 1, .1, 60);
      camera.position.set(3.6, 2.2, 6.2);
      camera.lookAt(0, 0, 0);
      scene.add(camera);
      function makeStudioEnvTexture(size = 512) {
        const width = size;
        const height = size / 2;
        const surface = document.createElement('canvas');
        surface.width = width;
        surface.height = height;
        const paint = surface.getContext('2d');

        // 四周压到接近全黑：只有几块灯是有亮度的，金属才有干净的「亮面—暗面」可反射，
        // 环境整体一灰，再强的灯也会被糊掉（这是之前发白的根源）
        const background = paint.createLinearGradient(0, 0, 0, height);
        background.addColorStop(0, '#0d1725');
        background.addColorStop(0.46, '#050a12');
        background.addColorStop(1, '#02040a');
        paint.fillStyle = background;
        paint.fillRect(0, 0, width, height);

        // 画面上的一点 = 一个方向：cx 是方位角（0° 屏幕右方），cy 是仰角（正上方为天顶）
        const uOf = (azimuthDeg) => 0.5 + (90 - azimuthDeg) / 360;
        const vOf = (elevationDeg) => 0.5 - elevationDeg / 180;

        function lightBox(cx, cy, rx, ry, color, alpha) {
          paint.save();
          paint.globalAlpha = alpha;
          paint.translate(cx * width, cy * height);
          paint.scale(rx * width, ry * height);
          const glow = paint.createRadialGradient(0, 0, 0, 0, 0, 1);
          glow.addColorStop(0, color);
          glow.addColorStop(0.5, color);
          glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          paint.fillStyle = glow;
          paint.beginPath();
          paint.arc(0, 0, 1, 0, Math.PI * 2);
          paint.fill();
          paint.restore();
        }

        // 贴图首尾相接，靠近接缝的灯要补画到另一侧，否则会在 u = 0 处被切断
        function light(azimuthDeg, elevationDeg, rx, ry, color, alpha) {
          const cx = uOf(azimuthDeg);
          const cy = vOf(elevationDeg);
          lightBox(cx, cy, rx, ry, color, alpha);
          if (cx - rx < 0) lightBox(cx + 1, cy, rx, ry, color, alpha);
          if (cx + rx > 1) lightBox(cx - 1, cy, rx, ry, color, alpha);
        }

        // 右侧主柔光箱：一块不太大的白灯 + 更小更亮的内芯；
        // 尺寸必须克制，铺太大整机都会变成一片白，暗面根本留不下来
        light(0, 32, 0.085, 0.14, '#ffffff', 0.62);
        light(0, 30, 0.035, 0.06, '#ffffff', 1);
        light(34, 22, 0.055, 0.11, '#eaf4ff', 0.22); // 主光右上方垫一小块，亮面不至于断得太生硬
        // 左侧冷光板：小、暗、饱和度高，暗面那条蓝边才够纯；
        // 它一旦又大又亮，左右亮度就抵消了，整机立刻发闷
        light(180, 20, 0.07, 0.13, '#5fb6ff', 0.5);
        // 背后顶光：给背面切面留一点亮度，压得很低以免吃掉暗部
        light(104, 42, 0.11, 0.14, '#a8d4ff', 0.28);
        // 一点饱和的暖色点缀，免得整机只剩冷调
        light(288, 6, 0.06, 0.1, '#ffae5e', 0.34);
        // 地面反弹，托住下半身
        light(0, -42, 0.36, 0.13, '#2c4a68', 0.38);
        light(180, -38, 0.32, 0.12, '#243c56', 0.38);

        const texture = new CanvasTexture(surface);
        texture.mapping = EquirectangularReflectionMapping;
        texture.colorSpace = SRGBColorSpace;
        const generator = new PMREMGenerator(renderer);
        const envMap = generator.fromEquirectangular(texture);
        texture.dispose();
        generator.dispose();
        return envMap;
      }

      const environment = makeStudioEnvTexture();
      scene.environment = environment.texture;

      // Match the homepage lander's camera-relative studio rig and theme presets.
      const rig = new Group();
      camera.add(rig);
      function rigPosition(azimuthDeg: number, elevationDeg: number, distance: number) {
        const azimuth = MathUtils.degToRad(azimuthDeg);
        const elevation = MathUtils.degToRad(elevationDeg);
        const horizontal = Math.cos(elevation) * distance;
        return new Vector3(Math.sin(azimuth) * horizontal, Math.sin(elevation) * distance, Math.cos(azimuth) * horizontal - 7.2);
      }
      function rigLight(color: number, intensity: number, azimuth: number, elevation: number, distance: number) {
        const light = new DirectionalLight(color, intensity);
        light.position.copy(rigPosition(azimuth, elevation, distance));
        const aim = new Object3D();
        aim.position.set(0, 0, -7.2);
        light.target = aim;
        rig.add(light, aim);
        return light;
      }
      const key = rigLight(0xffffff, 2.15, 38, 28, 6.4);
      const rim = rigLight(0x7cc4ff, 1.55, -70, 12, 7.2);
      rigLight(0x6cb4ff, .5, 166, 32, 7.6);
      rigLight(0x9ec6ea, .3, -6, -44, 6.8);
      const glint = new PointLight(0xffffff, 7, 26, 2);
      glint.position.copy(rigPosition(30, 8, 4.2));
      rig.add(glint);
      scene.add(new HemisphereLight(0xacdbfb, 0x040a12, .05));
      const pivot = new Group();
      scene.add(pivot);
      let model: any = null;
      let raf = 0;
      let lastFrame = 0;
      let visible = true;
      let transitioning = false;
      let rendererDisposed = false;
      let hasRenderedModel = false;
      let renderWidth = 0;
      let renderHeight = 0;
      let pixelRatio = 1;
      let theme = 'dark';
      const materials = new Set<any>();
      const targetRotation = new Quaternion();
      let maneuver: { start:number; rotation:any } | null = null;
      function aimRotation(index: number) {
        const source = terminal!.querySelector('.satellite-source')!.getBoundingClientRect();
        const target = channels[index].querySelector('[data-station-target]')!.getBoundingClientRect();
        const dx = target.left + target.width / 2 - source.left;
        const dy = target.top + target.height / 2 - source.top;
        const distance = Math.max(1, Math.hypot(dx, dy));
        // The dish faces local +Z; use the camera plane to point it toward the actual station.
        const direction = new Vector3(dx / distance * .9, -dy / distance * .9, 1.05).normalize();
        direction.applyQuaternion(camera.quaternion);
        const rotation = new Quaternion().setFromUnitVectors(new Vector3(0,0,1), direction);
        return rotation.multiply(new Quaternion().setFromAxisAngle(new Vector3(0,0,1), -.08));
      }
      function draw(time: number) {
        raf = 0;
        if (disposed || rendererDisposed || !model || !visible || transitioning || document.hidden) return;
        if (time - lastFrame < 1000 / 30 && !reduced.matches) {
          raf = requestAnimationFrame(draw);
          return;
        }
        lastFrame = time;
        if (maneuver && !reduced.matches) {
          const p = Math.min(1, Math.max(0, (time - maneuver.start) / 480));
          const eased = 1 - Math.pow(1 - p, 3);
          pivot.quaternion.slerpQuaternions(maneuver.rotation, targetRotation, eased);
          if (p === 1) maneuver = null;
        } else {
          maneuver = null;
          pivot.quaternion.copy(targetRotation);
        }
        renderer.render(scene, camera);
        if (model) hasRenderedModel = true;
        canvas.dataset.renderState = maneuver ? 'active' : 'idle';
        if (maneuver) raf = requestAnimationFrame(draw);
      }
      function invalidate() {
        if (!raf && !disposed && !rendererDisposed && visible && !transitioning && !document.hidden) raf = requestAnimationFrame(draw);
      }
      function syncActivity() {
        const active = !disposed && !rendererDisposed && visible && !transitioning && !document.hidden;
        canvas.style.animationPlayState = active && !reduced.matches ? 'running' : 'paused';
        if (active) invalidate();
        else {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      }
      function resize() {
        const rect = stage.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(rect.height));
        const nextRatio = Math.min(window.devicePixelRatio || 1, 1.25, Math.sqrt(600000 / (width * height)));
        if (width === renderWidth && height === renderHeight && nextRatio === pixelRatio) return;
        renderWidth = width;
        renderHeight = height;
        if (nextRatio !== pixelRatio) {
          pixelRatio = nextRatio;
          renderer.setPixelRatio(pixelRatio);
        }
        renderer.setSize(width, height, false);
        camera.aspect = Math.max(.1, width / height);
        camera.position.z = camera.aspect < 1.4 ? 8.4 : 6.8;
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
        scene.environmentRotation.y = Math.atan2(camera.position.x, camera.position.z) + Math.PI / 2;
        if (model) turnSatellite(selected, false);
        invalidate();
      }
      function applyTheme() {
        theme = document.documentElement.dataset.theme || 'dark';
        const light = theme === 'light';
        renderer.toneMappingExposure = light ? 1.02 : 1.03;
        key.intensity = light ? 2.5 : 2.15;
        rim.intensity = light ? 1.9 : 1.55;
        materials.forEach(material => { material.envMapIntensity = light ? 1.15 : 1.45; });
        invalidate();
      }
      turnSatellite = (index, animate = false) => {
        const nextRotation = aimRotation(index);
        // Focus, pointer entry and click can all select the same channel.
        if (hasRenderedModel && targetRotation.angleTo(nextRotation) < .00001) return;
        targetRotation.copy(nextRotation);
        maneuver = animate ? { start:performance.now(), rotation:pivot.quaternion.clone() } : null;
        canvas.dataset.renderState = 'active';
        invalidate();
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(stage);
      const themeObserver = new MutationObserver(applyTheme);
      themeObserver.observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        syncActivity();
      });
      visibilityObserver.observe(stage);
      document.addEventListener('visibilitychange', syncActivity);
      reduced.addEventListener('change', syncActivity);
      const onTransition = () => { transitioning = true; syncActivity(); };
      const onShow = () => { transitioning = false; syncActivity(); };
      releaseRenderer = () => {
        if (rendererDisposed) return;
        rendererDisposed = true;
        canvas.style.animationPlayState = 'paused';
        cancelAnimationFrame(raf);
        raf = 0;
        resizeObserver.disconnect();
        themeObserver.disconnect();
        visibilityObserver.disconnect();
        document.removeEventListener('visibilitychange', syncActivity);
        reduced.removeEventListener('change', syncActivity);
        window.removeEventListener('page-transition-start', onTransition);
        window.removeEventListener('pageshow', onShow);
        window.removeEventListener('pagehide', onHide);
        model?.traverse((node: any) => { node.geometry?.dispose(); });
        materials.forEach(material => material.dispose());
        environment.dispose();
        renderer.dispose();
      };
      const onHide = (event: PageTransitionEvent) => {
        transitioning = true;
        syncActivity();
        if (!event.persisted) releaseRenderer?.();
      };
      window.addEventListener('page-transition-start', onTransition);
      window.addEventListener('pageshow', onShow);
      window.addEventListener('pagehide', onHide);
      resize();
      applyTheme();
      const gltf = await new GLTFLoader().loadAsync('/models/space-satellite.glb');
      model = gltf.scene;
      if (disposed) {
        model.traverse((node: any) => {
          node.geometry?.dispose();
          (Array.isArray(node.material) ? node.material : [node.material]).forEach((material: any) => material?.dispose());
        });
        return;
      }
      const bounds = new Box3().setFromObject(model);
      const size = bounds.getSize(new Vector3());
      const center = bounds.getCenter(new Vector3());
      const scale = 5.7 / Math.max(size.x, size.y, size.z);
      model.scale.setScalar(scale);
      model.position.copy(center).multiplyScalar(-scale);
      pivot.add(model);
      model.traverse((node: any) => {
        if (!node.isMesh) return;
        node.geometry?.computeVertexNormals();
        (Array.isArray(node.material) ? node.material : [node.material]).forEach((material: any) => {
          material.flatShading = true;
          material.metalness = .7;
          material.roughness = .38;
          material.envMapIntensity = theme === 'light' ? 1.15 : 1.45;
          material.needsUpdate = true;
          materials.add(material);
        });
      });
      canvas.dataset.ready = 'true';
      terminal!.querySelector<HTMLElement>('[data-satellite-fallback]')!.hidden = true;
      turnSatellite(selected);
    } catch {
      releaseRenderer?.();
      canvas.hidden = true;
      linkLabel.textContent = 'STANDBY';
    }
  }
  void initSatellite();
}
