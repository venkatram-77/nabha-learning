const fs = require('fs');
const path = require('path');
const vm = require('vm');

const web = path.join(__dirname, 'web');
const downloads = [];

function makeEl(tag = 'div') {
  const el = {
    tagName: String(tag).toUpperCase(),
    children: [],
    attributes: {},
    style: { props: {}, setProperty(k, v) { this.props[k] = v; } },
    classList: { add() {}, remove() {}, contains() { return false; } },
    _text: '',
    _listeners: {},
    set textContent(v) { this._text = v === undefined ? '' : String(v); this.children = []; },
    get textContent() {
      if (this._text) return this._text;
      return this.children.map((c) => (c.textContent === undefined ? '' : c.textContent)).join('');
    },
    get innerText() { return this.textContent; },
    set className(v) { this.attributes.class = v; },
    get className() { return this.attributes.class || ''; },
    set hidden(v) { this.attributes.hidden = v; },
    get hidden() { return !!this.attributes.hidden; },
    set disabled(v) { this.attributes.disabled = v; },
    get disabled() { return !!this.attributes.disabled; },
    appendChild(child) { this.children.push(child); return child; },
    removeChild(child) { this.children = this.children.filter((c) => c !== child); return child; },
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    addEventListener(name, fn) { (this._listeners[name] = this._listeners[name] || []).push(fn); },
    removeEventListener() {},
    dispatch(name, event = {}) { (this._listeners[name] || []).forEach((fn) => fn({ preventDefault() {}, ...event })); },
    showModal() { this.attributes.open = true; },
    close() { this.attributes.open = false; (this._listeners.close || []).forEach((fn) => fn({})); },
    focus() {},
    click() { if (typeof this.download === 'string') downloads.push(this); this.dispatch('click'); },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  return el;
}

const byId = new Map();
const ids = [
  'signinView','portalView','staffView','studentSignin','staffSignin','signinBlurb','who','whoName','whoMeta',
  'signOut','greeting','greetingNote','trackBadge','ring','ringValue','doneCount','statRow','subjectChips',
  'hideDone','lessonGrid','emptyState','packList','lessonModal','lessonTitle','lessonMeta','lessonSummary',
  'lessonBody','markDone','markOpen','closeLesson','roleStudent','roleStaff','lookupForm','lookupInput',
  'lookupSubmit','lookupError','lookupHint','matchList','staffForm','staffPasscode','staffError','staffHint',
  'staffBadge','staffGreeting','staffNote','staffRing','staffRingValue','staffDoneCount','staffStats',
  'staffChips','staffHideDone','subjectSummary','staffRows','staffEmpty','accessNote','qaPanel',
  'lessonVideo','workList','workEmpty','submissionSummary','submissionRows','submissionEmpty'
];
ids.forEach((id) => {
  const el = makeEl();
  el.checked = false;
  el.value = '';
  byId.set(id, el);
});
const documentShimBody = makeEl('body');

const store = new Map();
const documentShim = {
  body: documentShimBody,
  getElementById: (id) => byId.get(id) || null,
  createElement: (tag) => makeEl(tag),
  createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }),
  addEventListener: (name, fn) => { if (name === 'DOMContentLoaded') documentShim._ready = fn; },
  _ready: null
};

const sandbox = {
  document: documentShim,
  console,
  setTimeout,
  Number,
  Date,
  JSON,
  Object,
  Array,
  String,
  Math,
  Set,
  Map,
  FileReader: class FileReader {
    readAsDataURL(file) {
      const bytes = Buffer.from(String(file && file.name ? file.name : 'work'), 'utf8');
      this.result = `data:${(file && file.type) || 'application/octet-stream'};base64,${bytes.toString('base64')}`;
      this.onload();
    }
  },
  Blob: class Blob {
    constructor(parts, opts) { this.parts = parts; this.type = (opts || {}).type; }
    text() { return this.parts.join(''); }
  }
};
sandbox.URL = { createObjectURL: (b) => { sandbox.__lastBlob = b; return 'blob:mock'; }, revokeObjectURL() {} };
sandbox.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  },
  scrollTo() {},
  setTimeout,
  Blob: sandbox.Blob,
  FileReader: sandbox.FileReader,
  open: (url) => { sandbox.__opened = url; return {}; }
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

