# nabha-learning

Learning platform for rural school students in Nabha.

## Live site

**[https://venkatram-77.github.io/nabha-learning/](https://venkatram-77.github.io/nabha-learning/)**

Hosted on GitHub Pages, deployed automatically from the `main` branch on every push. No local setup or server needed to run it.

## Project structure

| Path | Description |
| --- | --- |
| `index.html` | Entry point. Redirects to the landing page. |
| `university_portal/` | Main site: landing page, programs, features, curriculum, impact, enrollment form. |
| `web/` | Student portal: lesson videos, progress, uploads, and the faculty dashboard. |
| `web/data/lessons.js` | Lesson library, grouped by track and subject. |
| `web/data/media.js` | Video for each lesson, and the media catalogue the player reads. |
| `web/data/assignments.js` | Homework set by faculty, per track and subject. |
| `web/data/staff.js` | Faculty and admin accounts with passcodes. |
| `web/data/store.js` | Roster, per-student progress, and uploaded homework storage. |

The two sections cross-link to each other, so the whole site is browsable from either entry point.

## Roles and progress

The portal has three roles:

| Role | What they see |
| --- | --- |
| Student | Only their own lessons, videos, uploaded work and progress ring. |
| Faculty | Class dashboard: every student's progress, subject breakdown, last active, homework handed in. |
| Administrator | Same dashboard, across the whole campus. |

A student signs in by typing their own name or enrollment ID. Classmates are never listed, and one student's record cannot overwrite another's — each student has their own progress record keyed by their ID.

Faculty and admin sign in with a passcode and land on a dashboard showing per-student progress, per-subject completion, homework handed in, and class filters.

## Lesson videos

Every lesson in the syllabus opens with a video player above the written notes.

- The player sits at the top of the lesson, so a student watches and then reads the same points.
- Cards carry a **Video** badge, and it flips to **Watched** once the video plays to the end.
- "Videos watched" is tracked per student, next to "Work uploaded" in the stat row.
- A lesson with no recording yet still opens. It says so and shows the written notes instead, and a video that will not load on a weak connection says why rather than showing an empty box.

`web/data/media.js` is the only file to edit to change the footage:

```js
window.NLH_MEDIA = {
  'cc0-flower': {
    label: 'What the footage shows',
    type: 'file',
    src: 'https://example.org/lesson.mp4'
  },
  'farm-video': {
    label: 'Drip irrigation on the school field',
    type: 'embed',
    src: 'https://www.youtube-nocookie.com/embed/VIDEO_ID'
  }
};

window.NLH_VIDEOS = { 'mid-sci-01': 'farm-video', 'mid-sci-02': 'cc0-flower' };
```

`type: 'file'` plays a plain video file. `type: 'embed'` renders a player in an iframe, which is how a YouTube or Vimeo recording is added. A lesson left out of `NLH_VIDEOS` shows the "no video yet" note.

The two clips currently in the file are MDN's CC0 sample videos, kept as placeholders so the player works out of the box. Replace them with recordings of the school's own lessons.

## Homework uploads

Faculty set work in `web/data/assignments.js`. Each assignment carries a track, subject, instructions, who set it, a due date, the file types it accepts and a size cap.

| Path | Description |
| --- | --- |
| `web/data/assignments.js` | The homework, and the rules for what a student may upload. |

On the student side:

- The student's track decides which assignments appear. Nobody else can see them.
- **Upload work** takes a photo of the notebook page, a PDF, or a typed file. **Replace file** swaps it, **Open** reopens it, and **Remove** clears it.
- A file of the wrong type or over the cap is refused with a plain reason, in the language the portal uses elsewhere. Nothing is saved when it is refused.
- If the device has no space left, the upload fails with a message instead of appearing to succeed.
- Once a file is uploaded, the card turns green and shows the file name and size.

On the faculty side:

- **Homework handed in** shows a bar per assignment: how many students of that class have submitted.
- The table below lists every uploaded file with the student, the assignment, the file name, its size and when it arrived. **Open** shows the file.
- The class filter above applies to submitted work as well, so a teacher can look at one class at a time.
- `Files handed in` is one of the dashboard stats.

Uploads are held in the browser's `localStorage`, capped at 2 MB per file. That is deliberate for a village tablet with little storage, and it means a photo taken on a large camera phone has to be resized or re-taken at a lower resolution. A real submission system needs a server and a file store; this is the browser-side half of it, so the flow can be tried out on a shared tablet first.

## Key questions and answers

Instead of downloading the whole course, each track produces a short revision sheet: the main question from every lesson with its answer, grouped by subject. There are currently 18 lessons and 39 questions across the three tracks.

- **View** opens the questions in the page.
- **Download** saves a standalone HTML file that opens with no connection and prints cleanly, so a mentor can hand it out on a shared tablet. It ticks off lessons the student has already completed.

Both are generated from the lesson data, so the sheets stay in step with `web/data/lessons.js` — there is no second copy to maintain.

**This is a demo, not real security.** The site is static, so all data lives in the browser's `localStorage` and the passcodes are readable in `web/data/staff.js`. A student who opens developer tools can read or edit any record. Real accounts and a shared database need a server-side login. Uploaded homework is the same story: it is kept on the device it was uploaded from, so a mentor collects or syncs it before the tablet is handed back.

## Tests

Two dependency-free Node scripts cover the access rules and the UI flows:

```bash
node test-logic.js   # roster, lookup, per-student isolation, migration, passcodes, videos, assignments, upload storage
node test-dom.js     # sign-in flows, role gating, video playback, uploads, dashboard rendering
```

## Tech

Plain HTML, CSS, and JavaScript. No build step, no framework, no dependencies, no backend. Fonts are loaded from Google Fonts, so an internet connection is needed for the full styling.

Because there is no build step, editing a file and pushing is the entire deploy workflow.

## Local preview

Any static file server works. For example:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Deployment

Push to `main` and GitHub Pages rebuilds automatically. To preview changes before pushing, run the local server above.

## License
