(() => {
  const section = document.getElementById('experience');
  if (!section) return;

  const board = section.querySelector('.experience-noteboard');
  const notes = [...board.querySelectorAll('.experience-note')];
  const offsets = new WeakMap();
  let topLayer = 0;

  function move(note, dx, dy) {
    const frame = board.getBoundingClientRect();
    const box = note.getBoundingClientRect();
    const current = offsets.get(note) ?? { x: 0, y: 0 };
    const x = current.x + Math.min(frame.right - box.right, Math.max(frame.left - box.left, dx));
    const y = current.y + Math.min(frame.bottom - box.bottom, Math.max(frame.top - box.top, dy));
    offsets.set(note, { x, y });
    note.style.setProperty('--note-x', `${x}px`);
    note.style.setProperty('--note-y', `${y}px`);
  }

  function bringForward(note) {
    note.parentElement.style.zIndex = String(++topLayer);
  }

  for (const note of notes) {
    let drag;
    note.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 ||
          (event.pointerType === 'touch' && !event.target.closest('.experience-note-grip'))) return;
      bringForward(note);
      note.setPointerCapture(event.pointerId);
      note.classList.add('is-moving');
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
    });

    note.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      move(note, event.clientX - drag.x, event.clientY - drag.y);
      drag.x = event.clientX;
      drag.y = event.clientY;
    });

    note.addEventListener('lostpointercapture', () => {
      drag = undefined;
      note.classList.remove('is-moving');
    });

    note.addEventListener('keydown', event => {
      const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const direction = directions[event.key];
      if (!direction) return;
      event.preventDefault();
      bringForward(note);
      const step = event.shiftKey ? 30 : 10;
      move(note, direction[0] * step, direction[1] * step);
    });
  }

  const reset = section.querySelector('.experience-note-reset');
  reset.hidden = false;
  reset.addEventListener('click', () => {
    for (const note of notes) {
      offsets.delete(note);
      note.style.removeProperty('--note-x');
      note.style.removeProperty('--note-y');
      note.parentElement.style.removeProperty('z-index');
    }
    topLayer = 0;
  });

  new ResizeObserver(() => {
    for (const note of notes) if (offsets.has(note)) move(note, 0, 0);
  }).observe(board);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(entries => {
    for (const { isIntersecting, target } of entries) {
      if (!isIntersecting) continue;
      observer.unobserve(target);
      if (reduced.matches) continue;

      const value = target.querySelector('[data-experience-value]');
      const final = value.textContent;
      const [, number, suffix] = final.match(/^([\d.]+)(.*)$/);
      const decimals = number.split('.')[1]?.length ?? 0;
      value.textContent = (0).toFixed(decimals) + suffix;
      let start;

      function draw(now) {
        start ??= now;
        const progress = Math.min(1, (now - start) / 950);
        if (progress === 1 || reduced.matches) {
          value.textContent = final;
          return;
        }
        const eased = 1 - (1 - progress) ** 3;
        value.textContent = (Number(number) * eased).toFixed(decimals) + suffix;
        requestAnimationFrame(draw);
      }

      requestAnimationFrame(draw);
    }
  }, { threshold: .4 });

  for (const row of section.querySelectorAll('.experience-stats > div')) observer.observe(row);
})();
