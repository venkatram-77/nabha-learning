window.NLH_MEDIA = {
  'cc0-flower': {
    label: 'Wildflower timelapse - CC0 demo footage, replace with your own recording',
    type: 'file',
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
  },
  'cc0-friday': {
    label: 'Short motion clip - CC0 demo footage, replace with your own recording',
    type: 'file',
    src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/friday.mp4'
  }
};

window.NLH_VIDEOS = {
  'pri-eng-01': 'cc0-friday',
  'pri-eng-02': 'cc0-flower',
  'pri-math-01': 'cc0-friday',
  'pri-math-02': 'cc0-flower',
  'pri-sci-01': 'cc0-flower',
  'pri-dig-01': 'cc0-friday',
  'mid-eng-01': 'cc0-friday',
  'mid-eng-02': 'cc0-flower',
  'mid-math-01': 'cc0-friday',
  'mid-math-02': 'cc0-flower',
  'mid-sci-01': 'cc0-flower',
  'mid-sci-02': 'cc0-friday',
  'car-eng-01': 'cc0-friday',
  'car-math-01': 'cc0-flower',
  'car-math-02': 'cc0-friday',
  'car-sci-01': 'cc0-flower',
  'car-dig-01': 'cc0-friday',
  'car-career-01': 'cc0-flower'
};

window.NLH_VIDEO = {
  forLesson: function forLesson(lesson) {
    if (!lesson || !lesson.id) return null;
    var key = window.NLH_VIDEOS[lesson.id];
    if (!key) return null;
    var entry = window.NLH_MEDIA[key];
    if (!entry || !entry.src) return null;
    return {
      key: key,
      label: entry.label || 'Lesson video',
      type: entry.type === 'embed' ? 'embed' : 'file',
      src: entry.src
    };
  },

  stats: function stats(lessons) {
    var self = this;
    var list = lessons || window.NLH_LESSONS || [];
    var total = 0;
    var ready = 0;
    list.forEach(function count(lesson) {
      total += 1;
      if (self.forLesson(lesson)) ready += 1;
    });
    return { total: total, ready: ready };
  }
};
