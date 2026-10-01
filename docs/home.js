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
})();
