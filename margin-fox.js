(() => {
  'use strict';

  const fox = document.querySelector('.margin-fox');
  const header = document.querySelector('.site-header');
  const page = document.querySelector('.site-frame');
  const pickup = fox.querySelector('.fox-pickup');
  const intro = document.querySelector('#intro-title');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const platforms = [
    'main h1', 'main h2', 'main h3', 'main img:not(.work-folder-art, .website-screen-image)', '.portfolio-hero-actions', '.about-portrait',
    '.experience-note', '.experience-stats > div', '.web-project-card', '.value-row li',
    '.website-monitor-frame', '.website-directory', '.work-folder-graphic', '.work-tile', '#work-wall', '.contact-links > div',
  ].join(', ');
  let frame = 0;
  let pose;
  let standingOn;
  let flight;
  let tripUntil = 0;
  let shakeUntil = 0;
  let runOffAt = 0;
  let recovering = false;
  let happyRequested = false;
  let routeRequested = false;
  let scrollDistance = 0;
  let previousScroll = scrollY;
  let pointerX;
  let hovered;
  let hoverTimer;
  let hoverGoal;
  let departedFrom;
  let previousTime = 0;
  let carry;
  let placement;
  let press;
  let suppressPickupClick = false;
  let resumeAfterPlacement = 0;
  let patrolDirection = 1;
  let patrolHopAt = 0;
  let gaitPhase = 0;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function schedule() {
    if (!frame && !document.hidden && !document.querySelector('dialog[open]')) {
      frame = requestAnimationFrame(update);
    }
  }

  function startCarry(pointer) {
    if (!pose || carry) return;
    carry = {
      x: pose.x, y: pose.y, origin: { ...pose, platform: standingOn },
      grabX: pointer ? clamp(pointer.clientX - pose.x, 0, fox.offsetWidth) : fox.offsetWidth / 2,
      grabY: pointer ? clamp(pointer.clientY - pose.y, 0, fox.offsetHeight) : fox.offsetHeight / 2,
    };
    flight = standingOn = undefined;
    tripUntil = shakeUntil = runOffAt = 0;
    recovering = happyRequested = routeRequested = false;
    pointerX = hoverGoal = hovered = undefined;
    clearTimeout(hoverTimer);
    pickup.setAttribute('aria-pressed', 'true');
    pickup.setAttribute('aria-label', 'Place fox. Use arrow keys to move or Escape to return.');
    schedule();
  }

  function moveCarry(x, y) {
    if (!carry) return;
    carry.x = x - carry.grabX;
    carry.y = y - carry.grabY;
    schedule();
  }

  function releaseCarry(returnToOrigin = false, fromPointer = false) {
    if (!carry) return;
    placement = returnToOrigin ? carry.origin : { x: carry.x, y: carry.y };
    carry = undefined;
    pickup.setAttribute('aria-pressed', 'false');
    pickup.setAttribute('aria-label', 'Pick up fox');
    if (fromPointer) {
      pickup.blur();
      resumeAfterPlacement = performance.now() + 1400;
    }
    schedule();
  }

  function launch(now, destination, kind) {
    const dy = destination.y - pose.y;
    const dx = destination.x - pose.x;
    const arc = kind === 'happy' ? 25 : Math.max(14, Math.abs(dy) * .27 + 9);
    const duration = kind === 'happy' ? 430
      : kind === 'fall' || kind === 'drop' ? clamp(Math.sqrt(2 * Math.max(1, dy) / 2350) * 1000, 280, 800)
      : clamp(340 + Math.abs(dy) * 1.4 + Math.abs(dx) * .5, 360, 980);
    flight = { from: pose, destination, start: now, arc, duration, kind };
    standingOn = undefined;
    if (Math.abs(dx) > 2) fox.style.setProperty('--fox-facing', dx > 0 ? '-1' : '1');
  }

  function animateRun(distance, width) {
    gaitPhase = (gaitPhase + distance / (width * .46)) % 1;
    const bob = -.018 * (1 - Math.cos(gaitPhase * 4 * Math.PI));
    fox.style.setProperty('--fox-bob', `${bob.toFixed(3)}em`);
    fox.style.setProperty('--fox-tail-wag', `${(12 * Math.sin(gaitPhase * 2 * Math.PI)).toFixed(1)}deg`);
  }

  function update(now) {
    frame = 0;
    const width = fox.offsetWidth;
    const height = fox.offsetHeight;
    const pageBounds = page.getBoundingClientRect();
    const leftEdge = pageBounds.left + 5;
    const rightEdge = pageBounds.right - width - 5;
    const floor = Math.min(innerHeight - pageBounds.left, pageBounds.bottom) - height - 6;
    const top = header.getBoundingClientRect().bottom + 4;
    const walkableX = value => clamp(value, leftEdge, rightEdge);
    const groundAt = x => ({ x: walkableX(x), y: floor });
    const delta = previousTime ? Math.min((now - previousTime) / 1000, .045) : 1 / 60;
    previousTime = now;
    let running = false;
    let landed = false;

    function stepOff() {
      const facingRight = fox.style.getPropertyValue('--fox-facing') === '-1';
      const longFall = floor - pose.y > Math.max(195, innerHeight * .31);
      const drift = (facingRight ? 1 : -1) * Math.min(width * .22, 14);
      launch(now, groundAt(pose.x + drift), longFall ? 'fall' : 'drop');
      patrolHopAt = now + 2300;
    }

    function surface(element, x) {
      if (!element?.isConnected) return null;
      const box = element.getBoundingClientRect();
      const y = box.top - height + 2;
      const folder = element.classList.contains('work-folder-graphic');
      const shortTab = folder && ['campaigns', 'copywriting'].includes(element.parentElement.dataset.category);
      const track = element.closest('#work-wall')?.getBoundingClientRect();
      const left = Math.max(box.left + (folder ? box.width * .09 : 3), track?.left ?? 0);
      const right = Math.min(box.right - (folder ? box.width * (shortTab ? .72 : .62) : 3),
        track?.right ?? innerWidth);
      if (!box.height || left >= right || y < top || y >= floor) return null;
      const foot = clamp(x + width / 2, left, right);
      return { x: walkableX(foot - width / 2), y, platform: element };
    }

    function nearby(descending, toward) {
      let nearest;
      let bestScore = Infinity;
      for (const element of document.querySelectorAll(platforms)) {
        if (element === standingOn || (recovering && element === departedFrom)) continue;
        const option = surface(element, toward?.x ?? pose.x);
        if (!option) continue;
        const dx = Math.abs(option.x - pose.x);
        const dy = option.y - pose.y;
        if (descending && (dy < -45 || dy > 245 || dx > 230 || Math.hypot(dx, dy) < 25)) continue;
        const distance = Math.hypot(option.x - (toward?.x ?? pose.x), option.y - (toward?.y ?? pose.y));
        if (toward && (dx > 200 || Math.abs(dy) > 225 ||
            distance + 15 >= Math.hypot(toward.x - pose.x, toward.y - pose.y))) continue;
        const score = distance + dx * .2;
        if (score < bestScore) {
          nearest = option;
          bestScore = score;
        }
      }
      return nearest;
    }

    function nextFolder() {
      let nearest;
      let bestDistance = Infinity;
      for (const element of document.querySelectorAll('.work-folder-graphic')) {
        if (element === standingOn) continue;
        const candidate = surface(element, pose.x);
        if (!candidate || Math.abs(candidate.y - pose.y) > 210) continue;
        const distance = Math.hypot(candidate.x - pose.x, candidate.y - pose.y);
        const score = distance + (element === departedFrom ? 220 : 0);
        if (distance <= 295 && score < bestDistance) {
          bestDistance = score;
          nearest = candidate;
        }
      }
      return nearest;
    }

    function walkToward(x, support, speed = 105) {
      const dx = x - pose.x;
      if (Math.abs(dx) <= 2) return;
      const nextX = walkableX(pose.x + Math.sign(dx) * Math.min(Math.abs(dx), delta * speed));
      const next = support ? surface(standingOn, nextX) : groundAt(nextX);
      if (!next || Math.abs(next.x - pose.x) < .15) return;
      animateRun(Math.abs(next.x - pose.x), width);
      pose = next;
      fox.style.setProperty('--fox-facing', dx > 0 ? '-1' : '1');
      running = true;
    }

    function patrol(support) {
      const left = support ? surface(standingOn, leftEdge).x : leftEdge;
      const right = support ? surface(standingOn, rightEdge).x : rightEdge;
      if (right - left < 14) {
        launch(now, support ?? groundAt(pose.x), 'hop');
        return;
      }
      if (pose.x >= right - 3) patrolDirection = -1;
      if (pose.x <= left + 3) patrolDirection = 1;
      walkToward(patrolDirection > 0 ? right : left, support, 62);
    }

    if (!pose) {
      const heading = intro.getBoundingClientRect();
      pose = surface(intro, heading.left + heading.width * .6 - width / 2)
        ?? groundAt(innerWidth * .73);
      standingOn = pose.platform;
      patrolHopAt = now + 1400;
    }

    if (carry) {
      pose = { x: walkableX(carry.x), y: clamp(carry.y, top, floor) };
    } else if (placement) {
      const placed = placement;
      placement = undefined;
      pose = { x: walkableX(placed.x), y: clamp(placed.y, top, floor) };
      let landing = surface(placed.platform, pose.x);
      if (!landing) {
        landing = groundAt(pose.x);
        for (const element of document.querySelectorAll(platforms)) {
          const target = surface(element, pose.x);
          if (target && Math.abs(target.x - pose.x) <= 5 && target.y >= pose.y - 10 && target.y < landing.y) {
            landing = target;
          }
        }
      }
      if (reducedMotion.matches || Math.abs(landing.y - pose.y) <= 4) {
        pose = landing;
        standingOn = landing.platform;
        if (!reducedMotion.matches && standingOn && !standingOn.matches('h1, h2, h3')) runOffAt = now + 780;
      } else {
        launch(now, landing, landing.y >= pose.y ? 'drop' : 'hop');
      }
    } else if (reducedMotion.matches) {
      pose = surface(standingOn, pose.x) ?? groundAt(innerWidth - width - 12);
      flight = undefined;
      tripUntil = shakeUntil = runOffAt = 0;
      routeRequested = happyRequested = recovering = false;
    } else if (flight) {
      const { start, from, destination, arc, duration, kind } = flight;
      const t = clamp((now - start) / duration, 0, 1);
      const landing = destination.platform ? surface(destination.platform, destination.x) : groundAt(destination.x);
      if (destination.platform && !landing && kind !== 'happy') {
        if (Math.abs(pose.y - floor) <= 2) {
          flight = undefined;
          patrolHopAt = now + 900;
        } else {
          stepOff();
        }
      } else {
        const end = kind === 'happy' ? destination : landing ?? destination;
        const falling = kind === 'fall';
        const dropping = falling || kind === 'drop';
        const gravityProgress = t * t;
        pose = {
          x: from.x + (end.x - from.x) * (dropping ? 1 - (1 - t) ** 2 : t),
          y: Math.max(top, from.y + (end.y - from.y) * (dropping ? gravityProgress : t)
            - (dropping ? 0 : 4 * arc * t * (1 - t))),
        };
        if (falling) {
          const tilt = 90 * (t * t * (3 - 2 * t));
          const lift = -.13 * width * Math.sin(tilt * Math.PI / 180);
          fox.style.setProperty('--fox-tumble', `${tilt.toFixed(2)}deg`);
          fox.style.setProperty('--fox-impact-lift', `${lift.toFixed(2)}px`);
        }
        if (t === 1) {
          standingOn = landing?.platform;
          if (landing && !standingOn) {
            runOffAt = 0;
            patrolHopAt = now + 1200;
          }
          flight = undefined;
          landed = true;
          if (falling) {
            tripUntil = now + 700;
            shakeUntil = tripUntil + 620;
            recovering = true;
          } else if (!landing || (kind === 'happy' && !standingOn && Math.abs(pose.y - floor) > 2)) {
            routeRequested = true;
          } else if (kind !== 'happy' && standingOn && !standingOn.matches('h1, h2, h3')) {
            runOffAt = now + 780;
          }
        }
      }
    } else if (now >= shakeUntil) {
      const support = surface(standingOn, pose.x);
      if (support) pose = support;
      const onGround = Math.abs(pose.y - floor) <= 2;

      const waitingForPickup = now >= resumeAfterPlacement && pickup.matches(':hover, :focus-visible') && (support || onGround)
        && !happyRequested && !routeRequested && !recovering;
      if (happyRequested) {
        happyRequested = false;
        launch(now, support ?? (onGround ? groundAt(pose.x) : { ...pose }), 'happy');
      } else if (recovering) {
        const next = nearby(false) ?? surface(departedFrom, pose.x);
        recovering = false;
        routeRequested = false;
        if (next && Math.abs(next.y - floor) > 4) launch(now, next, 'hop');
      } else if (!waitingForPickup && !onGround && (!support || (routeRequested && support.y < top + 105))) {
        routeRequested = false;
        const next = nearby(true);
        if (next) {
          departedFrom = standingOn;
          runOffAt = 0;
          launch(now, next, 'hop');
        } else if (!support) {
          departedFrom = standingOn;
          runOffAt = 0;
          stepOff();
        }
      } else if (!waitingForPickup && hoverGoal && hoverGoal !== standingOn) {
        const target = surface(hoverGoal, (pointerX ?? pose.x) - width / 2);
        if (target && Math.abs(target.x - pose.x) <= 200 && Math.abs(target.y - pose.y) <= 250) {
          hoverGoal = undefined;
          runOffAt = 0;
          launch(now, target, 'hop');
        } else if (target) {
          const step = nearby(false, target);
          if (step) {
            runOffAt = 0;
            launch(now, step, 'hop');
          } else {
            walkToward(target.x, support);
            if (!running) hoverGoal = undefined;
          }
        } else {
          hoverGoal = undefined;
        }
      } else if (!waitingForPickup && support && runOffAt) {
        const right = pose.x > innerWidth / 2;
        if (now < runOffAt) {
          patrol(support);
        } else {
          runOffAt = 0;
          const next = standingOn.classList.contains('work-folder-graphic') ? nextFolder() : null;
          if (next) {
            departedFrom = standingOn;
            launch(now, next, 'hop');
          } else {
            launch(now, groundAt(pose.x + (right ? .65 : -.65) * width), 'drop');
          }
        }
      } else if (!waitingForPickup && onGround) {
        if (routeRequested || now >= patrolHopAt) {
          const next = nearby(false);
          patrolHopAt = now + 1700;
          if (next && next.y <= floor - 18 && floor - next.y <= 250 && Math.abs(next.x - pose.x) <= 175) {
            launch(now, next, 'hop');
          }
        }
        if (!flight && pointerX !== undefined) {
          walkToward(walkableX(pointerX - width / 2), null);
          if (!running) pointerX = undefined;
        }
      } else if (!waitingForPickup && support && pointerX !== undefined && hoverGoal === standingOn) {
        walkToward(walkableX(pointerX - width / 2), support);
        if (!running) pointerX = hoverGoal = undefined;
      }

      if (!waitingForPickup && !flight && !running && !hoverGoal && (support || onGround)) patrol(support);
      routeRequested = false;
    }

    const tripped = now < tripUntil;
    const shaking = !tripped && now < shakeUntil;
    fox.style.setProperty('--fox-x', `${pose.x.toFixed(1)}px`);
    fox.style.setProperty('--fox-y', `${pose.y.toFixed(1)}px`);
    fox.classList.toggle('is-running', running);
    fox.classList.toggle('is-airborne', Boolean(flight));
    fox.classList.toggle('is-jumping', flight?.kind === 'hop');
    fox.classList.toggle('is-happy', flight?.kind === 'happy');
    fox.classList.toggle('is-falling', flight?.kind === 'fall');
    fox.classList.toggle('is-tripped', tripped);
    fox.classList.toggle('is-shaking', shaking);
    fox.classList.toggle('is-carried', Boolean(carry));

    if ((!carry && !reducedMotion.matches) || landed) schedule();
    else previousTime = 0;
  }

  pickup.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    const started = !carry;
    if (started) startCarry(event);
    press = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, started };
    pickup.setPointerCapture(event.pointerId);
  });

  pickup.addEventListener('pointerup', event => {
    if (press?.id !== event.pointerId) return;
    if (press.moved) {
      moveCarry(event.clientX, event.clientY);
      releaseCarry(false, true);
    }
    if (press.moved || press.started) {
      suppressPickupClick = true;
      setTimeout(() => { suppressPickupClick = false; }, 120);
    }
    press = undefined;
  });

  pickup.addEventListener('pointercancel', () => {
    if (press?.moved || press?.started) releaseCarry(true);
    press = undefined;
  });

  addEventListener('pointermove', event => {
    if (press?.id === event.pointerId &&
        (press.moved || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 5)) {
      press.moved = true;
    }
    if (carry) {
      moveCarry(event.clientX, event.clientY);
      return;
    }
    if (event.pointerType !== 'mouse' || reducedMotion.matches || event.target.closest?.('dialog')) return;
    pointerX = event.clientX;
    const platform = event.target.closest?.(platforms)
      ?? event.target.closest?.('.work-folder')?.querySelector('.work-folder-graphic');
    if (platform !== hovered) {
      hovered = platform;
      hoverGoal = undefined;
      clearTimeout(hoverTimer);
      if (platform) hoverTimer = setTimeout(() => {
        hoverGoal = platform;
        schedule();
      }, 440);
    }
    schedule();
  }, { passive: true });

  addEventListener('click', event => {
    const isFox = pickup.contains(event.target);
    if (isFox && suppressPickupClick) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (carry || isFox) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (carry) {
        if (!isFox && event.detail) moveCarry(event.clientX, event.clientY);
        releaseCarry(false, Boolean(event.detail));
      } else {
        startCarry(event.detail ? event : undefined);
      }
      return;
    }
    if (reducedMotion.matches || event.target.closest?.('dialog')) return;
    clearTimeout(hoverTimer);
    pointerX = hoverGoal = undefined;
    happyRequested = true;
    schedule();
  }, { capture: true });

  addEventListener('keydown', event => {
    if (!carry) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      releaseCarry(true);
      return;
    }
    if (event.target !== pickup) return;
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    event.stopPropagation();
    const distance = event.shiftKey ? 44 : 16;
    const bounds = page.getBoundingClientRect();
    carry.x = clamp(carry.x + direction[0] * distance, bounds.left + 5, bounds.right - fox.offsetWidth - 5);
    carry.y = clamp(carry.y + direction[1] * distance, header.getBoundingClientRect().bottom + 4,
      Math.min(innerHeight - bounds.left, bounds.bottom) - fox.offsetHeight - 6);
    schedule();
  });

  addEventListener('scroll', () => {
    clearTimeout(hoverTimer);
    pointerX = hovered = hoverGoal = undefined;
    scrollDistance += Math.abs(scrollY - previousScroll);
    previousScroll = scrollY;
    if (!carry && scrollDistance >= 48) {
      routeRequested = true;
      scrollDistance = 0;
    }
    schedule();
  }, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  reducedMotion.addEventListener('change', schedule);
  document.addEventListener('visibilitychange', () => {
    previousTime = 0;
    schedule();
  });
  document.addEventListener('close', schedule, true);
  schedule();
})();
