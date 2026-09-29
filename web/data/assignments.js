window.NLH_ASSIGNMENTS = [
  {
    id: 'asg-pri-eng-01',
    track: 'primary',
    subject: 'English',
    title: 'Write three lines about your family',
    setBy: 'Gurpreet Singh',
    due: '2026-10-12',
    minutes: 20,
    instructions:
      'Write three lines in your notebook in your best handwriting. Take a clear photo of the page, or save it as a PDF, and upload it here. Read the lines out loud once before you upload.',
    accepts: ['image/jpeg', 'image/png', 'application/pdf'],
    maxMb: 2
  },
  {
    id: 'asg-pri-math-01',
    track: 'primary',
    subject: 'Mathematics',
    title: 'Sum ten numbers from your kitchen',
    setBy: 'Meharjit Kaur',
    due: '2026-10-14',
    minutes: 25,
    instructions:
      'Count ten small items such as seeds, grain or leaves. Write the two groups, add them, and show the answer with your working. One photo of the page is enough.',
    accepts: ['image/jpeg', 'image/png', 'application/pdf'],
    maxMb: 2
  },
  {
    id: 'asg-mid-eng-01',
    track: 'middle',
    subject: 'English',
    title: 'Write a paragraph on your village',
    setBy: 'Gurpreet Singh',
    due: '2026-10-10',
    minutes: 40,
    instructions:
      'Write one paragraph of at least six lines about your village: the people, the crops and one festival. Underline five new words you used and write what they mean in the margin.',
    accepts: ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'],
    maxMb: 2
  },
  {
    id: 'asg-mid-sci-01',
    track: 'middle',
    subject: 'Science',
    title: 'Draw the three states of water',
    setBy: 'Meharjit Kaur',
    due: '2026-10-16',
    minutes: 35,
    instructions:
      'Draw ice, water and steam in one picture. Label each one and write one line on what makes it change. Photograph the drawing flat on a table so the whole page is clear.',
    accepts: ['image/jpeg', 'image/png', 'application/pdf'],
    maxMb: 3
  },
  {
    id: 'asg-car-eng-01',
    track: 'career',
    subject: 'English',
    title: 'Formal letter and essay outline',
    setBy: 'Gurpreet Singh',
    due: '2026-10-09',
    minutes: 60,
    instructions:
      'Write a formal letter to your class teacher asking for leave, then a full outline of an essay on a topic you choose. Upload the typed file or a clear photo of the pages.',
    accepts: [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    maxMb: 4
  },
  {
    id: 'asg-car-math-01',
    track: 'career',
    subject: 'Mathematics',
    title: 'Worked solutions for the quadratic set',
    setBy: 'Meharjit Kaur',
    due: '2026-10-17',
    minutes: 70,
    instructions:
      'Solve every question from the Quadratic Equations lesson. Show the steps, not only the answer. Upload as a single PDF or photo set.',
    accepts: ['image/jpeg', 'image/png', 'application/pdf'],
    maxMb: 4
  }
];

window.NLH_ASSIGNMENT_LIST = {
  forTrack: function forTrack(track) {
    return window.NLH_ASSIGNMENTS.filter(function inTrack(assignment) {
      return assignment.track === track;
    });
  },

  find: function find(id) {
    return window.NLH_ASSIGNMENTS.filter(function byId(assignment) {
      return assignment.id === id;
    })[0];
  },

  acceptList: function acceptList(assignment) {
    var accepts = assignment.accepts || [];
    var labels = accepts.map(function readable(mime) {
      if (mime === 'image/jpeg') return 'JPG';
      if (mime === 'image/png') return 'PNG';
      if (mime === 'application/pdf') return 'PDF';
      if (mime === 'text/plain') return 'TXT';
      if (mime === 'application/msword') return 'DOC';
      if (mime.indexOf('wordprocessingml') !== -1) return 'DOCX';
      return mime;
    });
    return labels.filter(function onceOnly(label, index) {
      return labels.indexOf(label) === index;
    });
  },

  acceptsFile: function acceptsFile(assignment, file) {
    var accepts = assignment.accepts || [];
    if (!accepts.length) return true;
    if (accepts.indexOf(file.type) !== -1) return true;
    var name = String(file.name || '').toLowerCase();
    return accepts.some(function matches(mime) {
      if (mime === 'application/pdf') return name.slice(-4) === '.pdf';
      if (mime === 'image/jpeg') return /\.(jpg|jpeg)$/.test(name);
      if (mime === 'image/png') return /\.png$/.test(name);
      if (mime === 'text/plain') return /\.(txt|rtf)$/.test(name);
      if (mime.indexOf('word') !== -1) return /\.(doc|docx)$/.test(name);
      return false;
    });
  },

  isOverdue: function isOverdue(assignment, today) {
    if (!assignment.due) return false;
    var due = new Date(assignment.due + 'T23:59:59');
    if (Number.isNaN(due.getTime())) return false;
    var now = today ? new Date(today) : new Date();
    return due.getTime() < now.getTime();
  }
};
