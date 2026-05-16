(function(){
  const fontName = 'Noto Sans SC Local';
  if (window.fontsReadyPromise) return;
  if (document.fonts && document.fonts.load) {
    // 尝试加载 Regular、Bold、Black 三个字重，确保 900 权重可用
    window.fontsReadyPromise = Promise.allSettled([
      document.fonts.load(`1em "${fontName}"`),
      document.fonts.load(`700 1em "${fontName}"`),
      document.fonts.load(`900 1em "${fontName}"`)
    ]).then(() => document.fonts.ready).catch(() => document.fonts.ready);
  } else if (document.fonts && document.fonts.ready) {
    window.fontsReadyPromise = document.fonts.ready;
  } else {
    window.fontsReadyPromise = Promise.resolve();
  }
  window.fontsReadyPromise.then(() => {
    try { document.documentElement.classList.add('fonts-loaded'); } catch (e) {}
    try { window.dispatchEvent(new Event('fontsloaded')); } catch (e) {}
  });
})();
