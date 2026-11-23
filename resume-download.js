(() => {
  'use strict';

  const resume = document.querySelector('.contact-resume');
  const feedback = document.querySelector('.resume-feedback');
  let busy = false;
  let messageTimer;

  function showMessage(message) {
    clearTimeout(messageTimer);
    feedback.textContent = message;
    messageTimer = setTimeout(() => { feedback.textContent = ''; }, 4500);
  }

  resume.addEventListener('click', async event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (busy) return;
    busy = true;
    feedback.textContent = '';
    clearTimeout(messageTimer);

    try {
      const response = await fetch(resume.href);
      if (!response.ok) throw new Error('Resume unavailable');
      const url = URL.createObjectURL(await response.blob());
      const download = document.createElement('a');
      download.href = url;
      download.download = resume.download;
      document.body.append(download);
      download.click();
      download.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);

      showMessage('Résumé downloaded');
    } catch {
      showMessage('Couldn’t download the résumé. Please try again.');
    } finally {
      busy = false;
    }
  });
})();
