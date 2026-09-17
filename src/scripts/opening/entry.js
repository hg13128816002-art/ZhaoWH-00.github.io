// sessionStorage survives reloads and same-tab navigation, but belongs to each tab session.
export function claimOpeningEntry() {
  const key = 'zhao-portfolio-opening-visited';
  const navigation = performance.getEntriesByType('navigation')[0]?.type;
  let visited = false;
  try {
    visited = window.sessionStorage.getItem(key) === 'true';
    // Mark the visit before permission/loading, so even an immediate refresh skips the film.
    window.sessionStorage.setItem(key, 'true');
  } catch { /* Navigation type and referrer still prevent reload/internal replay. */ }
  if (navigation === 'reload') return 'reload';
  if (navigation === 'back_forward') return 'history';
  if (visited) return 'repeat';
  try {
    const from = new URL(document.referrer);
    if (from.origin === window.location.origin && from.pathname !== '/' && from.pathname !== '/index.html') return 'internal';
  } catch {}
  return 'fresh';
}