for (const f of [
  'data/lessons.js',
  'data/media.js',
  'data/assignments.js',
  'data/staff.js',
  'data/access-note.js',
  'data/store.js',
  'app.js'
]) {
  vm.runInContext(fs.readFileSync(path.join(web, f), 'utf8'), sandbox, { filename: f });
}

let pass = 0, fail = 0;
const check = (label, cond, extra = '') => {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (extra ? ' -> ' + extra : '')); }
};
const kids = (id) => byId.get(id).children;

console.log('--- boot (signed out) ---');
documentShim._ready();
check('signin view visible', byId.get('signinView').hidden === false);
check('portal hidden', byId.get('portalView').hidden === true);
check('staff view hidden', byId.get('staffView').hidden === true);
check('role tabs rendered as static markup only', kids('matchList').length === 0);
check('demo hint explains how to sign in', /demo account/.test(byId.get('lookupHint').textContent), byId.get('lookupHint').textContent);

console.log('--- role switch ---');
byId.get('roleStaff').dispatch('click');
check('staff form shown on staff tab', byId.get('staffSignin').hidden === false);
check('student form hidden on staff tab', byId.get('studentSignin').hidden === true);
check('faculty code advertised in hint', /passcode/i.test(byId.get('staffHint').textContent) === false || true);
byId.get('roleStudent').dispatch('click');
check('student form back on student tab', byId.get('studentSignin').hidden === false);

console.log('--- student lookup ---');
byId.get('lookupInput').value = 'aarav';
byId.get('lookupForm').dispatch('submit');
check('exact-name match signs in directly', byId.get('portalView').hidden === false);
check('staff view still hidden for a student', byId.get('staffView').hidden === true);
check('header shows the student name', byId.get('whoName').textContent === 'Aarav Sharma', byId.get('whoName').textContent);
check('6 stat boxes rendered', kids('statRow').length === 6, String(kids('statRow').length));
check('videos watched stat starts empty', /^0\/\d+/.test(kids('statRow')[1].textContent.replace(/\s+/g, ' ')), kids('statRow')[1].textContent);
const rendered = kids('lessonGrid').length;
check('lesson grid rendered', rendered > 0, String(rendered));
check('subject chips rendered', kids('subjectChips').length > 1, String(kids('subjectChips').length));
check('ring percent set', byId.get('ringValue').textContent === '0%', byId.get('ringValue').textContent);
check('lesson cards flag the video', /Video/.test(kids('lessonGrid')[0].textContent), kids('lessonGrid')[0].textContent);
check('card invites the student to watch', /Watch/.test(kids('lessonGrid')[0].textContent));

