document.addEventListener('DOMContentLoaded', () => {
  const lessons = window.NLH_LESSONS || [];
  const tracks = window.NLH_TRACKS || {};
  const roster = window.NLH_ROSTER;
  const progressStore = window.NLH_PROGRESS;
  const staffRoster = window.NLH_STAFF || [];

  const SESSION_KEY = 'nabha-learning-hub-session-v2';

  const signinView = document.getElementById('signinView');
  const portalView = document.getElementById('portalView');
  const staffView = document.getElementById('staffView');
  const studentSignin = document.getElementById('studentSignin');
  const staffSignin = document.getElementById('staffSignin');
  const signinBlurb = document.getElementById('signinBlurb');
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

  const roleStudent = document.getElementById('roleStudent');
  const roleStaff = document.getElementById('roleStaff');
  const lookupForm = document.getElementById('lookupForm');
  const lookupInput = document.getElementById('lookupInput');
  const lookupSubmit = document.getElementById('lookupSubmit');
  const lookupError = document.getElementById('lookupError');
  const lookupHint = document.getElementById('lookupHint');
  const matchList = document.getElementById('matchList');
  const staffForm = document.getElementById('staffForm');
  const staffPasscode = document.getElementById('staffPasscode');
  const staffError = document.getElementById('staffError');
  const staffHint = document.getElementById('staffHint');

  const staffBadge = document.getElementById('staffBadge');
  const staffGreeting = document.getElementById('staffGreeting');
  const staffNote = document.getElementById('staffNote');
  const staffRing = document.getElementById('staffRing');
  const staffRingValue = document.getElementById('staffRingValue');
  const staffDoneCount = document.getElementById('staffDoneCount');
  const staffStats = document.getElementById('staffStats');
  const staffChips = document.getElementById('staffChips');
  const staffHideDone = document.getElementById('staffHideDone');
  const subjectSummary = document.getElementById('subjectSummary');
  const staffRows = document.getElementById('staffRows');
  const staffEmpty = document.getElementById('staffEmpty');
  const accessNote = document.getElementById('accessNote');

  progressStore.migrate();

  const session = readJson(SESSION_KEY, {});
  let student = session.student || null;
  let staff = session.staff || null;
  let completed = new Set(student ? progressStore.forStudent(student.id).completed : []);
  let packs = new Set(student ? progressStore.forStudent(student.id).packs : []);
  let subject = 'All';
  let activeLesson = null;
  let staffFilter = 'All';
  let role = 'student';

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

  function allStudents() {
    return roster.all(lessons);
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
    return roster.trackFor(grade);
  }

  function persistStudent() {
    progressStore.save(student.id, { completed: completed, packs: packs });
    writeJson(SESSION_KEY, { student: student, staff: null });
  }

  function persistStaff() {
    writeJson(SESSION_KEY, { student: null, staff: staff });
  }

  function trackLessons() {
    if (!student) return [];
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

  function showView(next) {
    signinView.hidden = next !== 'signin';
    portalView.hidden = next !== 'student';
    staffView.hidden = next !== 'staff';
    who.hidden = next === 'signin';
    signOut.hidden = next === 'signin';
  }

  function setRole(next) {
    role = next;
    const isStudent = next === 'student';
    roleStudent.className = isStudent ? 'role-tab is-active' : 'role-tab';
    roleStaff.className = isStudent ? 'role-tab' : 'role-tab is-active';
    roleStudent.setAttribute('aria-selected', String(isStudent));
    roleStaff.setAttribute('aria-selected', String(!isStudent));
    studentSignin.hidden = !isStudent;
    staffSignin.hidden = isStudent;
    signinBlurb.textContent = isStudent
      ? 'Students see only their own lessons and progress. Enter your name to find your record.'
      : 'Faculty and administrators see the progress of every student. Enter the passcode for your role.';
    staffError.hidden = true;
    staffHint.textContent = 'Demo build: the faculty and admin passcodes live in web/data/staff.js.';
  }

  function studentCard(entry) {
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

    if (entry.demo) {
      const tag = document.createElement('span');
      tag.className = 'new-tag';
      tag.textContent = 'Demo account';
      body.appendChild(tag);
    }

    button.appendChild(avatar);
    button.appendChild(body);
    button.addEventListener('click', () => signInStudent(entry));
    return button;
  }

  function renderMatches(matches) {
    matchList.textContent = '';
    matches.forEach((entry) => {
      matchList.appendChild(studentCard(entry));
    });
  }

  function renderSignin() {
    const students = allStudents();
    const enrolled = students.filter((entry) => !entry.demo).length;
    const demos = students.filter((entry) => entry.demo).length;
    lookupHint.textContent = enrolled
      ? `${enrolled} student record${enrolled === 1 ? '' : 's'} saved on this device.`
      : `No enrollments saved on this device yet. You can still explore with a demo account${
          demos === 1 ? '' : 's'
        } below.`;
    lookupError.hidden = true;
    renderMatches([]);
    setRole(role);
  }

  function signInStudent(entry) {
    student = { ...entry, track: entry.track || trackFor(entry.grade) };
    const stored = progressStore.forStudent(student.id);
    completed = new Set(stored.completed);
    packs = new Set(stored.packs);
    staff = null;
    subject = 'All';
    persistStudent();
    whoName.textContent = student.name;
    whoMeta.textContent = `Class ${student.grade} · ${student.village}`;
    renderPortal();
    showView('student');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function signInStaff(entry) {
    staff = entry;
    student = null;
    completed = new Set();
    packs = new Set();
    staffFilter = 'All';
    persistStaff();
    whoName.textContent = staff.name;
    whoMeta.textContent = `${staff.label} · ${staff.subject}`;
    staffPasscode.value = '';
    renderStaff();
    showView('staff');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function signOutUser() {
    student = null;
    staff = null;
    completed = new Set();
    packs = new Set();
    subject = 'All';
    staffFilter = 'All';
    writeJson(SESSION_KEY, {});
    showView('signin');
    renderSignin();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderOverview() {
    const track = tracks[student.track] || { label: 'Student', grades: '' };
    trackBadge.textContent = `${track.label} track · ${track.grades}`;
    greeting.textContent = `Welcome back, ${student.name.split(' ')[0]}`;
    greetingNote.textContent = `${trackLessons().length} modules are unlocked for your track. Only you can see this progress — faculty and admins see the class totals, not your individual lessons.`;

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
      persistStudent();
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
    persistStudent();
    renderOverview();
    renderGrid();
    syncLessonButtons();
  }

  function studentReport(entry, store) {
    const record = store[entry.id] || {};
    const doneSet = new Set(Array.isArray(record.completed) ? record.completed : []);
    const trackLessonsForStudent = lessons.filter((lesson) => lesson.track === entry.track);
    const total = trackLessonsForStudent.length;
    const done = trackLessonsForStudent.filter((lesson) => doneSet.has(lesson.id)).length;
    const subjects = Array.from(new Set(trackLessonsForStudent.map((lesson) => lesson.subject)));
    const bySubject = subjects.map((name) => {
      const inSubject = trackLessonsForStudent.filter((lesson) => lesson.subject === name);
      const doneInSubject = inSubject.filter((lesson) => doneSet.has(lesson.id)).length;
      return {
        name: name,
        done: doneInSubject,
        total: inSubject.length,
        percent: inSubject.length ? Math.round((doneInSubject / inSubject.length) * 100) : 0
      };
    });
    return {
      student: entry,
      done: done,
      total: total,
      percent: total ? Math.round((done / total) * 100) : 0,
      minutes: trackLessonsForStudent
        .filter((lesson) => doneSet.has(lesson.id))
        .reduce((sum, lesson) => sum + lesson.duration, 0),
      bySubject: bySubject,
      updatedAt: record.updatedAt || ''
    };
  }

  function relativeTime(iso) {
    if (!iso) return 'Never';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return 'Never';
    const minutes = Math.floor((Date.now() - then) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    return new Date(iso).toLocaleDateString();
  }

  function trackLabel(key) {
    const track = tracks[key] || { label: key, grades: '' };
    return `${track.label} (${track.grades})`;
  }

  function reports() {
    const store = progressStore.all();
    return allStudents().map((entry) => studentReport(entry, store));
  }

  function renderStaffChips(reportsForFilter) {
    const grades = Array.from(new Set(allStudents().map((entry) => String(entry.grade)))).sort(
      (a, b) => Number(a) - Number(b)
    );
    staffChips.textContent = '';
    ['All'].concat(grades.map((grade) => `Class ${grade}`)).forEach((label) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = label === staffFilter ? 'chip is-active' : 'chip';
      chip.setAttribute('role', 'tab');
      chip.textContent = label;
      const count = label === 'All'
        ? reportsForFilter.length
        : reportsForFilter.filter((report) => `Class ${report.student.grade}` === label).length;
      chip.appendChild(document.createTextNode(` ${count}`));
      chip.addEventListener('click', () => {
        staffFilter = label;
        renderStaff();
      });
      staffChips.appendChild(chip);
    });
  }

  function renderSubjectSummary(reportsForFilter) {
    const totals = new Map();
    reportsForFilter.forEach((report) => {
      report.bySubject.forEach((subject) => {
        if (!totals.has(subject.name)) {
          totals.set(subject.name, { name: subject.name, done: 0, total: 0, students: 0 });
        }
        const bucket = totals.get(subject.name);
        bucket.done += subject.done;
        bucket.total += subject.total;
        bucket.students += 1;
      });
    });

    subjectSummary.textContent = '';
    if (!totals.size) return;

    const title = document.createElement('h2');
    title.textContent = 'Subject completion across the class';
    subjectSummary.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'subject-grid';
    Array.from(totals.values())
      .sort((a, b) => b.total - a.total)
      .forEach((bucket) => {
        const percent = bucket.total ? Math.round((bucket.done / bucket.total) * 100) : 0;
        const card = document.createElement('div');
        card.className = 'subject-card';

        const head = document.createElement('div');
        head.className = 'subject-head';
        const name = document.createElement('strong');
        name.textContent = bucket.name;
        const value = document.createElement('span');
        value.textContent = `${percent}%`;
        head.appendChild(name);
        head.appendChild(value);

        const bar = document.createElement('div');
        bar.className = 'bar';
        const fill = document.createElement('span');
        fill.style.width = `${percent}%`;
        bar.appendChild(fill);

        const meta = document.createElement('span');
        meta.className = 'subject-meta';
        meta.textContent = `${bucket.done} of ${bucket.total} lessons · ${bucket.students} student${bucket.students === 1 ? '' : 's'}`;

        card.appendChild(head);
        card.appendChild(bar);
        card.appendChild(meta);
        grid.appendChild(card);
      });

    subjectSummary.appendChild(grid);
  }

  function progressCell(report) {
    const cell = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.className = 'cell-progress';

    const bar = document.createElement('div');
    bar.className = 'bar';
    const fill = document.createElement('span');
    fill.style.width = `${report.percent}%`;
    bar.appendChild(fill);

    const label = document.createElement('span');
    label.className = 'cell-count';
    label.textContent = `${report.done}/${report.total}`;

    wrap.appendChild(bar);
    wrap.appendChild(label);
    cell.appendChild(wrap);
    return cell;
  }

  function subjectCell(report) {
    const cell = document.createElement('td');
    const list = document.createElement('div');
    list.className = 'mini-list';
    report.bySubject.forEach((subject) => {
      const item = document.createElement('span');
      item.className = subject.percent === 100 ? 'mini is-full' : 'mini';
      item.textContent = `${subject.name} ${subject.percent}%`;
      list.appendChild(item);
    });
    cell.appendChild(list);
    return cell;
  }

  function renderStaffRows(reportsForFilter) {
    const visible = reportsForFilter
      .filter((report) => !staffHideDone.checked || report.percent < 100)
      .sort((a, b) => a.percent - b.percent);

    staffRows.textContent = '';
    staffEmpty.hidden = visible.length > 0;

    visible.forEach((report) => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      const who_ = document.createElement('div');
      who_.className = 'cell-who';
      const avatar = document.createElement('span');
      avatar.className = 'who-avatar';
      avatar.textContent = initials(report.student.name);
      const text = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = report.student.name;
      const meta = document.createElement('span');
      meta.textContent = trackLabel(report.student.track);
      text.appendChild(strong);
      text.appendChild(meta);
      who_.appendChild(avatar);
      who_.appendChild(text);
      nameCell.appendChild(who_);

      const gradeCell = document.createElement('td');
      gradeCell.textContent = `Class ${report.student.grade}`;

      const villageCell = document.createElement('td');
      villageCell.textContent = report.student.village;

      const lastCell = document.createElement('td');
      lastCell.textContent = relativeTime(report.updatedAt);

      row.appendChild(nameCell);
      row.appendChild(gradeCell);
      row.appendChild(villageCell);
      row.appendChild(progressCell(report));
      row.appendChild(subjectCell(report));
      row.appendChild(lastCell);
      staffRows.appendChild(row);
    });
  }

  function renderStaff() {
    const everyReport = reports();
    const scoped = staffFilter === 'All'
      ? everyReport
      : everyReport.filter((report) => `Class ${report.student.grade}` === staffFilter);

    const totalDone = scoped.reduce((sum, report) => sum + report.done, 0);
    const totalLessons = scoped.reduce((sum, report) => sum + report.total, 0);
    const overall = totalLessons ? Math.round((totalDone / totalLessons) * 100) : 0;
    const finished = scoped.filter((report) => report.percent === 100).length;
    const untouched = scoped.filter((report) => report.done === 0).length;
    const minutes = scoped.reduce((sum, report) => sum + report.minutes, 0);
    const average = scoped.length ? Math.round(scoped.reduce((s, r) => s + r.percent, 0) / scoped.length) : 0;

    staffBadge.textContent = `${staff.label} dashboard`;
    staffGreeting.textContent = `Progress across ${scoped.length} student${scoped.length === 1 ? '' : 's'}`;
    staffNote.textContent = `Signed in as ${staff.name}. Students cannot see this page or each other’s progress — only faculty and admin roles reach it.`;

    staffRing.style.setProperty('--value', overall);
    staffRingValue.textContent = `${overall}%`;
    staffDoneCount.textContent = `${totalDone} of ${totalLessons}`;

    staffStats.textContent = '';
    [
      { value: everyReport.length, label: 'Students enrolled' },
      { value: `${average}%`, label: 'Average per student' },
      { value: finished, label: 'Tracks finished' },
      { value: untouched, label: 'Not started' },
      { value: `${Math.round(minutes / 60)} hr`, label: 'Study time logged' }
    ].forEach((stat) => {
      const box = document.createElement('div');
      box.className = 'stat-box';
      const strong = document.createElement('strong');
      strong.textContent = stat.value;
      const span = document.createElement('span');
      span.textContent = stat.label;
      box.appendChild(strong);
      box.appendChild(span);
      staffStats.appendChild(box);
    });

    renderStaffChips(scoped);
    renderSubjectSummary(scoped);
    renderStaffRows(scoped);
    accessNote.textContent = window.NLH_ACCESS_NOTE || '';
  }

  roleStudent.addEventListener('click', () => setRole('student'));
  roleStaff.addEventListener('click', () => setRole('staff'));

  lookupForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const matches = roster.find(allStudents(), lookupInput.value);
    lookupError.hidden = true;
    if (!matches.length) {
      lookupError.textContent = 'No student record matches that name. Check the spelling, or register on the learning hub first.';
      lookupError.hidden = false;
      renderMatches([]);
      return;
    }
    if (matches.length === 1) {
      signInStudent(matches[0]);
      return;
    }
    renderMatches(matches);
    lookupError.textContent = 'More than one record matches. Pick the right one below.';
    lookupError.hidden = false;
  });

  staffForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const entered = staffPasscode.value.trim();
    const match = staffRoster.find((entry) => entry.passcode === entered);
    if (!match) {
      staffError.textContent = 'That passcode does not match any faculty or admin account.';
      staffError.hidden = false;
      return;
    }
    staffError.hidden = true;
    signInStaff(match);
  });

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
  staffHideDone.addEventListener('change', () => renderStaff());
  signOut.addEventListener('click', signOutUser);

  if (staff) {
    whoName.textContent = staff.name;
    whoMeta.textContent = `${staff.label} · ${staff.subject}`;
    renderStaff();
    showView('staff');
  } else if (student) {
    whoName.textContent = student.name;
    whoMeta.textContent = `Class ${student.grade} · ${student.village}`;
    renderPortal();
    showView('student');
  } else {
    showView('signin');
    renderSignin();
  }
});
