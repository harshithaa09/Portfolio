(() => {
  'use strict';
  const writing = {
    2: {
      copy: 'Fumbled in your last interview?',
      idea: 'Open with an awkward moment many jobseekers recognise.',
      approach: 'The conversational “fumbled” makes the question feel human. The follow-up offers quick videos about what the role actually demands.'
    },
    3: {
      copy: 'Your 2036 workforce is being shaped today.',
      idea: 'Use a year in the future to make a board-level question feel immediate.',
      approach: 'The contrast between “2036” and “today” gives the invitation a point of tension. A direct question then asks board members to consider their own role.'
    },
    6: {
      copy: 'Adulting is hard. Jobs shouldn’t be.',
      idea: 'Use a familiar joke about adult life to introduce a recruitment ad.',
      approach: 'The second sentence flips the setup into reassurance. The large “JOBS” and sticker-like “shouldn’t be” make the punchline easy to spot.'
    },
    20: {
      copy: 'Simplify Staffing\nAmplify Business',
      idea: 'Contrast a tangled staffing journey with a simpler route.',
      approach: '“Simplify” and “amplify” rhyme and mirror one another. The two paths make that contrast visible before the reader reaches the line.'
    },
    21: {
      copy: 'Before AI could predict your behaviour…\nYour sibling already knew:',
      idea: 'Compare AI prediction with how well siblings know one another.',
      approach: 'Everyday examples make the AI comparison personal. “No algorithm. No data training. Just 15 years of observation.” extends the joke into the festival greeting.'
    }
  };

  const dialog = document.querySelector('#creativePreview');
  if (!dialog?.showModal) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover:hover) and (pointer:fine)');
  const title = dialog.querySelector('#wall-preview-title');
  const category = dialog.querySelector('.wall-preview-category');
  const picture = dialog.querySelector('.wall-preview-image');
  const counter = dialog.querySelector('.wall-preview-position');
  const original = dialog.querySelector('.wall-original');
  const writingPanel = dialog.querySelector('.wall-writing');
  const copy = dialog.querySelector('.wall-copy');
  const idea = dialog.querySelector('.wall-idea');
  const approach = dialog.querySelector('.wall-approach');

  const groups = new Map();
  const projectsById = new Map();
  document.querySelectorAll('#work .work-category').forEach(section => {
    const label = section.querySelector('.category-name').textContent;
    const projects = [...section.querySelectorAll('.category-piece:not(.carousel-edge)')].map(piece => {
      const link = piece.querySelector('.category-image');
      const thumb = link.querySelector('img');
      const id = piece.dataset.assetId;
      const project = {
        id, category: label, title: piece.querySelector('h3').textContent,
        url: link.href, thumbnail: thumb.src, alt: thumb.alt,
        document: new URL(link.href).pathname.toLowerCase().endsWith('.pdf'), writing: writing[id]
      };
      projectsById.set(id, project);
      const overlay = document.createElement('span');
      overlay.className = 'work-project-label';
      const name = document.createElement('strong');
      name.textContent = project.title;
      const categoryText = document.createElement('small');
      categoryText.textContent = project.category;
      overlay.append(name, categoryText);
      if (project.writing) {
        const insight = document.createElement('span');
        insight.textContent = project.writing.idea;
        overlay.append(insight);
      }
      const prompt = document.createElement('span');
      prompt.textContent = 'View project';
      prompt.className = 'work-preview-prompt';
      overlay.append(prompt);
      overlay.setAttribute('aria-hidden', 'true');
      link.append(overlay);
      piece.querySelector('h3').hidden = false;
      return project;
    });
    groups.set(section, projects);
  });

  const heroCards = [...document.querySelectorAll('#top .wall-card')];
  const featured = heroCards.map(card => {
    const project = projectsById.get(card.dataset.projectId);
    if (!card.dataset.heroIdea) return project;
    return {...project, writing:{
      copy: card.dataset.heroCopy,
      idea: card.dataset.heroIdea,
      approach: card.dataset.heroApproach
    }};
  });
  heroCards.forEach((card, index) => {
    if (card.closest('.hero-mini-collage')) return;
    const note = featured[index]?.writing;
    if (!note) return;
    const detail = document.createElement('small');
    detail.textContent = note.idea;
    card.querySelector('.wall-label').insertBefore(detail, card.querySelector('.wall-label > span'));
  });

  let active = 0;
  let projects = [];
  let opener;
  let revealed;
  let pointerType;
  let swipe;
  let transition;
  const reveal = card => {
    revealed?.classList.remove('is-revealed');
    revealed = card;
    revealed?.classList.add('is-revealed');
  };
  const show = index => {
    active = (index + projects.length) % projects.length;
    const project = projects[active];
    title.textContent = project.title;
    category.textContent = project.category;
    picture.alt = project.alt || project.title;
    picture.src = project.document ? project.thumbnail : project.url;
    original.href = project.url;
    original.textContent = project.document ? 'Open original PDF (new tab)' : 'Open original image (new tab)';
    counter.textContent = (active + 1) + ' / ' + projects.length;
    writingPanel.hidden = !project.writing;
    copy.textContent = project.writing?.copy || '';
    idea.textContent = project.writing?.idea || '';
    approach.textContent = project.writing?.approach || '';
    dialog.scrollTop = 0;
    if (!reducedMotion.matches && picture.animate) {
      transition?.cancel();
      transition = picture.animate([{opacity:.35},{opacity:1}], {duration:220,easing:'ease-out'});
    }
  };

  document.addEventListener('pointerdown', event => {
    pointerType = event.pointerType;
    if (revealed && !revealed.contains(event.target)) reveal(undefined);
  });
  document.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('#top .wall-card, #work .category-piece a');
    if (!link || link.closest('.carousel-edge')) return;
    const heroCard = link.matches('.wall-card');
    const piece = link.closest('.category-piece');
    const choices = heroCard ? featured : groups.get(piece.closest('.work-category'));
    const id = heroCard ? link.dataset.projectId : piece.dataset.assetId;
    const index = choices?.findIndex(project => project.id === id) ?? -1;
    if (index < 0) return;
    event.preventDefault();
    if (heroCard && !link.closest('.hero-mini-collage') && event.detail > 0 && (pointerType === 'touch' || !finePointer.matches) && revealed !== link) {
      reveal(link);
      return;
    }
    reveal(undefined);
    opener = link;
    projects = choices;
    show(index);
    dialog.showModal();
    document.body.classList.add('preview-open');
  });
  dialog.querySelector('.wall-prev').addEventListener('click', () => show(active - 1));
  dialog.querySelector('.wall-next').addEventListener('click', () => show(active + 1));
  dialog.querySelector('.wall-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    document.body.classList.remove('preview-open');
    opener?.focus({preventScroll: true});
    picture.removeAttribute('src');
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(active + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  const stage = dialog.querySelector('.wall-preview-stage');
  stage.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') swipe = {x:event.clientX,y:event.clientY,id:event.pointerId};
  });
  stage.addEventListener('pointercancel', () => { swipe = undefined; });
  stage.addEventListener('pointerup', event => {
    if (!swipe || swipe.id !== event.pointerId) return;
    const x = event.clientX - swipe.x;
    const y = event.clientY - swipe.y;
    if (Math.abs(x) >= 40 && Math.abs(x) > Math.abs(y)) show(active + (x < 0 ? 1 : -1));
    swipe = undefined;
  });
})();
