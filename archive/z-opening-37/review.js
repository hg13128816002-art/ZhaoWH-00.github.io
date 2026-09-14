// Inspection controls only. Opening 37's renderer is kept byte-for-byte.
(() => {
  const root = document.getElementById('z-opening-37');
  const viewport = root.querySelector('.review-viewport');
  document.getElementById('review-ratio').addEventListener('change', event => {
    const ratio = event.target.value;
    viewport.style.setProperty('--review-ratio', ratio);
    viewport.dataset.portrait = String(ratio === '9/16');
  });
  document.getElementById('review-cue').addEventListener('change', event => {
    const progress = root.querySelector('input[type="range"]');
    progress.value = event.target.value;
    progress.dispatchEvent(new Event('input', { bubbles: true }));
  });
})();
