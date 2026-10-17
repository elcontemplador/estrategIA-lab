/* Progressive enhancement: all projects and links also work without JavaScript. */
(() => {
  const header = document.querySelector('.site-header');
  const updateOffset = () => {
    const sticky = getComputedStyle(header).position === 'sticky';
    const height = sticky ? Math.ceil(header.getBoundingClientRect().height) + 16 : 16;
    document.documentElement.style.setProperty('--header-offset', `${height}px`);
  };
  updateOffset();
  if ('ResizeObserver' in window) new ResizeObserver(updateOffset).observe(header);
  else window.addEventListener('resize', updateOffset);

  // October's promotion expires automatically; the game remains in the catalogue.
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit'
  }).formatToParts(new Date());
  const current = Object.fromEntries(parts.map(part => [part.type, part.value]));
  if (current.year !== '2026' || current.month !== '10') {
    document.querySelector('[data-anniversary]').hidden = true;
    document.querySelector('.hero').classList.remove('hero-anniversary');
  }

  const form = document.getElementById('catalog-filters');
  if (!form) return;
  const type = document.getElementById('filter-type');
  const audience = document.getElementById('filter-audience');
  const cards = [...document.querySelectorAll('.project-card')];
  const index = [...document.querySelectorAll('[data-project-link]')];
  const status = document.getElementById('catalog-status');
  const empty = document.getElementById('catalog-empty');

  const applyFilters = () => {
    const visible = new Set();
    cards.forEach(card => {
      const match = (!type.value || card.dataset.type === type.value) &&
        (!audience.value || card.dataset.audiences.split(' ').includes(audience.value));
      card.hidden = !match;
      if (match) visible.add(card.id);
    });
    index.forEach(item => { item.hidden = !visible.has(item.dataset.projectLink); });
    status.textContent = `${visible.size} de ${cards.length} proyectos`;
    empty.hidden = visible.size > 0;
  };
  const resetFilters = () => {
    type.value = '';
    audience.value = '';
    applyFilters();
  };
  form.addEventListener('change', applyFilters);
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('reset', event => {
    event.preventDefault();
    resetFilters();
  });

  // A route or a saved fragment must still reach its card under an active filter.
  const revealTarget = hash => {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return null; }
    const target = document.getElementById(id);
    if (!target?.classList.contains('project-card')) return null;
    if (target.hidden) resetFilters();
    return target;
  };
  document.querySelector('.catalog-explorer').addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = revealTarget(link.hash);
    if (target) {
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  });
  window.addEventListener('hashchange', () => {
    const target = revealTarget(location.hash);
    if (target) target.scrollIntoView();
  });
  applyFilters();
  revealTarget(location.hash);
  form.hidden = false;
})();