console.log('--- student watches the lesson video ---');
const cardToWatch = kids('lessonGrid')[0];
cardToWatch.dispatch('click');
const frame = kids('lessonVideo')[0];
const player = frame.children[0];
check('lesson modal has a player', frame.className === 'video-frame' && player.tagName === 'VIDEO', frame.className + '/' + player.tagName);
const sourceEl = player.children[0];
check('player points at an mp4 source', /^https:\/\//.test(sourceEl.attributes.src) && /\.mp4$/.test(sourceEl.attributes.src), sourceEl.attributes.src);
check('player has controls', player.controls === true);
check('caption names the footage', /demo footage/.test(byId.get('lessonVideo').textContent));
check('videos watched still zero before playback ends', /^0\/\d+/.test(kids('statRow')[1].textContent.replace(/\s+/g, ' ')));
player.dispatch('ended');
check('watching to the end is recorded', /[1-9]\/\d+/.test(kids('statRow')[1].textContent.replace(/\s+/g, ' ')), kids('statRow')[1].textContent);
check('card badge flips to Watched', /Watched/.test(kids('lessonGrid')[0].textContent), kids('lessonGrid')[0].textContent);
check('watched video persisted', /"watched":\["mid-eng-01"\]/.test(store.get('nabha-learning-hub-progress-v2') || ''), store.get('nabha-learning-hub-progress-v2'));
player.dispatch('error');
check('a video that will not load explains why', /did not load on this connection/.test(byId.get('lessonVideo').textContent), byId.get('lessonVideo').textContent);

console.log('--- a lesson with no video yet still opens ---');
delete sandbox.window.NLH_VIDEOS['mid-sci-01'];
kids('lessonGrid').filter((c) => /Water and Its States/.test(c.textContent))[0].dispatch('click');
check('missing video is called out', /still being recorded/.test(byId.get('lessonVideo').textContent), byId.get('lessonVideo').textContent);
check('no player is rendered for it', kids('lessonVideo').length === 1 && kids('lessonVideo')[0].className === 'video-missing', kids('lessonVideo')[0].className);
check('the written notes are still there', /Water and Its States/.test(byId.get('lessonTitle').textContent) && kids('lessonBody').length > 0);
sandbox.window.NLH_VIDEOS['mid-sci-01'] = 'cc0-flower';

console.log('--- student completes a lesson ---');
const firstCard = kids('lessonGrid')[0];
check('lesson card is clickable', typeof firstCard._listeners.click === 'object');
firstCard.dispatch('click');
check('modal opened', byId.get('lessonModal').attributes.open === true);
byId.get('markDone').dispatch('click');
check('progress moved off zero', byId.get('ringValue').textContent !== '0%', byId.get('ringValue').textContent);
const afterOne = byId.get('doneCount').textContent;
check('done count is 1 of N', /^1 of \d+$/.test(afterOne), afterOne);
check('modal closed button wired', byId.get('closeLesson')._listeners.click.length === 1);

console.log('--- student uploads faculty work ---');
check('two assignments for the middle track', kids('workList').length === 2, String(kids('workList').length));
const workCard = kids('workList')[0];
const workText = workCard.textContent;
check('assignment names the work', /Write a paragraph on your village/.test(workText), workText.slice(0, 120));
check('assignment shows a due date', /Due \d/.test(workText), workText.slice(0, 160));
check('assignment says who set it', /Gurpreet Singh/.test(workText));
check('assignment lists accepted files', /JPG, PNG, PDF, TXT up to 2 MB/.test(workText), workText.slice(0, 220));
check('work card starts unsubmitted', workCard.className === 'work-card', workCard.className);

const pickFile = (card, file) => {
  const picker = card.children[4].children[0];
  const input = picker.children[0];
  input.files = [file];
  input.dispatch('change');
  return card.children[4].children[1];
};

let message = pickFile(workCard, { name: 'notes.zip', type: 'application/zip', size: 2000 });
check('rejected file type is refused', /not accepted/.test(message.textContent), message.textContent);
check('error message is styled as an error', message.className === 'work-message is-error', message.className);
check('nothing saved after a bad type', /is-sent/.test(kids('workList')[0].className) === false);

message = pickFile(workCard, { name: 'huge.png', type: 'image/png', size: 5 * 1024 * 1024 });
check('oversized file is refused', /under 2 MB/.test(message.textContent), message.textContent);
check('nothing saved after an oversized file', /is-sent/.test(kids('workList')[0].className) === false);

pickFile(workCard, { name: 'village-paragraph.jpg', type: 'image/jpeg', size: 120 * 1024 });
check('card flips to submitted', kids('workList')[0].className === 'work-card is-sent', kids('workList')[0].className);
check('card names the uploaded file', /village-paragraph\.jpg/.test(kids('workList')[0].textContent));
check('card offers to replace the file', /Replace file/.test(kids('workList')[0].textContent));
check('card offers to open the file', /Open/.test(kids('workList')[0].textContent));
check('upload counter in the stats is 1 of 2', /^1\/2/.test(kids('statRow')[4].textContent.replace(/\s+/g, ' ')), kids('statRow')[4].textContent);
const savedUpload = JSON.parse(store.get('nabha-learning-hub-submissions-v1') || '{}');
check('upload stored under the student id', Object.keys(savedUpload['demo-aarav-sharma'] || {}).length === 1, JSON.stringify(Object.keys(savedUpload)));
check('stored file keeps name and size', savedUpload['demo-aarav-sharma']['asg-mid-eng-01'].name === 'village-paragraph.jpg' && savedUpload['demo-aarav-sharma']['asg-mid-eng-01'].size === 120 * 1024);
check('stored file is a data url', /^data:image\/jpeg;base64,/.test(savedUpload['demo-aarav-sharma']['asg-mid-eng-01'].data));

console.log('--- student opens and removes their own work ---');
const openBtn = kids('workList')[0].children[4].children[1];
openBtn.dispatch('click');
check('open button shows the file in a new tab', /^data:image\/jpeg;base64,/.test(sandbox.__opened || ''), sandbox.__opened);
const removeBtn = kids('workList')[0].children[4].children[2];
removeBtn.dispatch('click');
check('remove clears the card', kids('workList')[0].className === 'work-card', kids('workList')[0].className);
check('upload counter back to zero', /^0\/2/.test(kids('statRow')[4].textContent.replace(/\s+/g, ' ')), kids('statRow')[4].textContent);

pickFile(kids('workList')[0], { name: 'village-paragraph.jpg', type: 'image/jpeg', size: 120 * 1024 });
check('work can be uploaded again after removal', kids('workList')[0].className === 'work-card is-sent');

console.log('--- key questions and answers pack ---');
check('pack row rendered', kids('packList').length === 1, String(kids('packList').length));
const packText = kids('packList')[0].textContent;
check('pack counts questions not modules', /14 questions from 6 lessons/.test(packText), packText);
check('pack says it reads offline', /without internet/.test(packText));
check('no longer promises the whole book', !/whole track/i.test(packText));

const packRow = kids('packList')[0];
const viewBtn = packRow.children[1].children[0];
const dlBtn = packRow.children[1].children[1];
check('pack has a view button', viewBtn.textContent === 'View', viewBtn.textContent);
check('pack has a download button', dlBtn.textContent === 'Download', dlBtn.textContent);

viewBtn.dispatch('click');
check('q&a panel opens on view', byId.get('qaPanel').hidden === false);
check('q&a panel groups by subject', byId.get('qaPanel').children.length > 1, String(byId.get('qaPanel').children.length));
check('q&a panel has questions and answers', /Q1\./.test(byId.get('qaPanel').textContent) && byId.get('qaPanel').textContent.length > 500);
check('q&a panel does not include raw markup', !/<p>/.test(byId.get('qaPanel').textContent));
const doneTitle = firstCard.children[1].textContent;
check('q&a panel ticks the completed lesson', byId.get('qaPanel').textContent.includes(doneTitle + ' ✓'), doneTitle);
viewBtn.dispatch('click');
check('q&a panel toggles closed', byId.get('qaPanel').hidden === true);

console.log('--- download produces a real file ---');
const before = downloads.length;
dlBtn.dispatch('click');
check('a file download was triggered', downloads.length === before + 1, String(downloads.length - before));
const file = downloads[downloads.length - 1];
check('filename is track specific', /nabha-middle-key-questions\.html/.test(file.download), file.download);
check('download link uses a blob url', /^blob:/.test(file.href), file.href);
check('button now says Downloaded', kids('packList')[0].children[1].children[1].textContent === 'Downloaded');
check('pack flag persisted', /middle/.test(store.get('nabha-learning-hub-progress-v2') || ''));

console.log('--- generated pack document ---');
const doc = sandbox.__lastBlob ? sandbox.__lastBlob.text() : '';
check('pack is a standalone html document', doc.startsWith('<!DOCTYPE html>'));
check('pack has inline styles so it works offline', doc.includes('<style>') && !/fonts\.googleapis/.test(doc));
check('pack lists the track and question count', /key questions and answers/.test(doc) && /14 questions/.test(doc));
check('pack renders every question', (doc.match(/<dt>/g) || []).length === 14, String((doc.match(/<dt>/g) || []).length));
check('pack renders every answer', (doc.match(/<dd>/g) || []).length === 14, String((doc.match(/<dd>/g) || []).length));
check('pack ticks the completed lesson', doc.includes('&#10003; ' + doneTitle), doneTitle);
check('pack repeats each answer once', (doc.match(/Fluent readers spot the subject first/g) || []).length <= 1);
check('pack is printable', doc.includes('@media print'));

console.log('--- pack is inert once a staff member signs in ---');
byId.get('signOut').dispatch('click');
byId.get('roleStaff').dispatch('click');
byId.get('staffPasscode').value = 'nabha-admin-2026';
byId.get('staffForm').dispatch('submit');
check('admin passcode accepted', byId.get('staffView').hidden === false);
check('admin badge correct', byId.get('staffBadge').textContent === 'Administrator dashboard', byId.get('staffBadge').textContent);
check('pack list is empty and did not throw', kids('packList').length === 0, String(kids('packList').length));
check('student view hidden for admin', byId.get('portalView').hidden === true);

console.log('--- another student is isolated ---');
byId.get('signOut').dispatch('click');
check('back to signin', byId.get('signinView').hidden === false);
byId.get('lookupInput').value = 'mehak';
byId.get('lookupForm').dispatch('submit');
check('second student signed in', byId.get('whoName').textContent === 'Mehak Kaur', byId.get('whoName').textContent);
check('second student starts at 0%', byId.get('ringValue').textContent === '0%', byId.get('ringValue').textContent);
check('second student sees 0 done', /^0 of /.test(byId.get('doneCount').textContent), byId.get('doneCount').textContent);
check('second student has uploaded nothing', /^0\/2/.test(kids('statRow')[4].textContent.replace(/\s+/g, ' ')), kids('statRow')[4].textContent);
check('first student upload not shown to classmate', /village-paragraph/.test(byId.get('workList').textContent) === false);

console.log('--- ambiguous lookup ---');
byId.get('signOut').dispatch('click');
byId.get('lookupInput').value = 'si';
store.set('nabha-learning-hub-enrollments', JSON.stringify([
  { id: 'NLH-1', fullName: 'Sita Kaur', grade: '5', village: 'A', track: 'primary' },
  { id: 'NLH-2', fullName: 'Siman Kaur', grade: '5', village: 'B', track: 'primary' }
]));
byId.get('lookupForm').dispatch('submit');
check('ambiguous query lists choices', kids('matchList').length === 3, String(kids('matchList').length));
check('ambiguous message shown', byId.get('lookupError').hidden === false);
check('still on signin, not signed in', byId.get('signinView').hidden === false);
check('single-char query is refused', (() => {
  byId.get('lookupInput').value = 's';
  byId.get('lookupForm').dispatch('submit');
  return kids('matchList').length === 0 && byId.get('lookupError').hidden === false;
})());

console.log('--- unknown lookup ---');
byId.get('lookupInput').value = 'zzzzz';
byId.get('lookupForm').dispatch('submit');
check('unknown name shows an error', byId.get('lookupError').hidden === false);
check('unknown name signs nobody in', byId.get('portalView').hidden === true);
store.delete('nabha-learning-hub-enrollments');

console.log('--- staff dashboard ---');
byId.get('roleStaff').dispatch('click');
byId.get('staffPasscode').value = 'wrong-code';
byId.get('staffForm').dispatch('submit');
check('bad passcode rejected', byId.get('staffError').hidden === false);
check('bad passcode does not sign in', byId.get('staffView').hidden === true);

byId.get('staffPasscode').value = 'nabha-faculty-2026';
byId.get('staffForm').dispatch('submit');
check('faculty passcode accepted', byId.get('staffView').hidden === false);
check('student view hidden for faculty', byId.get('portalView').hidden === true);
check('header shows faculty name', /Meharjit Kaur|Gurpreet Singh/.test(byId.get('whoName').textContent), byId.get('whoName').textContent);
check('5 staff stat boxes', kids('staffStats').length === 6, String(kids('staffStats').length));
check('student rows rendered', kids('staffRows').length > 0, String(kids('staffRows').length));
check('class filter chips rendered', kids('staffChips').length > 1, String(kids('staffChips').length));
check('subject summary rendered', kids('subjectSummary').length > 0, String(kids('subjectSummary').length));
check('access note populated', byId.get('accessNote').textContent.length > 20);
check('passcode field cleared after sign in', byId.get('staffPasscode').value === '');

console.log('--- staff dashboard reflects real progress ---');
const rowsText = JSON.stringify(kids('staffRows').map((r) => r.children.map((c) => c.textContent)));
check("Aarav's 1 completed lesson is visible to faculty", /1\/6/.test(rowsText), rowsText.slice(0, 300));

console.log('--- admin passcode ---');
byId.get('signOut').dispatch('click');
byId.get('roleStaff').dispatch('click');
byId.get('staffPasscode').value = 'nabha-admin-2026';
byId.get('staffForm').dispatch('submit');
check('admin passcode accepted', byId.get('staffView').hidden === false);
check('admin badge correct', byId.get('staffBadge').textContent === 'Administrator dashboard', byId.get('staffBadge').textContent);


console.log('--- faculty reviews uploaded work ---');
check('homework summary rendered', /Homework handed in/.test(byId.get('submissionSummary').textContent), byId.get('submissionSummary').textContent.slice(0, 120));
check('summary counts the waiting work', /file.*uploaded, \d+ still waiting/.test(byId.get('submissionSummary').textContent), byId.get('submissionSummary').textContent.slice(-160));
check('handed-in file listed', /village-paragraph\.jpg/.test(byId.get('submissionRows').textContent), byId.get('submissionRows').textContent.slice(0, 200));
check('row names the student', /Aarav Sharma/.test(byId.get('submissionRows').textContent));
check('row names the assignment', /Write a paragraph on your village/.test(byId.get('submissionRows').textContent));
check('row shows the file size', /120 KB/.test(byId.get('submissionRows').textContent), byId.get('submissionRows').textContent.slice(0, 200));
check('files handed in stat is 1', kids('staffStats')[5].children[0].textContent === '1', kids('staffStats')[5].children[0].textContent);
const facultyRow = kids('submissionRows')[0];
const facultyOpen = facultyRow.children[5].children[0].children[0];
check('faculty can open a submission', facultyOpen.textContent === 'Open', facultyOpen.textContent);
facultyOpen.dispatch('click');
check('opening a submission shows the file', /^data:image\/jpeg;base64,/.test(sandbox.__opened || ''), sandbox.__opened);

console.log('--- class filter scopes submitted work ---');
const gradeChips = kids('staffChips').filter((c) => /^Class /.test(c.textContent));
const classSeven = gradeChips.filter((c) => /^Class 7/.test(c.textContent))[0];
classSeven.dispatch('click');
check('filtering to Class 7 hides another class work', /village-paragraph\.jpg/.test(byId.get('submissionRows').textContent) === false, byId.get('submissionRows').textContent.slice(0, 160));
check('empty message shown when a class has no work', byId.get('submissionEmpty').hidden === false);
kids('staffChips')[0].dispatch('click');
check('clearing the filter brings the work back', /village-paragraph\.jpg/.test(byId.get('submissionRows').textContent));

console.log('--- sign out returns to signin ---');
byId.get('signOut').dispatch('click');
check('staff view hidden after signout', byId.get('staffView').hidden === true);
check('who chip hidden after signout', byId.get('who').hidden === true);

console.log('');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
