import { initSelectedWorksMotion } from './selected-works-motion';

export function initWorkBrowser(root: HTMLElement) {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-filter]')];
  const cards = [...root.querySelectorAll<HTMLElement>('.catalog-grid > .work-card')];
  const count = root.querySelector('[data-result-count]')!;
  const groupCounts = new Map(cards.filter(card => card.dataset.collectionCounts)
    .map(card => [card, JSON.parse(card.dataset.collectionCounts!) as Record<string, number>]));

  function filterWorks() {
    const requested = new URLSearchParams(location.search).get('category') || 'all';
    const filter = buttons.some(button => button.dataset.filter === requested) ? requested : 'all';
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    let total = 0;
    cards.forEach(card => {
      const grouped = groupCounts.get(card);
      const matches = grouped
        ? (filter === 'all' ? Object.values(grouped).reduce((sum, n) => sum + n, 0) : grouped[filter] || 0)
        : Number(filter === 'all' || card.dataset.collection === filter);
      card.hidden = matches === 0;
      total += matches;
      if (grouped) {
        card.querySelector('[data-other-count]')!.textContent = String(matches);
        card.querySelectorAll<HTMLAnchorElement>('[data-other-link]').forEach(link => {
          link.href = filter === 'all' ? '/works/other/' : `/works/other/?category=${filter}`;
        });
      }
    });
    count.textContent = String(total);
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    const url = new URL(location.href);
    if (button.dataset.filter === 'all') url.searchParams.delete('category');
    else url.searchParams.set('category', button.dataset.filter!);
    history.pushState(null, '', url);
    filterWorks();
  }));
  window.addEventListener('popstate', filterWorks);
  filterWorks();
  initSelectedWorksMotion(root);
}
