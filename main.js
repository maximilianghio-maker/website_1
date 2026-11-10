(() => {
  const cats = [...document.querySelectorAll('.cat')];
  const chips = [...document.querySelectorAll('.chip')];
  const chipFor = new Map(chips.map((c) => [c.dataset.cat, c]));

  /* Highlight the menu section currently on screen */
  const setActive = (id) => {
    chips.forEach((c) => c.classList.toggle('on', c.dataset.cat === id));
    const chip = chipFor.get(id);
    const bar = chip && chip.parentElement;
    if (bar && bar.scrollWidth > bar.clientWidth) {
      bar.scrollTo({ left: chip.offsetLeft - bar.clientWidth / 2 + chip.offsetWidth / 2, behavior: 'smooth' });
    }
  };
  if ('IntersectionObserver' in window) {
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      // With two columns several sections are visible at once; pick the one nearest the top.
      const top = [...seen].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      if (top) setActive(top.id);
    }, { rootMargin: '-25% 0px -55% 0px' });
    cats.forEach((c) => io.observe(c));
  }

  /* Search the menu */
  const input = document.getElementById('menu-search');
  const none = document.getElementById('no-results');
  if (input) {
    const rows = [...document.querySelectorAll('.item')].map((el) => ({ el, text: el.textContent.toLowerCase() }));
    input.addEventListener('input', () => {
      const terms = input.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      rows.forEach((r) => { r.el.hidden = !terms.every((t) => r.text.includes(t)); });
      let any = false;
      cats.forEach((c) => {
        const visible = c.querySelector('.item:not([hidden])') !== null;
        c.hidden = !visible;
        const chip = chipFor.get(c.id);
        if (chip) chip.hidden = !visible;
        any = any || visible;
      });
      none.hidden = any;
    });
  }
})();
