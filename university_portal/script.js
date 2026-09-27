const ENROLL_STORE_KEY = 'nabha-learning-hub-enrollments';

const TRACK_LABELS = {
  primary: 'Primary (Grades 1-5)',
  middle: 'Middle (Grades 6-8)',
  career: 'Career (Grades 9-12)'
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-scroll-to]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.querySelector(button.dataset.scrollTo);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  const modal = document.getElementById('enrollModal');
  if (!modal) return;

  const form = document.getElementById('enrollForm');
  const panels = Array.from(form.querySelectorAll('[data-step-panel]'));
  const steps = Array.from(form.querySelectorAll('[data-step-dot]'));
  const backBtn = document.getElementById('enrollBack');
  const nextBtn = document.getElementById('enrollNext');
  const submitBtn = document.getElementById('enrollSubmit');
  const againBtn = document.getElementById('enrollAgain');
  const doneLine = document.getElementById('doneLine');
  const doneMeta = document.getElementById('doneMeta');

  let step = 1;
  const lastStep = panels.length;

  const rules = {
    fullName: () => (read('fullName').trim().length >= 3 ? '' : 'Enter the student full name.'),
    grade: () => (read('grade') ? '' : 'Select the current class.'),
    village: () => (read('village').trim().length >= 2 ? '' : 'Enter the village or town.'),
    mobile: () =>
      /^[6-9]\d{9}$/.test(read('mobile').replace(/\D/g, ''))
        ? ''
        : 'Enter a 10-digit mobile number.',
    guardian: () =>
      read('guardian').trim().length >= 3 ? '' : 'Enter the parent or guardian name.',
    track: () => (read('track') ? '' : 'Choose a learning track.'),
    device: () => (read('device') ? '' : 'Select how the student will study.'),
    language: () => (read('language') ? '' : 'Select a preferred language.'),
    consent: () =>
      form.elements.consent.checked ? '' : 'Parent or guardian consent is required.'
  };

  function read(name) {
    const field = form.elements[name];
    return field ? String(field.value) : '';
  }

  function controlFor(name) {
    const field = form.elements[name];
    if (!field) return null;
    if (typeof field.length === 'number' && !field.closest) return field[0] || null;
    return field;
  }

  function setError(name, message) {
    const slot = form.querySelector(`[data-error="${name}"]`);
    if (slot) slot.textContent = message;
    const control = controlFor(name);
    const wrapper = control && typeof control.closest === 'function' ? control.closest('.field') : null;
    if (wrapper) wrapper.classList.toggle('has-error', Boolean(message));
  }

  function clearErrors(panel) {
    panel.querySelectorAll('[data-error]').forEach((slot) => {
      slot.textContent = '';
    });
    panel.querySelectorAll('.field').forEach((wrapper) => {
      wrapper.classList.remove('has-error');
    });
  }

  function validate(target) {
    const panel = form.querySelector(`[data-step-panel="${target}"]`);
    let firstInvalid = null;

    panel.querySelectorAll('input, select').forEach((control) => {
      const name = control.name;
      if (!rules[name]) return;
      const message = rules[name]();
      setError(name, message);
      if (message && !firstInvalid) firstInvalid = control;
    });

    if (firstInvalid) {
      firstInvalid.focus();
      if (typeof firstInvalid.scrollIntoView === 'function') {
        firstInvalid.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }

    return !firstInvalid;
  }

  function syncTrackCards() {
    form.querySelectorAll('.track-card').forEach((card) => {
      const input = card.querySelector('input');
      card.classList.toggle('is-selected', Boolean(input && input.checked));
    });
  }

  function suggestTrack() {
    const grade = Number(read('grade'));
    if (!grade) return;
    const wanted = grade <= 5 ? 'primary' : grade <= 8 ? 'middle' : 'career';
    if (read('track')) return;
    const input = form.querySelector(`input[name="track"][value="${wanted}"]`);
    if (!input) return;
    input.checked = true;
    setError('track', '');
    syncTrackCards();
  }

  function render() {
    panels.forEach((panel) => {
      panel.classList.toggle('is-active', Number(panel.dataset.stepPanel) === step);
    });
    steps.forEach((item) => {
      const position = Number(item.dataset.stepDot);
      item.classList.toggle('is-active', position === step);
      item.classList.toggle('is-done', position < step);
    });

    const isFirst = step === 1;
    const isLast = step === lastStep;
    backBtn.hidden = isFirst || isLast;
    nextBtn.hidden = !isFirst;
    submitBtn.hidden = step !== 2;
    againBtn.hidden = !isLast;
    form.querySelector('#enrollCancel').hidden = isLast;
  }

  function goTo(target) {
    step = target;
    render();
    form.scrollTop = 0;
  }

  function applicationId() {
    const year = new Date().getFullYear();
    const serial = Math.floor(1000 + Math.random() * 9000);
    return `NLH-${year}-${serial}`;
  }

  function saveEnrollment(entry) {
    try {
      const stored = JSON.parse(window.localStorage.getItem(ENROLL_STORE_KEY) || '[]');
      stored.push(entry);
      window.localStorage.setItem(ENROLL_STORE_KEY, JSON.stringify(stored));
    } catch (error) {
      return false;
    }
    return true;
  }

  function showConfirmation(entry) {
    doneLine.textContent = `${entry.fullName} from ${entry.village} is on the enrollment list for Class ${entry.grade}.`;
    doneMeta.textContent = '';

    [
      entry.id,
      TRACK_LABELS[entry.track],
      entry.device,
      entry.language,
      entry.slot
    ].forEach((text) => {
      const chip = document.createElement('span');
      chip.textContent = text;
      doneMeta.appendChild(chip);
    });
  }

  function collect() {
    return {
      id: applicationId(),
      fullName: read('fullName').trim(),
      grade: read('grade'),
      village: read('village').trim(),
      mobile: read('mobile').replace(/\D/g, ''),
      guardian: read('guardian').trim(),
      track: read('track'),
      device: read('device'),
      language: read('language'),
      slot: read('slot'),
      submittedAt: new Date().toISOString()
    };
  }

  function reset() {
    form.reset();
    panels.forEach((panel) => clearErrors(panel));
    doneLine.textContent = '';
    doneMeta.textContent = '';
    syncTrackCards();
    goTo(1);
  }

  nextBtn.addEventListener('click', () => {
    if (validate(1)) {
      suggestTrack();
      goTo(2);
    }
  });

  backBtn.addEventListener('click', () => {
    goTo(1);
  });

  submitBtn.addEventListener('click', () => {
    if (!validate(2)) return;
    const entry = collect();
    saveEnrollment(entry);
    showConfirmation(entry);
    goTo(lastStep);
  });

  againBtn.addEventListener('click', () => {
    reset();
    form.querySelector('#fullName').focus();
  });

  form.addEventListener('input', (event) => {
    const name = event.target.name;
    if (rules[name]) setError(name, '');
  });

  form.addEventListener('change', () => {
    syncTrackCards();
  });

  form.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => modal.close());
  });

  document.querySelectorAll('.enroll-trigger').forEach((button) => {
    button.addEventListener('click', () => {
      reset();
      modal.showModal();
    });
  });

  modal.addEventListener('cancel', (event) => {
    event.preventDefault();
    modal.close();
  });
});
