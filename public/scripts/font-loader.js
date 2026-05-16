(function(){
  const fontName = 'Noto Sans SC';
  if (window.fontsReadyPromise) return;
  if (document.fonts && document.fonts.load) {
    window.fontsReadyPromise = document.fonts.load(`1em "${fontName}"`).then(() => document.fonts.ready).catch(() => document.fonts.ready);
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
