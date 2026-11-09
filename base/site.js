(() => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.mobile-menu-toggle');
  const panel = document.querySelector('.mobile-nav-panel');
  if (header && toggle && panel) {
    const links = [...panel.querySelectorAll('a')];
    const close = () => {
      header.classList.remove('mobile-menu-open');
      toggle.setAttribute('aria-expanded', 'false');
      panel.setAttribute('aria-hidden', 'true');
      links.forEach(link => link.setAttribute('tabindex', '-1'));
    };
    toggle.addEventListener('click', () => {
      const opening = !header.classList.contains('mobile-menu-open');
      if (!opening) return close();
      header.classList.add('mobile-menu-open');
      toggle.setAttribute('aria-expanded', 'true');
      panel.setAttribute('aria-hidden', 'false');
      links.forEach(link => link.removeAttribute('tabindex'));
    });
    links.forEach(link => link.addEventListener('click', close));
  }

  document.querySelectorAll('.print-button').forEach(button => {
    button.addEventListener('click', () => window.print());
  });

  const insightMatch = location.pathname.match(/^\/insights\/([^/]+)/);
  if (insightMatch) localStorage.setItem('muoio-insight-viewed:' + insightMatch[1], 'true');

  document.querySelectorAll('.learning-card-link').forEach(card => {
    const match = card.getAttribute('href')?.match(/^\/insights\/([^/]+)/);
    if (!match || localStorage.getItem('muoio-insight-viewed:' + match[1]) !== 'true') return;
    const status = card.querySelector('.article-status');
    if (!status) return;
    status.classList.add('article-status-viewed');
    status.innerHTML = 'Viewed <i class="article-viewed-mark" aria-hidden="true"></i>';
  });
})();
