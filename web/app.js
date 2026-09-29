document.addEventListener('DOMContentLoaded', () => {
  const lessons = window.NLH_LESSONS || [];
  const tracks = window.NLH_TRACKS || {};
  const roster = window.NLH_ROSTER;
  const progressStore = window.NLH_PROGRESS;
  const staffRoster = window.NLH_STAFF || [];
  const videoFor = (window.NLH_VIDEO && window.NLH_VIDEO.forLesson) || (() => null);
  const assignmentList = window.NLH_ASSIGNMENT_LIST;
  const submissions = window.NLH_SUBMISSIONS;

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
  const workList = document.getElementById('workList');
  const workEmpty = document.getElementById('workEmpty');
  const packList = document.getElementById('packList');
  const qaPanel = document.getElementById('qaPanel');
  const lessonModal = document.getElementById('lessonModal');
  const lessonTitle = document.getElementById('lessonTitle');
  const lessonMeta = document.getElementById('lessonMeta');
  const lessonSummary = document.getElementById('lessonSummary');
  const lessonVideo = document.getElementById('lessonVideo');
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
  const submissionSummary = document.getElementById('submissionSummary');
  const submissionRows = document.getElementById('submissionRows');
  const submissionEmpty = document.getElementById('submissionEmpty');
  const accessNote = document.getElementById('accessNote');

  progressStore.migrate();

  const session = readJson(SESSION_KEY, {});
  let student = session.student || null;
  let staff = session.staff || null;
  let completed = new Set(student ? progressStore.forStudent(student.id).completed : []);
  let packs = new Set(student ? progressStore.forStudent(student.id).packs : []);
  let watched = new Set(student ? progressStore.forStudent(student.id).watched : []);
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
    progressStore.save(student.id, {
      completed: completed,
      packs: packs,
      watched: watched
    });
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
    watched = new Set(stored.watched);
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
    watched = new Set();
    staffFilter = 'All';
    renderPacks();
    renderWork();
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
    watched = new Set();
    subject = 'All';
    staffFilter = 'All';
    renderPacks();
    renderWork();
    writeJson(SESSION_KEY, {});
    showView('signin');
    renderSignin();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderOverview() {
    const track = tracks[student.track] || { label: 'Student', grades: '' };
    const trackLessonsList = trackLessons();
    trackBadge.textContent = `${track.label} track · ${track.grades}`;
    greeting.textContent = `Welcome back, ${student.name.split(' ')[0]}`;
    greetingNote.textContent = `${trackLessonsList.length} modules are unlocked for your track. Every module has a video to watch and the written notes under it. Only you can see this progress — faculty and admins see the class totals, not your individual lessons.`;

    const { total, done, percent } = progress();
    ring.style.setProperty('--value', percent);
    ringValue.textContent = `${percent}%`;
    doneCount.textContent = `${done} of ${total}`;

    const minutes = trackLessonsList
      .filter((lesson) => completed.has(lesson.id))
      .reduce((sum, lesson) => sum + lesson.duration, 0);

    const subjects = subjectList().length;
    const nextUp = trackLessonsList.find((lesson) => !completed.has(lesson.id));
    const watchedCount = trackLessonsList.filter((lesson) => watched.has(lesson.id)).length;
    const uploaded = submissions.forStudent(student.id).length;
    const setWork = assignmentList ? assignmentList.forTrack(student.track).length : 0;

    statRow.textContent = '';
    [
      { value: total, label: 'Modules in track' },
      { value: `${watchedCount}/${total}`, label: 'Videos watched' },
      { value: subjects, label: 'Subjects covered' },
      { value: `${minutes} min`, label: 'Time studied' },
      { value: `${uploaded}/${setWork}`, label: 'Work uploaded' },
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
      const hasVideo = Boolean(videoFor(lesson));
      const seen = watched.has(lesson.id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = done ? 'lesson-card is-done' : 'lesson-card';

      const top = document.createElement('div');
      top.className = 'lesson-top';
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = lesson.subject;
      top.appendChild(pill);
      if (hasVideo) {
        const play = document.createElement('span');
        play.className = seen ? 'play is-seen' : 'play';
        play.textContent = seen ? 'Watched' : 'Video';
        top.appendChild(play);
      }
      const tick = document.createElement('span');
      tick.className = 'tick';
      tick.textContent = '✓';
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
      go.textContent = done ? 'Review' : hasVideo ? 'Watch' : 'Start';
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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function trackPack(trackKey) {
    const track = tracks[trackKey] || { label: 'Student', grades: '' };
    const packLessons = lessons.filter((lesson) => lesson.track === trackKey);
    const subjects = [];
    packLessons.forEach((lesson) => {
      if (subjects.indexOf(lesson.subject) === -1) subjects.push(lesson.subject);
    });
    const pairs = packLessons.reduce((sum, lesson) => sum + lesson.sections.length, 0);
    return { track: track, trackKey: trackKey, lessons: packLessons, subjects: subjects, pairs: pairs };
  }

  function renderQaPanel(trackKey) {
    if (!student) return;
    const pack = trackPack(trackKey);
    qaPanel.hidden = false;
    qaPanel.textContent = '';

    const head = document.createElement('div');
    head.className = 'qa-head';
    const title = document.createElement('h3');
    title.textContent = `${pack.track.label} · ${pack.pairs} questions`;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ghost-btn';
    close.textContent = 'Hide';
    close.addEventListener('click', hideQaPanel);
    head.appendChild(title);
    head.appendChild(close);
    qaPanel.appendChild(head);

    pack.subjects.forEach((subjectName) => {
      const group = document.createElement('section');
      group.className = 'qa-subject';

      const heading = document.createElement('h4');
      heading.textContent = subjectName;
      group.appendChild(heading);

      pack.lessons
        .filter((lesson) => lesson.subject === subjectName)
        .forEach((lesson) => {
          const block = document.createElement('div');
          block.className = 'qa-lesson';

          const name = document.createElement('strong');
          const done = completed.has(lesson.id);
          name.textContent = done ? `${lesson.title} ✓` : lesson.title;
          block.appendChild(name);

          lesson.sections.forEach((section, index) => {
            const q = document.createElement('p');
            q.className = 'qa-q';
            q.textContent = `Q${index + 1}. ${section.heading}`;
            const a = document.createElement('p');
            a.className = 'qa-a';
            a.textContent = section.body;
            block.appendChild(q);
            block.appendChild(a);
          });

          group.appendChild(block);
        });

      qaPanel.appendChild(group);
    });
  }

  function hideQaPanel() {
    qaPanel.hidden = true;
    qaPanel.textContent = '';
  }

  function buildPackDocument(trackKey) {
    const pack = trackPack(trackKey);
    const doneIds = new Set(Array.from(completed));

    const body = pack.subjects
      .map((subjectName) => {
        const blocks = pack.lessons
          .filter((lesson) => lesson.subject === subjectName)
          .map((lesson) => {
            const done = doneIds.has(lesson.id);
            const questions = lesson.sections
              .map(
                (section, index) =>
                  `<dt>Q${index + 1}. ${escapeHtml(section.heading)}</dt>` +
                  `<dd>${escapeHtml(section.body)}</dd>`
              )
              .join('');
            return (
              `<article class="lesson${done ? ' done' : ''}">` +
              `<h3>${done ? '&#10003; ' : ''}${escapeHtml(lesson.title)}` +
              `<span>${escapeHtml(lesson.level)} &middot; ${lesson.duration} min</span></h3>` +
              `<p class="summary">${escapeHtml(lesson.summary)}</p>` +
              `<dl>${questions}</dl>` +
              `</article>`
            );
          })
          .join('');
        return `<section class="subject"><h2>${escapeHtml(subjectName)}</h2>${blocks}</section>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(pack.track.label)} key questions and answers</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color: #163426; background: #f4fbf7; margin: 0; padding: 32px 20px; line-height: 1.6; }
  .sheet { max-width: 820px; margin: 0 auto; }
  header { border-bottom: 3px solid #1e7a4a; padding-bottom: 18px; margin-bottom: 26px; }
  h1 { margin: 0 0 6px; font-size: 1.7rem; }
  header p { margin: 0; color: #587165; }
  .subject { margin-bottom: 30px; }
  .subject > h2 { font-size: 1.1rem; color: #115734; border-left: 4px solid #1e7a4a; padding-left: 10px; margin: 0 0 14px; }
  .lesson { background: #fff; border: 1px solid rgba(22,52,38,0.1); border-radius: 14px; padding: 18px; margin-bottom: 14px; break-inside: avoid; }
  .lesson.done { border-color: #1e7a4a; }
  .lesson h3 { margin: 0 0 4px; font-size: 1.02rem; display: flex; justify-content: space-between; gap: 10px; }
  .lesson h3 span { color: #587165; font-size: 0.76rem; font-weight: 600; white-space: nowrap; }
  .summary { margin: 0 0 12px; color: #3c4a42; }
  dl { margin: 0; }
  dt { font-weight: 700; margin-top: 10px; }
  dd { margin: 4px 0 0; color: #3c4a42; }
  footer { margin-top: 30px; border-top: 1px solid rgba(22,52,38,0.1); padding-top: 14px; color: #587165; font-size: 0.82rem; }
  @media print { body { background: #fff; padding: 0; } .lesson { box-shadow: none; } }
</style>
</head>
<body>
  <div class="sheet">
    <header>
      <h1>${escapeHtml(pack.track.label)} &middot; key questions and answers</h1>
      <p>${escapeHtml(pack.track.grades)} &middot; ${pack.lessons.length} lessons &middot; ${pack.pairs} questions &middot; tick marks show lessons you completed in the portal.</p>
    </header>
    ${body}
    <footer>Nabha Learning Hub &middot; Digital learning for rural students in Nabha, Punjab</footer>
  </div>
</body>
</html>
`;
  }

  function downloadPack(trackKey) {
    if (!student) return;
    const doc = buildPackDocument(trackKey);
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nabha-${trackKey}-key-questions.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function renderPacks() {
    if (!student) {
      packList.textContent = '';
      return;
    }
    const track = tracks[student.track] || { label: 'Student', grades: '' };
    const pack = trackPack(student.track);
    packList.textContent = '';
    hideQaPanel();

    const saved = packs.has(student.track);
    const row = document.createElement('div');
    row.className = 'pack';

    const info = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = `${track.label} pack · ${track.grades}`;
    const span = document.createElement('span');
    span.textContent = `${pack.pairs} questions from ${pack.lessons.length} lessons · reads without internet`;
    info.appendChild(strong);
    info.appendChild(span);

    const actions = document.createElement('div');
    actions.className = 'pack-actions';

    const viewButton = document.createElement('button');
    viewButton.type = 'button';
    viewButton.className = 'ghost-btn';
    viewButton.textContent = 'View';
    viewButton.addEventListener('click', () => {
      if (qaPanel.hidden) {
        renderQaPanel(student.track);
      } else {
        hideQaPanel();
      }
    });

    const button = document.createElement('button');
    button.type = 'button';
    button.className = saved ? 'pack-btn is-saved' : 'pack-btn';
    button.textContent = saved ? 'Downloaded' : 'Download';
    button.addEventListener('click', () => {
      downloadPack(student.track);
      if (!packs.has(student.track)) {
        packs.add(student.track);
        persistStudent();
      }
      renderPacks();
    });

    actions.appendChild(viewButton);
    actions.appendChild(button);
    row.appendChild(info);
    row.appendChild(actions);
    packList.appendChild(row);
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function makeButton(className, label, onClick) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = className;
    node.textContent = label;
    node.addEventListener('click', onClick);
    return node;
  }

  function trackWork() {
    if (!student || !assignmentList) return [];
    return assignmentList.forTrack(student.track);
  }

  function readFileAsDataUrl(file, onDone, onError) {
    const Reader = window.FileReader;
    if (!Reader) {
      onError();
      return;
    }
    const reader = new Reader();
    reader.onload = () => onDone(String(reader.result || ''));
    reader.onerror = () => onError();
    reader.readAsDataURL(file);
  }

  function openUpload(record) {
    if (!record || !record.data) return;
    window.open(record.data, '_blank', 'noopener');
  }

  function uploadWork(assignment, file, setStatus) {
    if (!student || !file) return;
    const maxMb = Number(assignment.maxMb) || 2;

    if (!assignmentList.acceptsFile(assignment, file)) {
      setStatus(`That file type is not accepted here. Upload ${assignmentList.acceptList(assignment).join(' or ')}.`, true);
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      setStatus(`That file is ${formatBytes(file.size)}. Keep it under ${maxMb} MB, or take the photo at a lower resolution.`, true);
      return;
    }

    readFileAsDataUrl(
      file,
      (data) => {
        const saved = submissions.save(student.id, assignment.id, {
          name: file.name,
          type: file.type,
          size: file.size,
          data: data
        });
        if (!saved) {
          setStatus(
            'This device has no space left, so the upload was not saved. Ask your mentor to clear space, or upload a smaller photo.',
            true
          );
          return;
        }
        persistStudent();
        renderWork();
        renderOverview();
      },
      () => setStatus('That file could not be read on this device. Choose it again.', true)
    );
  }

  function workCard(assignment) {
    const record = submissions.get(student.id, assignment.id);
    const card = document.createElement('article');
    card.className = record ? 'work-card is-sent' : 'work-card';

    const head = document.createElement('div');
    head.className = 'work-head';
    const pill = document.createElement('span');
    pill.className = 'pill';
    pill.textContent = assignment.subject;
    const due = document.createElement('span');
    const late = !record && assignmentList.isOverdue(assignment);
    due.className = late ? 'work-due is-late' : 'work-due';
    due.textContent = record
      ? `Uploaded ${formatDate(record.uploadedAt)}`
      : `Due ${formatDate(assignment.due)}`;
    head.appendChild(pill);
    head.appendChild(due);

    const title = document.createElement('h3');
    title.textContent = assignment.title;

    const instructions = document.createElement('p');
    instructions.className = 'work-instructions';
    instructions.textContent = assignment.instructions;

    const meta = document.createElement('p');
    meta.className = 'work-meta';
    meta.textContent = `${assignment.setBy} · about ${assignment.minutes} min · ${assignmentList
      .acceptList(assignment)
      .join(', ')} up to ${assignment.maxMb} MB`;

    const controls = document.createElement('div');
    controls.className = 'work-controls';

    if (record) {
      const sent = document.createElement('div');
      sent.className = 'work-sent';
      const name = document.createElement('strong');
      name.textContent = record.name;
      const size = document.createElement('span');
      size.textContent = formatBytes(record.size);
      sent.appendChild(name);
      sent.appendChild(size);
      controls.appendChild(sent);
      controls.appendChild(makeButton('ghost-btn', 'Open', () => openUpload(record)));
      controls.appendChild(
        makeButton('ghost-btn is-danger', 'Remove', () => {
          submissions.remove(student.id, assignment.id);
          renderWork();
          renderOverview();
        })
      );
    }

    const message = document.createElement('p');
    message.className = 'work-message';
    const setStatus = (text, isError) => {
      message.textContent = text;
      message.className = isError ? 'work-message is-error' : 'work-message';
    };

    const picker = document.createElement('label');
    picker.className = 'upload-btn';
    picker.textContent = record ? 'Replace file' : 'Upload work';
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = (assignment.accepts || []).join(',');
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      input.value = '';
      uploadWork(assignment, file, setStatus);
    });
    picker.appendChild(input);
    controls.appendChild(picker);
    controls.appendChild(message);

    card.appendChild(head);
    card.appendChild(title);
    card.appendChild(instructions);
    card.appendChild(meta);
    card.appendChild(controls);
    return card;
  }

  function renderWork() {
    if (!student || !assignmentList) {
      workList.textContent = '';
      workEmpty.hidden = true;
      return;
    }
    const list = trackWork();
    workList.textContent = '';
    workEmpty.hidden = list.length > 0;
    list.forEach((assignment) => {
      workList.appendChild(workCard(assignment));
    });
  }

  function renderPortal() {
    renderOverview();
    renderChips();
    renderWork();
    renderGrid();
    renderPacks();
  }

  function renderVideo(lesson) {
    lessonVideo.textContent = '';
    const entry = videoFor(lesson);

    if (!entry) {
      const note = document.createElement('div');
      note.className = 'video-missing';
      note.textContent =
        'The video for this lesson is still being recorded. The written notes below cover the same points.';
      lessonVideo.appendChild(note);
      return;
    }

    const frame = document.createElement('div');
    frame.className = 'video-frame';

    if (entry.type === 'embed') {
      const embed = document.createElement('iframe');
      embed.setAttribute('src', entry.src);
      embed.setAttribute('title', `${lesson.title} video`);
      embed.setAttribute('allow', 'accelerometer; clipboard-write; encrypted-media; picture-in-picture');
      embed.setAttribute('allowfullscreen', '');
      embed.setAttribute('loading', 'lazy');
      embed.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      frame.appendChild(embed);
    } else {
      const player = document.createElement('video');
      player.controls = true;
      player.preload = 'metadata';
      player.playsInline = true;
      const source = document.createElement('source');
      source.setAttribute('src', entry.src);
      source.setAttribute('type', 'video/mp4');
      player.appendChild(source);
      player.appendChild(
        document.createTextNode('This browser cannot play the lesson video. Read the notes below instead.')
      );
      player.addEventListener('ended', () => markWatched(lesson));
      player.addEventListener('error', () => {
        const note = document.createElement('p');
        note.className = 'work-message is-error';
        note.textContent =
          'The video did not load on this connection. The written notes below cover the same points.';
        lessonVideo.appendChild(note);
      });
      frame.appendChild(player);
    }

    const caption = document.createElement('p');
    caption.className = 'video-caption';
    caption.textContent = entry.label;

    lessonVideo.appendChild(frame);
    lessonVideo.appendChild(caption);
  }

  function markWatched(lesson) {
    if (!student || watched.has(lesson.id)) return;
    watched.add(lesson.id);
    persistStudent();
    renderOverview();
    renderGrid();
  }

  function openLesson(lesson) {
    activeLesson = lesson;
    lessonTitle.textContent = lesson.title;
    lessonMeta.textContent = `${lesson.subject} · ${lesson.level} · ${lesson.duration} min`;
    lessonSummary.textContent = lesson.summary;
    renderVideo(lesson);
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

  function submissionRowsFor(scoped) {
    if (!assignmentList) return [];
    const byId = new Map(allStudents().map((entry) => [entry.id, entry]));
    const ids = new Set(scoped.map((report) => report.student.id));
    return submissions
      .list()
      .map((row) => ({ row: row, student: byId.get(row.studentId) }))
      .filter((entry) => entry.student && ids.has(entry.student.id))
      .sort((a, b) => {
        const byName = a.student.name.localeCompare(b.student.name);
        return byName !== 0 ? byName : String(a.row.assignmentId).localeCompare(String(b.row.assignmentId));
      });
  }

  function renderSubmissionSummary(scoped) {
    submissionSummary.textContent = '';
    if (!assignmentList) return;

    const expected = new Map();
    scoped.forEach((report) => {
      assignmentList.forTrack(report.student.track).forEach((assignment) => {
        if (!expected.has(assignment.id)) {
          expected.set(assignment.id, { assignment: assignment, students: [] });
        }
        expected.get(assignment.id).students.push(report.student.id);
      });
    });
    if (!expected.size) return;

    const title = document.createElement('h2');
    title.textContent = 'Homework handed in';
    submissionSummary.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'subject-grid';
    let handedIn = 0;
    let waiting = 0;

    expected.forEach((bucket) => {
      const done = submissions
        .forAssignment(bucket.assignment.id)
        .filter((row) => bucket.students.indexOf(row.studentId) !== -1);
      handedIn += done.length;
      waiting += bucket.students.length - done.length;

      const percent = bucket.students.length
        ? Math.round((done.length / bucket.students.length) * 100)
        : 0;

      const card = document.createElement('div');
      card.className = 'subject-card';

      const head = document.createElement('div');
      head.className = 'subject-head';
      const name = document.createElement('strong');
      name.textContent = bucket.assignment.title;
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
      meta.textContent = `${done.length} of ${bucket.students.length} handed in · due ${formatDate(
        bucket.assignment.due
      )}`;

      card.appendChild(head);
      card.appendChild(bar);
      card.appendChild(meta);
      grid.appendChild(card);
    });

    submissionSummary.appendChild(grid);

    const note = document.createElement('p');
    note.className = 'subject-note';
    note.textContent = `${handedIn} file${handedIn === 1 ? '' : 's'} uploaded, ${waiting} still waiting across ${expected.size} set assignment${expected.size === 1 ? '' : 's'}.`;
    submissionSummary.appendChild(note);
  }

  function renderSubmissionRows(scoped) {
    const rows = submissionRowsFor(scoped);
    submissionRows.textContent = '';
    submissionEmpty.hidden = rows.length > 0;

    rows.forEach((entry) => {
      const assignment = assignmentList ? assignmentList.find(entry.row.assignmentId) : null;
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.textContent = entry.student.name;

      const workCell = document.createElement('td');
      const title = document.createElement('strong');
      title.textContent = assignment ? assignment.title : entry.row.assignmentId;
      const meta = document.createElement('span');
      meta.textContent = assignment ? assignment.subject : 'Unknown assignment';
      workCell.appendChild(title);
      workCell.appendChild(meta);

      const fileCell = document.createElement('td');
      fileCell.textContent = entry.row.name;

      const sizeCell = document.createElement('td');
      sizeCell.textContent = formatBytes(entry.row.size);

      const whenCell = document.createElement('td');
      whenCell.textContent = relativeTime(entry.row.uploadedAt);

      const actionCell = document.createElement('td');
      const actions = document.createElement('div');
      actions.className = 'pack-actions';
      actions.appendChild(makeButton('ghost-btn', 'Open', () => openUpload(entry.row)));
      actionCell.appendChild(actions);

      row.appendChild(nameCell);
      row.appendChild(workCell);
      row.appendChild(fileCell);
      row.appendChild(sizeCell);
      row.appendChild(whenCell);
      row.appendChild(actionCell);
      submissionRows.appendChild(row);
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
    const handedIn = submissionRowsFor(scoped).length;

    staffBadge.textContent = `${staff.label} dashboard`;
    staffGreeting.textContent = `Progress across ${scoped.length} student${scoped.length === 1 ? '' : 's'}`;
    staffNote.textContent = `Signed in as ${staff.name}. Students cannot see this page or each other’s progress, and only faculty and admin roles reach the homework they have uploaded.`;

    staffRing.style.setProperty('--value', overall);
    staffRingValue.textContent = `${overall}%`;
    staffDoneCount.textContent = `${totalDone} of ${totalLessons}`;

    staffStats.textContent = '';
    [
      { value: everyReport.length, label: 'Students enrolled' },
      { value: `${average}%`, label: 'Average per student' },
      { value: finished, label: 'Tracks finished' },
      { value: untouched, label: 'Not started' },
      { value: `${Math.round(minutes / 60)} hr`, label: 'Study time logged' },
      { value: handedIn, label: 'Files handed in' }
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
    renderSubmissionSummary(scoped);
    renderSubmissionRows(scoped);
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
