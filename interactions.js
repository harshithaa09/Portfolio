(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('.site-header');
  function headerOffset() {
    if (!header) return 0;
    return header.getBoundingClientRect().height + (parseFloat(getComputedStyle(header).top) || 0);
  }
  if (header) {
    const measureHeader = () => {
      document.documentElement.style.setProperty('--header-height', headerOffset() + 'px');
    };
    measureHeader();
    if ('ResizeObserver' in window) new ResizeObserver(measureHeader).observe(header);
  }
  const links = [...(header?.querySelectorAll('nav a[href^="#"]') ?? [])];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  let queued = false;

  function markActiveSection() {
    queued = false;
    const headerBottom = header?.getBoundingClientRect().bottom ?? 0;
    const active = sections.findLastIndex(section => section && section.getBoundingClientRect().top <= headerBottom + 4);
    links.forEach((link, i) => {
      if (i === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function queueSectionUpdate() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(markActiveSection);
  }

  window.addEventListener('scroll', queueSectionUpdate, { passive: true });
  window.addEventListener('resize', queueSectionUpdate);
  window.addEventListener('pageshow', queueSectionUpdate);
  queueSectionUpdate();

  let sectionScroll;
  function stopSectionScroll() {
    cancelAnimationFrame(sectionScroll);
  }

  function scrollToSection(top, animate) {
    stopSectionScroll();
    const from = window.scrollY;
    const distance = top - from;
    if (!animate || reduced.matches || Math.abs(distance) < 2) {
      window.scrollTo({ top, behavior: 'instant' });
      return;
    }

    const duration = Math.min(1150, 760 + Math.abs(distance) * .13);
    let start;
    function move(now) {
      start ??= now;
      const time = Math.min((now - start) / duration, 1);
      const eased = time * time * (3 - 2 * time);
      window.scrollTo({ top: from + distance * eased, behavior: 'instant' });
      if (time < 1) sectionScroll = requestAnimationFrame(move);
    }
    sectionScroll = requestAnimationFrame(move);
  }

  for (const event of ['wheel', 'touchstart', 'pointerdown', 'popstate']) {
    window.addEventListener(event, stopSectionScroll, { passive: true });
  }
  window.addEventListener('keydown', event => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
      stopSectionScroll();
    }
  });

  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    event.preventDefault();
    const headerHeight = headerOffset();
    scrollToSection(scrollY + target.getBoundingClientRect().top - headerHeight, !link.classList.contains('skip'));
    history.pushState({ portfolioSection: true }, '', url.hash);
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex','-1');
      target.addEventListener('blur',() => target.removeAttribute('tabindex'),{once:true});
    }
    target.focus({preventScroll:true});
  });

  const pageFrame = document.querySelector('.site-frame');
  let touchPull;
  let wheelPull = 0;
  let wheelRelease;
  let wheelBurst = false;
  let lastBurst = -Infinity;

  let pullShift = 0;

  function pullFrame(distance) {
    if (!pageFrame || reduced.matches) return;
    pullShift = 48 * (1 - Math.exp(-distance / 140));
    pageFrame.style.translate = `0 ${pullShift.toFixed(2)}px`;
  }

  function releaseFrame() {
    if (!pullShift) return;
    const from = pullShift;
    pullShift = 0;
    pageFrame.style.translate = '';
    // Damped spring: a quick snap back past the top, one small rebound, then rest.
    const wn = 30, zeta = .45, wd = wn * Math.sqrt(1 - zeta * zeta), duration = 360;
    const frames = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18 * duration / 1000;
      const y = i === 18 ? 0 : from * Math.exp(-zeta * wn * t) * Math.cos(wd * t);
      frames.push({ translate: `0 ${y.toFixed(2)}px` });
    }
    pageFrame.animate(frames, { duration, easing: 'linear' });
  }

  function dropPetals() {
    const now = performance.now();
    if (reduced.matches || scrollY > 2 || now - lastBurst < 350) return false;
    lastBurst = now;

    const burst = document.createElement('div');
    burst.className = 'sakura-burst';
    burst.setAttribute('aria-hidden', 'true');
    const roof = Math.max(0, (header?.getBoundingClientRect().bottom ?? 48) - 9);
    burst.style.setProperty('--petal-roof', `${roof}px`);
    const count = innerWidth < 640 ? 64 : 84;
    for (let i = 0; i < count; i++) {
      const petal = document.createElement('i');
      petal.className = 'sakura-petal';
      petal.style.setProperty('--petal-start', `${3 + 94 * i / (count - 1)}%`);
      petal.style.setProperty('--petal-size', `${8 + i % 5 * 2}px`);
      petal.style.setProperty('--petal-time', `${1680 + i % 6 * 112}ms`);
      petal.style.setProperty('--petal-delay', `${i % 13 * 22}ms`);
      petal.style.setProperty('--petal-angle', `${i * 49 % 360}deg`);
      petal.style.setProperty('--petal-drift', `${(i % 11 - 5) * 10}px`);
      petal.style.setProperty('--petal-sway', `${(i % 2 ? -1 : 1) * (9 + i % 6 * 3)}px`);
      burst.append(petal);
    }
    document.body.append(burst);
    setTimeout(() => burst.remove(), 2600);
    return true;
  }

  addEventListener('touchstart', event => {
    touchPull = scrollY <= 2 && event.touches.length === 1 &&
      !event.target.closest('dialog, .fox-pickup, .experience-note-grip')
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY, fired: false } : undefined;
  }, { passive: true });
  addEventListener('touchmove', event => {
    if (!touchPull || event.touches.length !== 1) return;
    const point = event.touches[0];
    if (scrollY > 2 || Math.abs(point.clientX - touchPull.x) > 35) {
      touchPull = undefined;
      releaseFrame();
      return;
    }
    const distance = point.clientY - touchPull.y;
    pullFrame(Math.max(0, distance));
    if (!touchPull.fired && distance >= 12) touchPull.fired = dropPetals();
  }, { passive: true });
  function finishPull() { touchPull = undefined; releaseFrame(); }
  addEventListener('touchend', finishPull, { passive: true });
  addEventListener('touchcancel', finishPull, { passive: true });

  addEventListener('wheel', event => {
    clearTimeout(wheelRelease);
    if (scrollY > 2 || event.deltaY >= 0 || event.ctrlKey || event.target.closest('dialog')) {
      wheelPull = 0;
      wheelBurst = false;
      releaseFrame();
      return;
    }
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    wheelPull -= event.deltaY * unit;
    pullFrame(wheelPull);
    if (!wheelBurst && wheelPull >= 12) wheelBurst = dropPetals();
    wheelRelease = setTimeout(() => {
      wheelPull = 0;
      wheelBurst = false;
      releaseFrame();
    }, 50);
  }, { passive: true });

  const metrics = document.querySelector('.metrics');
  if (metrics && !reduced.matches && 'IntersectionObserver' in window) {
    const numbers = [...metrics.querySelectorAll('dt')].map(el => {
      const final = el.textContent.trim(), match = final.match(/^([\d.]+)(.*)$/);
      el.setAttribute('aria-label', final);
      const span = document.createElement('span'); span.setAttribute('aria-hidden','true'); span.textContent='0'+match[2]; el.replaceChildren(span);
      return {span, final, value:Number(match[1]), decimals:(match[1].split('.')[1]||'').length, suffix:match[2]};
    });
    const observer = new IntersectionObserver(entries => {
      if(!entries.some(entry=>entry.isIntersecting)) return;
      observer.disconnect(); const start=performance.now();
      function count(now) {
        const t=Math.min(1,(now-start)/2100), eased=1-Math.pow(1-t,3);
        numbers.forEach(n=>n.span.textContent=t===1?n.final:(n.value*eased).toFixed(n.decimals)+n.suffix);
        if(t<1) requestAnimationFrame(count);
      }
      requestAnimationFrame(count);
    },{threshold:.25});
    observer.observe(metrics);
  }

  document.querySelectorAll('.work-category').forEach((category, categoryIndex) => {
    const gallery=category.querySelector('.category-gallery');
    const slides=[...gallery.querySelectorAll('.category-piece')];
    if(slides.length<2) return;
    const name=category.querySelector('.category-name').textContent;
    gallery.classList.add('is-carousel'); gallery.setAttribute('role','region'); gallery.setAttribute('aria-roledescription','carousel'); gallery.setAttribute('aria-label',name+' slideshow');
    const viewport=document.createElement('div'); viewport.className='carousel-window';
    const track=document.createElement('div'); track.className='carousel-track'; track.id='carousel-'+categoryIndex;
    slides.forEach((slide,i)=>{slide.setAttribute('role','group');slide.setAttribute('aria-roledescription','slide');slide.setAttribute('aria-label',`${i+1} of ${slides.length}`);track.append(slide);});
    const makeEdgePreview = slide => {
      const preview = slide.cloneNode(true);
      preview.inert = true;
      preview.setAttribute('aria-hidden', 'true');
      preview.classList.add('carousel-edge');
      return preview;
    };
    track.prepend(makeEdgePreview(slides.at(-1)));
    track.append(makeEdgePreview(slides[0]));
    viewport.append(track); gallery.append(viewport);
    const controls=document.createElement('div');controls.className='carousel-controls';
    const button=(label,text)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label',label);b.setAttribute('aria-controls',track.id);b.textContent=text;return b;};
    const previous=button('Previous '+name+' slide','←');
    previous.className = 'carousel-previous';
    const status=document.createElement('span'); status.className='carousel-position';status.setAttribute('aria-live','off');controls.append(status);
    const next=button('Next '+name+' slide','→');
    next.className = 'carousel-next';
    gallery.append(previous, next, controls);
    let index=0,timer=0,manuallyNavigated=false,hover=false,focused=false,inView=false;
    let wrapTimer;
    const positionTrack = position => {
      track.style.transform = `translate3d(${-position * 100}%,0,0)`;
    };
    const update = () => {
      slides.forEach((slide, i) => {
        slide.inert = i !== index;
        slide.setAttribute('aria-hidden', String(i !== index));
      });
      status.textContent = `${index + 1} / ${slides.length}`;
    };
    const finishWrap = () => {
      if (wrapTimer === undefined) return;
      clearTimeout(wrapTimer);
      wrapTimer = undefined;
      track.classList.add('is-resetting');
      positionTrack(index + 1);
      track.getBoundingClientRect();
      track.classList.remove('is-resetting');
      track.classList.remove('is-wrapping');
    };
    const schedule = () => {
      clearTimeout(timer);
      if (category.open && inView && !manuallyNavigated && !reduced.matches && !hover && !focused && !document.hidden && !document.querySelector('dialog[open]')) {
        timer = setTimeout(() => { if (!document.querySelector('dialog[open]')) move(1); }, 2000);
      }
    };
    const move = direction => {
      finishWrap();
      const destination = index + direction;
      index = (destination + slides.length) % slides.length;
      update();
      if (destination !== index && !reduced.matches) {
        track.classList.add('is-wrapping');
        positionTrack(destination + 1);
        wrapTimer = setTimeout(finishWrap, 480);
      } else {
        positionTrack(index + 1);
      }
      schedule();
    };
    track.addEventListener('transitionend', event => {
      if (event.target === track && event.propertyName === 'transform') finishWrap();
    });
    const navigate = direction => {
      manuallyNavigated = true;
      move(direction);
    };
    previous.addEventListener('click', () => navigate(-1));
    next.addEventListener('click', () => navigate(1));
    gallery.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();navigate(event.key==='ArrowLeft'?-1:1);}});
    gallery.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){hover=true;schedule();}});
    gallery.addEventListener('pointerleave',()=>{hover=false;schedule();});
    gallery.addEventListener('focusin',()=>{focused=true;schedule();});
    gallery.addEventListener('focusout',()=>{queueMicrotask(()=>{focused=gallery.contains(document.activeElement);schedule();});});
    let touchX=null;
    viewport.addEventListener('touchstart',e=>{touchX=e.touches[0].clientX;},{passive:true});
    viewport.addEventListener('touchend',e=>{if(touchX!==null){const delta=e.changedTouches[0].clientX-touchX;if(Math.abs(delta)>50)navigate(delta<0?1:-1);touchX=null;}},{passive:true});
    category.addEventListener('toggle',schedule);document.addEventListener('visibilitychange',schedule);
    document.getElementById('creativePreview')?.addEventListener('close',schedule);
    reduced.addEventListener('change',schedule);
    new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;schedule();},{threshold:.15}).observe(gallery);
    positionTrack(index + 1);
    update();schedule();
  });
})();
