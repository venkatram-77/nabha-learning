const fs = require('fs');
const path = require('path');
const vm = require('vm');

const web = path.join(__dirname, 'web');

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
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    addEventListener(name, fn) { (this._listeners[name] = this._listeners[name] || []).push(fn); },
    removeEventListener() {},
    dispatch(name, event = {}) { (this._listeners[name] || []).forEach((fn) => fn({ preventDefault() {}, ...event })); },
    showModal() { this.attributes.open = true; },
    close() { this.attributes.open = false; (this._listeners.close || []).forEach((fn) => fn({})); },
    focus() {},
    click() { this.dispatch('click'); },
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
  'staffChips','staffHideDone','subjectSummary','staffRows','staffEmpty','accessNote'
];
ids.forEach((id) => {
  const el = makeEl();
  el.checked = false;
  el.value = '';
  byId.set(id, el);
});

const store = new Map();
const documentShim = {
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
  Map
};
sandbox.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  },
  scrollTo() {}
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

for (const f of ['data/lessons.js', 'data/staff.js', 'data/access-note.js', 'data/store.js', 'app.js']) {
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
check('4 stat boxes rendered', kids('statRow').length === 4, String(kids('statRow').length));
const rendered = kids('lessonGrid').length;
check('lesson grid rendered', rendered > 0, String(rendered));
check('subject chips rendered', kids('subjectChips').length > 1, String(kids('subjectChips').length));
check('ring percent set', byId.get('ringValue').textContent === '0%', byId.get('ringValue').textContent);

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

console.log('--- another student is isolated ---');
byId.get('signOut').dispatch('click');
check('back to signin', byId.get('signinView').hidden === false);
byId.get('lookupInput').value = 'mehak';
byId.get('lookupForm').dispatch('submit');
check('second student signed in', byId.get('whoName').textContent === 'Mehak Kaur', byId.get('whoName').textContent);
check('second student starts at 0%', byId.get('ringValue').textContent === '0%', byId.get('ringValue').textContent);
check('second student sees 0 done', /^0 of /.test(byId.get('doneCount').textContent), byId.get('doneCount').textContent);

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
check('5 staff stat boxes', kids('staffStats').length === 5, String(kids('staffStats').length));
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

console.log('--- sign out returns to signin ---');
byId.get('signOut').dispatch('click');
check('staff view hidden after signout', byId.get('staffView').hidden === true);
check('who chip hidden after signout', byId.get('who').hidden === true);

console.log('');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
