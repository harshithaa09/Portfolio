(() => {
  'use strict';

  const section = document.getElementById('website-content');
  const choices = [...section.querySelectorAll('.website-choice')];
  const title = section.querySelector('.website-screen-title');
  const image = section.querySelector('.website-screen-image');
  const link = section.querySelector('.website-live-link');
  let selected = choices[0];

  for (const choice of choices) {
    choice.addEventListener('click', () => {
      if (choice === selected) return;
      selected.setAttribute('aria-pressed', 'false');
      selected = choice;
      choice.setAttribute('aria-pressed', 'true');

      const name = choice.textContent.trim();
      title.textContent = name;
      image.alt = `Screenshot of ${name}`;
      image.src = choice.dataset.preview;
      link.href = choice.dataset.url;
      link.setAttribute('aria-label', `Visit the ${name} site (opens in a new tab)`);
    });
  }
})();
