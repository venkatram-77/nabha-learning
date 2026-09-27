window.NLH_ROSTER = {
  MAX_STUDENTS: 200,

  all: function all(lessons) {
    var enrollments = readJson('nabha-learning-hub-enrollments', []);
    var demos = window.NLH_DEMO_STUDENTS || [];
    var students = [];
    var seen = {};

    enrollments.forEach(function push(entry) {
      if (!entry || !entry.fullName) return;
      var id = entry.id || 'nlh-' + entry.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (seen[id]) return;
      seen[id] = true;
      students.push({
        id: id,
        name: entry.fullName,
        grade: entry.grade,
        village: entry.village,
        track: entry.track,
        demo: false
      });
    });

    demos.forEach(function pushDemo(entry) {
      var id = 'demo-' + String(entry.name).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (seen[id]) return;
      seen[id] = true;
      students.push({
        id: id,
        name: entry.name,
        grade: entry.grade,
        village: entry.village,
        track: entry.track,
        demo: true
      });
    });

    if (!lessons || !lessons.length) return students;

    students.forEach(function normalise(student) {
      if (!student.track) return;
      var trackLessons = lessons.filter(function byTrack(lesson) {
        return lesson.track === student.track;
      });
      var subjects = [];
      trackLessons.forEach(function collect(lesson) {
        if (subjects.indexOf(lesson.subject) === -1) subjects.push(lesson.subject);
      });
      student.total = trackLessons.length;
      student.subjects = subjects;
      student.demo = student.demo === true;
    });

    return students;
  },

  find: function find(students, query) {
    var needle = String(query || '').trim().toLowerCase();
    if (needle.length < 2) return [];
    return students.filter(function matches(student) {
      return (
        student.name.toLowerCase().indexOf(needle) === 0 ||
        student.id.toLowerCase() === needle
      );
    });
  },

  trackFor: function trackFor(grade) {
    var value = Number(grade);
    if (value <= 5) return 'primary';
    if (value <= 8) return 'middle';
    return 'career';
  }
};

window.NLH_PROGRESS = {
  KEY: 'nabha-learning-hub-progress-v2',
  LEGACY_KEY: 'nabha-learning-hub-portal',
  LEGACY_PACK_KEY: 'nabha-learning-hub-packs',

  all: function all() {
    return readJson(this.KEY, {});
  },

  forStudent: function forStudent(id) {
    var record = this.all()[id];
    if (!record) {
      return { completed: [], packs: [], updatedAt: '' };
    }
    return {
      completed: Array.isArray(record.completed) ? record.completed : [],
      packs: Array.isArray(record.packs) ? record.packs : [],
      updatedAt: record.updatedAt || ''
    };
  },

  save: function save(id, record) {
    var store = this.all();
    store[id] = {
      completed: Array.from(record.completed || []),
      packs: Array.from(record.packs || []),
      updatedAt: new Date().toISOString()
    };
    writeJson(this.KEY, store);
  },

  migrate: function migrate() {
    var store = this.all();
    if (Object.keys(store).length) return store;

    var legacy = readJson(this.LEGACY_KEY, null);
    if (!legacy || !legacy.student || !legacy.student.id) return store;

    var legacyPacks = readJson(this.LEGACY_PACK_KEY, []);
    store[legacy.student.id] = {
      completed: Array.isArray(legacy.completed) ? legacy.completed : [],
      packs: Array.isArray(legacyPacks) ? legacyPacks : [],
      updatedAt: new Date().toISOString()
    };
    writeJson(this.KEY, store);
    return store;
  }
};

function readJson(key, fallback) {
  try {
    var raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    return false;
  }
  return true;
}
