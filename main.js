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
  // The menu runs in two columns on wide screens, so several sections share the same
  // height on screen. A clicked section therefore stays highlighted until the visitor
  // scrolls by hand; after that the highlight follows the section under the bar.
  let locked = false, ticking = false;
  const bar = document.getElementById('chips-bar');
  const follow = () => {
    ticking = false;
    if (locked || !bar) return;
    const line = bar.getBoundingClientRect().bottom + 40;
    // With two columns, follow the left one so the highlight moves in menu order.
    let best = null, bestTop = -Infinity, bestLeft = Infinity;
    for (const c of cats) {
      if (c.hidden) continue;
      const r = c.getBoundingClientRect();
      if (r.top > line || r.bottom <= line) continue;
      if (r.left < bestLeft - 1 || (Math.abs(r.left - bestLeft) <= 1 && r.top > bestTop)) { best = c; bestTop = r.top; bestLeft = r.left; }
    }
    if (!best) best = cats.find((c) => !c.hidden && c.getBoundingClientRect().top > line) || null;
    const menu = document.getElementById('menu').getBoundingClientRect();
    setActive(best && menu.top < window.innerHeight && menu.bottom > 0 ? best.id : null);
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(follow); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  ['wheel', 'touchmove', 'keydown'].forEach((ev) => window.addEventListener(ev, (e) => {
    if (ev === 'keydown' && !['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) return;
    locked = false;
  }, { passive: true }));
  chips.forEach((chip) => chip.addEventListener('click', () => { locked = true; setActive(chip.dataset.cat); }));
  follow();

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
