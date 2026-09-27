const fs = require('fs');
const path = require('path');
const vm = require('vm');

const web = path.join(__dirname, 'web');
const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k)
};

const sandbox = { window: { localStorage }, console };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

for (const f of ['data/lessons.js', 'data/staff.js', 'data/store.js']) {
  vm.runInContext(fs.readFileSync(path.join(web, f), 'utf8'), sandbox, { filename: f });
}

const w = sandbox.window;
const R = w.NLH_ROSTER;
const P = w.NLH_PROGRESS;
const lessons = w.NLH_LESSONS;

let pass = 0, fail = 0;
const check = (label, cond, extra = '') => {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label + (extra ? ' -> ' + extra : '')); }
};

console.log('--- roster ---');
const students = R.all(lessons);
check('3 demo students present', students.filter(s => s.demo).length === 3, JSON.stringify(students.map(s=>s.id)));
check('every student has a total', students.every(s => typeof s.total === 'number' && s.total > 0));
check('subjects resolved per track', students.every(s => Array.isArray(s.subjects) && s.subjects.length > 0));
const aarav = students.find(s => s.name === 'Aarav Sharma');
check('demo id is deterministic', aarav.id === 'demo-aarav-sharma', aarav && aarav.id);
const middleCount = lessons.filter(l => l.track === 'middle').length;
check('middle track total matches lesson count', aarav.total === middleCount, `${aarav.total} vs ${middleCount}`);

console.log('--- lookup ---');
check('finds by name prefix', R.find(students, 'aarav').length === 1);
check('finds by full name', R.find(students, 'Mehak Kaur').length === 1);
check('finds by generated id', R.find(students, 'demo-simranjit-singh').length === 1);
check('rejects 1-char query', R.find(students, 'a').length === 0);
check('unknown name returns nothing', R.find(students, 'zzzz').length === 0);

console.log('--- per-student isolation ---');
const ids = lessons.filter(l => l.track === 'middle').slice(0, 3).map(l => l.id);
P.save(aarav.id, { completed: new Set(ids), packs: new Set(['middle']) });
const mehak = students.find(s => s.name === 'Mehak Kaur');
check('student A record saved', P.forStudent(aarav.id).completed.length === 3);
check('student B unaffected (no bleed)', P.forStudent(mehak.id).completed.length === 0);
check('packs stored per student', P.forStudent(aarav.id).packs.includes('middle'));
check('record has updatedAt', typeof P.forStudent(aarav.id).updatedAt === 'string' && P.forStudent(aarav.id).updatedAt.length > 0);
check('unknown id returns empty', P.forStudent('nope').completed.length === 0);

console.log('--- enrollment additions ---');
localStorage.setItem('nabha-learning-hub-enrollments', JSON.stringify([
  { id: 'NLH-2026-1234', fullName: 'Simranjit Singh', grade: '4', village: 'Sangowal', track: 'primary' }
]));
const grown = R.all(lessons);
check('new enrollment appears', grown.some(s => s.name === 'Simranjit Singh' && !s.demo));
check('enrollment keeps its NLH id', grown.some(s => s.id === 'NLH-2026-1234'));
check('no duplicate demo rows', grown.filter(s => s.demo).length === 3, String(grown.filter(s=>s.demo).length));
localStorage.removeItem('nabha-learning-hub-enrollments');

console.log('--- legacy migration ---');
store.clear();
localStorage.setItem('nabha-learning-hub-portal', JSON.stringify({ student: { id: 'legacy-1', name: 'Old Student', grade: '5', village: 'X', track: 'primary' }, completed: ['pri-eng-01'] }));
localStorage.setItem('nabha-learning-hub-packs', JSON.stringify(['primary']));
const migrated = P.migrate();
check('legacy progress migrated', Array.isArray(migrated['legacy-1'].completed) && migrated['legacy-1'].completed.length === 1);
check('legacy packs migrated', migrated['legacy-1'].packs.includes('primary'));
P.migrate();
check('migration is idempotent', Object.keys(P.all()).length === 1, String(Object.keys(P.all()).length));

console.log('--- staff passcodes ---');
const staff = w.NLH_STAFF;
check('faculty passcodes work', staff.filter(s => s.role === 'faculty').every(s => s.passcode === 'nabha-faculty-2026'));
check('admin passcode works', staff.filter(s => s.role === 'admin').every(s => s.passcode === 'nabha-admin-2026'));
check('no faculty shares the admin code', staff.filter(s => s.role === 'faculty').every(s => s.passcode !== 'nabha-admin-2026'));
check('bad passcode matches nothing', staff.find(s => s.passcode === 'wrong') === undefined);
check('every staff entry has a role', staff.every(s => s.role === 'faculty' || s.role === 'admin'));

console.log('--- enrollment form still writes same key ---');
const portalScript = fs.readFileSync(path.join(web, '..', 'university_portal', 'script.js'), 'utf8');
check('university_portal uses the shared enrollment key', portalScript.includes("'nabha-learning-hub-enrollments'"));
const portalHtml = fs.readFileSync(path.join(web, '..', 'university_portal', 'index.html'), 'utf8');
check('university_portal links to the student portal', portalHtml.includes('../web/index.html'));

console.log('');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
