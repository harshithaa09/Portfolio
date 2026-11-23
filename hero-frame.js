(() => {
  'use strict';
  const hero = document.querySelector('.recruiter-hero');
  if (!hero) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const rotation = hero.querySelector('.recruiter-rotation');
  const line = hero.querySelector('.recruiter-line');
  const caption = hero.querySelector('.recruiter-caption');
  const pager = hero.querySelector('.recruiter-pager');
  const stop = hero.querySelector('.recruiter-pause');
  const dots = [...hero.querySelectorAll('.recruiter-dot')];
  const samples = [
    'Swipe right on career, not on Blinder.',
    "Adulting is hard. JOBS shouldn't be.",
    'Tension nahi lene ka… bas apply karne ka!',
    'Keep calm and eat one more modak (or ten).'
  ];
  let active = 0;
  let timer;
  let fade;
  let paused = false;
  let hovered = false;
  let focused = false;

  const show = index => {
    active = index;
    line.textContent = samples[index];
    caption.textContent = index === 3
      ? 'Line I wrote for a Ganesh Chaturthi greeting'
      : 'Line I wrote for a BFSI recruitment ad';
    dots.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
    fade?.cancel();
    if (!motion.matches && line.animate) {
      fade = line.animate([{opacity:.25,transform:'translateY(4px)'},{opacity:1,transform:'none'}], {
        duration:320,easing:'ease-out'
      });
    }
  };
  const schedule = () => {
    clearTimeout(timer);
    if (motion.matches || paused || hovered || focused || document.hidden) return;
    timer = setTimeout(() => {
      show((active + 1) % samples.length);
      schedule();
    },3500);
  };
  dots.forEach((button,index) => button.addEventListener('click',() => { show(index); schedule(); }));
  stop.addEventListener('click',() => {
    paused = !paused;
    stop.setAttribute('aria-pressed',String(paused));
    stop.setAttribute('aria-label',paused ? 'Resume headline rotation' : 'Pause headline rotation');
    stop.querySelector('span').textContent = paused ? '▶' : 'Ⅱ';
    schedule();
  });
  rotation.addEventListener('pointerenter',event => { if (event.pointerType === 'mouse') { hovered = true; schedule(); } });
  rotation.addEventListener('pointerleave',() => { hovered = false; schedule(); });
  rotation.addEventListener('focusin',() => { focused = true; schedule(); });
  rotation.addEventListener('focusout',() => queueMicrotask(() => { focused = rotation.contains(document.activeElement); schedule(); }));
  document.addEventListener('visibilitychange',schedule);
  motion.addEventListener('change',() => {
    stop.hidden = motion.matches;
    if (motion.matches) show(0);
    schedule();
  });
  pager.hidden = false;
  stop.hidden = motion.matches;
  schedule();

  const stats = hero.querySelector('.recruiter-stats');
  const numbers = [...stats.querySelectorAll('[data-stat]')].map(el => {
    const final = el.textContent;
    const [value,suffix] = final.match(/^[0-9.]+|[^0-9.]+$/g);
    return {el,final,value:Number(value),suffix:suffix || '',decimals:(value.split('.')[1] || '').length};
  });
  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    if (motion.matches) return;
    let start;
    const tick = now => {
      start ??= now;
      const t = Math.min(1,(now-start)/950);
      const done = t === 1 || motion.matches;
      numbers.forEach(({el,final,value,suffix,decimals}) => {
        el.textContent = done ? final : (value * (1-Math.pow(1-t,3))).toFixed(decimals) + suffix;
      });
      if (!done) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },{threshold:.25});
  observer.observe(stats);
})();
