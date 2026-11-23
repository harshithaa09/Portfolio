(() => {
  const prefix = document.querySelector('[data-brief-prefix]');
  const word = document.querySelector('[data-brief-word]');
  if (!prefix || !word) {
    document.documentElement.classList.remove('hero-intro-pending');
    return;
  }

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const phrase = prefix.textContent;
  const words = [word.textContent, 'Hooks', 'Taglines', 'Ads', 'Gossip'];
  const letterDelay = 82;
  const delays = [114, 146, 129, 158, 108];
  const frames = [];
  let duration = 0;

  function addFrame(text, hold, complete = false) {
    duration += hold;
    frames.push({ text, until: duration, complete });
  }

  for (const text of words) {
    addFrame('', 150);
    for (let length = 1; length < text.length; length++) {
      addFrame(text.slice(0, length), delays[(length - 1) % delays.length]);
    }
    addFrame(text, 925, true);
    for (let length = text.length - 1; length > 0; length--) {
      addFrame(text.slice(0, length), 73);
    }
  }

  let introPlayed = false;
  let introDuration = 0;
  let start;
  let current;
  let request;

  function tick(now) {
    start ??= now;
    const elapsed = now - start;
    if (elapsed < introDuration) {
      const length = Math.min(phrase.length, Math.floor(elapsed / letterDelay));
      const text = phrase.slice(0, length);
      if (prefix.textContent !== text) prefix.textContent = text;
    } else {
      if (!introPlayed) {
        prefix.textContent = phrase;
        delete prefix.dataset.typing;
        introPlayed = true;
      }
      const position = (elapsed - introDuration) % duration;
      const frame = frames.find(candidate => position < candidate.until);
      if (frame !== current) {
        word.textContent = frame.text;
        word.dataset.typing = frame.complete ? 'complete' : 'active';
        current = frame;
      }
    }
    request = requestAnimationFrame(tick);
  }

  function setMotion() {
    cancelAnimationFrame(request);
    start = undefined;
    current = undefined;
    delete prefix.dataset.typing;
    delete word.dataset.typing;

    if (reduced.matches) {
      introPlayed = true;
      prefix.textContent = phrase;
      word.textContent = words[0];
    } else {
      introDuration = introPlayed ? 0 : phrase.length * letterDelay + 170;
      prefix.textContent = introPlayed ? phrase : '';
      word.textContent = '';
      if (!introPlayed) prefix.dataset.typing = 'active';
      request = requestAnimationFrame(tick);
    }

    document.documentElement.classList.remove('hero-intro-pending');
  }

  reduced.addEventListener('change', setMotion);
  setMotion();
})();
