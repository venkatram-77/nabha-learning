const ENROLL_STORE_KEY = 'nabha-learning-hub-enrollments';
const PORTAL_STORE_KEY = 'nabha-learning-hub-portal';
const PACK_STORE_KEY = 'nabha-learning-hub-packs';

document.addEventListener('DOMContentLoaded', () => {
  const lessons = window.NLH_LESSONS || [];
  const tracks = window.NLH_TRACKS || {};

  const signinView = document.getElementById('signinView');
  const portalView = document.getElementById('portalView');
  const enrolledGroup = document.getElementById('enrolledGroup');
  const enrolledList = document.getElementById('enrolledList');
  const demoList = document.getElementById('demoList');
  const who = document.getElementById('who');
  const whoName = document.getElementById('whoName');
  const whoMeta = document.getElementById('whoMeta');
  const signOut = document.getElementById('signOut');
  const greeting = document.getElementById('greeting');
  const greetingNote = document.getElementById('greetingNote');
  const trackBadge = document.getElementById('trackBadge');
  const ring = document.getElementById('ring');
  const ringValue = document.getElementById('ringValue');
  const doneCount = document.getElementById('doneCount');
  const statRow = document.getElementById('statRow');
  const subjectChips = document.getElementById('subjectChips');
  const hideDone = document.getElementById('hideDone');
  const lessonGrid = document.getElementById('lessonGrid');
  const emptyState = document.getElementById('emptyState');
  const packList = document.getElementById('packList');
  const lessonModal = document.getElementById('lessonModal');
  const lessonTitle = document.getElementById('lessonTitle');
  const lessonMeta = document.getElementById('lessonMeta');
  const lessonSummary = document.getElementById('lessonSummary');
  const lessonBody = document.getElementById('lessonBody');
  const markDone = document.getElementById('markDone');
  const markOpen = document.getElementById('markOpen');
  const closeLesson = document.getElementById('closeLesson');

  const session = readJson(PORTAL_STORE_KEY, {});

  let student = session.student || null;
  let completed = new Set(Array.isArray(session.completed) ? session.completed : []);
  let packs = new Set(readJson(PACK_STORE_KEY, []));
  let subject = 'All';
  let activeLesson = null;

  function readJson(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      return;
    }
  }

  function enrolledStudents() {
    return readJson(ENROLL_STORE_KEY, [])
      .filter((entry) => entry && entry.fullName)
      .map((entry) => ({
        id: entry.id,
        name: entry.fullName,
        grade: entry.grade,
        village: entry.village,
        track: entry.track
      }))
      .reverse();
  }

  function initials(name) {
    return String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }

  function trackFor(grade) {
    const value = Number(grade);
    if (value <= 5) return 'primary';
    if (value <= 8) return 'middle';
    return 'career';
  }

  function persist() {
    writeJson(PORTAL_STORE_KEY, { student, completed: Array.from(completed) });
    writeJson(PACK_STORE_KEY, Array.from(packs));
  }

  function studentCard(entry, isNew) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'signin-card';

    const avatar = document.createElement('span');
    avatar.className = 'signin-avatar';
    avatar.textContent = initials(entry.name);

    const body = document.createElement('span');
    const name = document.createElement('strong');
    name.textContent = entry.name;
    const meta = document.createElement('span');
    meta.textContent = `Class ${entry.grade} · ${entry.village}`;

    body.appendChild(name);
    body.appendChild(meta);

    if (isNew) {
      const tag = document.createElement('span');
      tag.className = 'new-tag';
      tag.textContent = 'New enrollment';
      body.appendChild(tag);
    }

    button.appendChild(avatar);
    button.appendChild(body);
    button.addEventListener('click', () => signIn({ ...entry, track: entry.track || trackFor(entry.grade) }));
    return button;
  }

  function renderSignin() {
    const enrolled = enrolledStudents();
    enrolledGroup.hidden = enrolled.length === 0;
    enrolledList.textContent = '';
    enrolled.forEach((entry, index) => {
      enrolledList.appendChild(studentCard(entry, index === 0));
    });

    demoList.textContent = '';
    (window.NLH_DEMO_STUDENTS || []).forEach((entry) => {
      demoList.appendChild(studentCard(entry, false));
    });
  }

  function signIn(entry) {
    student = entry;
    subject = 'All';
    persist();
    renderPortal();
    signinView.hidden = true;
    portalView.hidden = false;
    who.hidden = false;
    signOut.hidden = false;
    whoName.textContent = student.name;
    whoMeta.textContent = `Class ${student.grade} · ${student.village}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function signOutStudent() {
    student = null;
    completed = new Set();
    packs = new Set();
    persist();
    portalView.hidden = true;
    signinView.hidden = false;
    who.hidden = true;
    signOut.hidden = true;
    renderSignin();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function trackLessons() {
    return lessons.filter((lesson) => lesson.track === student.track);
  }

  function subjectList() {
    return Array.from(new Set(trackLessons().map((lesson) => lesson.subject)));
  }

  function progress() {
    const total = trackLessons().length;
    const done = trackLessons().filter((lesson) => completed.has(lesson.id)).length;
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  function renderOverview() {
    const track = tracks[student.track] || { label: 'Student', grades: '' };
    trackBadge.textContent = `${track.label} track · ${track.grades}`;
    greeting.textContent = `Welcome back, ${student.name.split(' ')[0]}`;
    greetingNote.textContent = `${trackLessons().length} modules are unlocked for your track. Mark each lesson complete and your mentor sees the progress on the next visit.`;

    const { total, done, percent } = progress();
    ring.style.setProperty('--value', percent);
    ringValue.textContent = `${percent}%`;
    doneCount.textContent = `${done} of ${total}`;

    const minutes = trackLessons()
      .filter((lesson) => completed.has(lesson.id))
      .reduce((sum, lesson) => sum + lesson.duration, 0);

    const subjects = subjectList().length;
    const nextUp = trackLessons().find((lesson) => !completed.has(lesson.id));

    statRow.textContent = '';
    [
      { value: total, label: 'Modules in track' },
      { value: subjects, label: 'Subjects covered' },
      { value: `${minutes} min`, label: 'Time studied' },
      { value: nextUp ? nextUp.title : 'All done', label: 'Next lesson' }
    ].forEach((stat) => {
      const box = document.createElement('div');
      box.className = 'stat-box';
      const strong = document.createElement('strong');
      strong.textContent = stat.value;
      const span = document.createElement('span');
      span.textContent = stat.label;
      box.appendChild(strong);
      box.appendChild(span);
      statRow.appendChild(box);
    });
  }

  function renderChips() {
    subjectChips.textContent = '';
    ['All'].concat(subjectList()).forEach((name) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = name === subject ? 'chip is-active' : 'chip';
      chip.setAttribute('role', 'tab');
      chip.textContent = name;
      chip.addEventListener('click', () => {
        subject = name;
        renderChips();
        renderGrid();
      });
      subjectChips.appendChild(chip);
    });
  }

  function visibleLessons() {
    return trackLessons().filter((lesson) => {
      if (subject !== 'All' && lesson.subject !== subject) return false;
      if (hideDone.checked && completed.has(lesson.id)) return false;
      return true;
    });
  }

  function renderGrid() {
    const list = visibleLessons();
    lessonGrid.textContent = '';
    emptyState.hidden = list.length > 0;

    list.forEach((lesson) => {
      const done = completed.has(lesson.id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = done ? 'lesson-card is-done' : 'lesson-card';

      const top = document.createElement('div');
      top.className = 'lesson-top';
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = lesson.subject;
      const tick = document.createElement('span');
      tick.className = 'tick';
      tick.textContent = '✓';
      top.appendChild(pill);
      top.appendChild(tick);

      const title = document.createElement('h3');
      title.textContent = lesson.title;

      const summary = document.createElement('p');
      summary.textContent = lesson.summary;

      const foot = document.createElement('div');
      foot.className = 'lesson-foot';
      const meta = document.createElement('span');
      meta.textContent = `${lesson.level} · ${lesson.duration} min`;
      const go = document.createElement('span');
      go.className = 'go';
      go.textContent = done ? 'Review' : 'Start';
      foot.appendChild(meta);
      foot.appendChild(go);

      card.appendChild(top);
      card.appendChild(title);
      card.appendChild(summary);
      card.appendChild(foot);
      card.addEventListener('click', () => openLesson(lesson));
      lessonGrid.appendChild(card);
    });
  }

  function renderPacks() {
    const track = tracks[student.track] || { label: 'Student', grades: '' };
    packList.textContent = '';

    const saved = packs.has(student.track);
    const pack = document.createElement('div');
    pack.className = 'pack';

    const info = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = `${track.label} pack · ${track.grades}`;
    const span = document.createElement('span');
    span.textContent = `${trackLessons().length} modules · works without internet`;
    info.appendChild(strong);
    info.appendChild(span);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = saved ? 'pack-btn is-saved' : 'pack-btn';
    button.textContent = saved ? 'Downloaded' : 'Download';
    button.addEventListener('click', () => {
      if (packs.has(student.track)) {
        packs.delete(student.track);
      } else {
        packs.add(student.track);
      }
      persist();
      renderPacks();
    });

    pack.appendChild(info);
    pack.appendChild(button);
    packList.appendChild(pack);
  }

  function renderPortal() {
    renderOverview();
    renderChips();
    renderGrid();
    renderPacks();
  }

  function openLesson(lesson) {
    activeLesson = lesson;
    lessonTitle.textContent = lesson.title;
    lessonMeta.textContent = `${lesson.subject} · ${lesson.level} · ${lesson.duration} min`;
    lessonSummary.textContent = lesson.summary;
    lessonBody.textContent = '';

    lesson.sections.forEach((section) => {
      const block = document.createElement('div');
      const heading = document.createElement('h3');
      heading.textContent = section.heading;
      const body = document.createElement('p');
      body.textContent = section.body;
      block.appendChild(heading);
      block.appendChild(body);
      lessonBody.appendChild(block);
    });

    syncLessonButtons();
    lessonModal.showModal();
  }

  function syncLessonButtons() {
    if (!activeLesson) return;
    const done = completed.has(activeLesson.id);
    markDone.textContent = done ? 'Completed ✓' : 'Mark complete';
    markDone.disabled = done;
    markOpen.hidden = !done;
  }

  function toggleComplete(lessonId, force) {
    const shouldComplete = force !== undefined ? force : !completed.has(lessonId);
    if (shouldComplete) {
      completed.add(lessonId);
    } else {
      completed.delete(lessonId);
    }
    persist();
    renderOverview();
    renderGrid();
    syncLessonButtons();
  }

  markDone.addEventListener('click', () => activeLesson && toggleComplete(activeLesson.id, true));
  markOpen.addEventListener('click', () => activeLesson && toggleComplete(activeLesson.id, false));
  closeLesson.addEventListener('click', () => lessonModal.close());
  lessonModal.addEventListener('cancel', (event) => {
    event.preventDefault();
    lessonModal.close();
  });
  lessonModal.addEventListener('close', () => {
    activeLesson = null;
  });
  hideDone.addEventListener('change', renderGrid);
  signOut.addEventListener('click', signOutStudent);

  if (student) {
    signinView.hidden = true;
    portalView.hidden = false;
    who.hidden = false;
    signOut.hidden = false;
    whoName.textContent = student.name;
    whoMeta.textContent = `Class ${student.grade} · ${student.village}`;
    renderPortal();
  } else {
    renderSignin();
  }
});
