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

for (const f of ['data/lessons.js', 'data/media.js', 'data/assignments.js', 'data/staff.js', 'data/store.js']) {
  vm.runInContext(fs.readFileSync(path.join(web, f), 'utf8'), sandbox, { filename: f });
}

const w = sandbox.window;
const R = w.NLH_ROSTER;
const P = w.NLH_PROGRESS;
const S = w.NLH_SUBMISSIONS;
const A = w.NLH_ASSIGNMENT_LIST;
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

console.log('--- lesson videos ---');
const missingVideo = lessons.filter((l) => !w.NLH_VIDEO.forLesson(l));
check('every syllabus lesson has a video', missingVideo.length === 0, missingVideo.map((l) => l.id).join(','));
check('video source is an absolute url', lessons.every((l) => /^https:\/\//.test(w.NLH_VIDEO.forLesson(l).src)));
check('video source is a playable file or embed', lessons.every((l) => ['file', 'embed'].indexOf(w.NLH_VIDEO.forLesson(l).type) !== -1));
check('stats agree with the map', w.NLH_VIDEO.stats(lessons).ready === lessons.length);
check('stats count the whole library', w.NLH_VIDEO.stats(lessons).total === lessons.length);
check('unknown lesson has no video', w.NLH_VIDEO.forLesson({ id: 'nope-99' }) === null);
check('every media key in the map exists', Object.keys(w.NLH_VIDEOS).every((id) => !!w.NLH_MEDIA[w.NLH_VIDEOS[id]]));
check('no lesson is mapped twice to a broken entry', Object.keys(w.NLH_VIDEOS).length === lessons.length, `${Object.keys(w.NLH_VIDEOS).length} vs ${lessons.length}`);
w.NLH_MEDIA['embed-demo'] = { type: 'embed', src: 'https://www.youtube-nocookie.com/embed/abc123', label: 'Embed demo' };
w.NLH_VIDEOS['mid-sci-02'] = 'embed-demo';
check('an embed source resolves as an embed', w.NLH_VIDEO.forLesson({ id: 'mid-sci-02' }).type === 'embed');
check('an empty media entry resolves to nothing', (() => { w.NLH_MEDIA.empty = { type: 'file' }; w.NLH_VIDEOS['mid-sci-01'] = 'empty'; return w.NLH_VIDEO.forLesson({ id: 'mid-sci-01' }) === null; })());
delete w.NLH_VIDEOS['mid-sci-01'];
delete w.NLH_VIDEOS['mid-sci-02'];

console.log('--- faculty assignments ---');
const tracks = Array.from(new Set(lessons.map((l) => l.track)));
check('every track has work set', tracks.every((t) => A.forTrack(t).length > 0), tracks.join(','));
check('assignment ids are unique', new Set(w.NLH_ASSIGNMENTS.map((a) => a.id)).size === w.NLH_ASSIGNMENTS.length);
check('every assignment belongs to a real track', w.NLH_ASSIGNMENTS.every((a) => tracks.indexOf(a.track) !== -1));
check('every assignment has instructions for the student', w.NLH_ASSIGNMENTS.every((a) => String(a.instructions).length > 60));
check('every assignment names the teacher', w.NLH_ASSIGNMENTS.every((a) => String(a.setBy).length > 3));
check('every assignment has a cap on file size', w.NLH_ASSIGNMENTS.every((a) => a.maxMb >= 1 && a.maxMb <= 5));
check('due dates parse', w.NLH_ASSIGNMENTS.every((a) => !Number.isNaN(new Date(a.due).getTime())));
check('find returns the matching assignment', A.find('asg-mid-eng-01').subject === 'English');
check('find returns undefined for an unknown id', A.find('asg-nope') === undefined);
check('mime types render as short names', A.acceptList(A.find('asg-mid-sci-01')).join(', ') === 'JPG, PNG, PDF', A.acceptList(A.find('asg-mid-sci-01')).join(', '));

const sciWork = A.find('asg-mid-sci-01');
check('accepts a listed mime type', A.acceptsFile(sciWork, { name: 'drawing.jpg', type: 'image/jpeg' }));
check('accepts a matching extension when the browser sends no type', A.acceptsFile(sciWork, { name: 'DRAWING.PDF', type: '' }));
check('rejects a type that is not listed', A.acceptsFile(sciWork, { name: 'answer.zip', type: 'application/zip' }) === false);
check('rejects a matching name with the wrong extension', A.acceptsFile(sciWork, { name: 'drawing.gif', type: '' }) === false);
check('a track assignment is not offered to another track', A.forTrack('primary').every((a) => a.track === 'primary'));
check('overdue is false the day before the deadline', A.isOverdue({ due: '2026-12-01' }, '2026-11-30T09:00:00Z') === false);
check('overdue is true the day after the deadline', A.isOverdue({ due: '2026-12-01' }, '2026-12-02T09:00:00Z') === true);
check('an assignment with no due date is never overdue', A.isOverdue({ due: '' }, '2026-12-02T09:00:00Z') === false);

console.log('--- uploaded work storage ---');
store.clear();
const work = { name: 'village.jpg', type: 'image/jpeg', size: 2048, data: 'data:image/jpeg;base64,AAAA' };
check('upload saves', S.save('demo-aarav-sharma', 'asg-mid-eng-01', work));
check('upload reads back by student and assignment', S.get('demo-aarav-sharma', 'asg-mid-eng-01').name === 'village.jpg');
check('upload records an upload time', typeof S.get('demo-aarav-sharma', 'asg-mid-eng-01').uploadedAt === 'string');
check('missing upload reads as nothing', S.get('demo-aarav-sharma', 'asg-mid-sci-01') === null);
check('unknown student reads as nothing', S.get('nobody', 'asg-mid-eng-01') === null);
check('list has one row', S.list().length === 1);
check('forStudent returns the upload', S.forStudent('demo-aarav-sharma').length === 1);
check('a classmate sees no uploads', S.forStudent('demo-mehak-kaur').length === 0);
check('faculty query by assignment finds it', S.forAssignment('asg-mid-eng-01').length === 1);
check('faculty query by another assignment does not', S.forAssignment('asg-mid-sci-01').length === 0);
check('a file with no data is refused', S.save('demo-aarav-sharma', 'asg-mid-sci-01', { name: 'x.jpg', size: 10, data: '' }) === false);
check('a file over the storage cap is refused', S.save('demo-aarav-sharma', 'asg-mid-sci-01', { name: 'huge.jpg', size: S.DEFAULT_MAX_BYTES + 1, data: 'data:image/jpeg;base64,AAAA' }) === false);
check('the refused oversized file left nothing behind', S.forAssignment('asg-mid-sci-01').length === 0);

const realSetItem = localStorage.setItem;
localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
check('a full device fails the upload instead of losing it silently', S.save('demo-mehak-kaur', 'asg-mid-sci-01', work) === false);
localStorage.setItem = realSetItem;
check('the failed upload was not written', S.forStudent('demo-mehak-kaur').length === 0);

S.save('demo-aarav-sharma', 'asg-mid-eng-01', { name: 'village-v2.jpg', type: 'image/jpeg', size: 3000, data: 'data:image/jpeg;base64,BBBB' });
check('re-uploading replaces the earlier file', S.list().length === 1 && S.get('demo-aarav-sharma', 'asg-mid-eng-01').name === 'village-v2.jpg');
check('remove deletes the upload', S.remove('demo-aarav-sharma', 'asg-mid-eng-01'));
check('removing twice is harmless', S.remove('demo-aarav-sharma', 'asg-mid-eng-01') === false);
check('the student entry is cleared when empty', S.forStudent('demo-aarav-sharma').length === 0);

console.log('--- watched videos in the progress record ---');
store.clear();
P.save('demo-aarav-sharma', { completed: new Set(['mid-eng-01']), packs: new Set(), watched: new Set(['mid-eng-01']) });
check('watched video saved', P.forStudent('demo-aarav-sharma').watched.length === 1);
check('markWatched adds a lesson', P.markWatched('demo-aarav-sharma', 'mid-sci-01').length === 2);
check('markWatched does not duplicate', P.markWatched('demo-aarav-sharma', 'mid-sci-01').length === 2);
check('watched does not disturb completed lessons', P.forStudent('demo-aarav-sharma').completed.length === 1);
check('watched does not leak to a classmate', P.forStudent('demo-mehak-kaur').watched.length === 0);
check('an older record without watched still loads', (() => {
  localStorage.setItem(P.KEY, JSON.stringify({ 'demo-simranjit-singh': { completed: ['pri-eng-01'], packs: [] } }));
  return P.forStudent('demo-simranjit-singh').watched.length === 0 && P.forStudent('demo-simranjit-singh').completed.length === 1;
})());
check('migration seeds an empty watched list', (() => {
  store.clear();
  localStorage.setItem(P.LEGACY_KEY, JSON.stringify({ student: { id: 'legacy-2' }, completed: ['pri-math-01'] }));
  return P.migrate()['legacy-2'].watched.length === 0;
})());
check('progress and uploads use different keys', P.KEY !== S.KEY);

console.log('');
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
