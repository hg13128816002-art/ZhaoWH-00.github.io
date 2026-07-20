(function(){
  const fontName = 'Noto Sans SC Local';
  if (window.fontsReadyPromise) return;
  let fontLoadPromise;

  if (document.fonts && document.fonts.load) {
    // 尝试加载 Regular、Bold、Black 三个字重，确保 900 权重可用
    fontLoadPromise = Promise.allSettled([
      document.fonts.load(`1em "${fontName}"`),
      document.fonts.load(`700 1em "${fontName}"`),
      document.fonts.load(`900 1em "${fontName}"`)
    ]).then(() => document.fonts.ready).catch(() => undefined);
  } else if (document.fonts && document.fonts.ready) {
    fontLoadPromise = document.fonts.ready;
  } else {
    fontLoadPromise = Promise.resolve();
  }

  // 字体服务异常时避免整个 body 永久不可见；正常缓存命中时不会触发。
  let timeoutId;
  const failOpen = new Promise((resolve) => {
    timeoutId = window.setTimeout(resolve, 2000);
  });
  window.fontsReadyPromise = Promise.race([fontLoadPromise, failOpen])
    .catch(() => undefined)
    .finally(() => {
      window.clearTimeout(timeoutId);
    });

  window.fontsReadyPromise.then(() => {
    try { document.documentElement.classList.add('fonts-loaded'); } catch (e) {}
    try { window.dispatchEvent(new Event('fontsloaded')); } catch (e) {}
  });
})();
