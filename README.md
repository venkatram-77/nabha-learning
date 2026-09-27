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
| `web/` | Student portal: lessons, progress, and the faculty dashboard. |
| `web/data/lessons.js` | Lesson library, grouped by track and subject. |
| `web/data/staff.js` | Faculty and admin accounts with passcodes. |
| `web/data/store.js` | Roster and per-student progress storage. |

The two sections cross-link to each other, so the whole site is browsable from either entry point.

## Roles and progress

The portal has three roles:

| Role | What they see |
| --- | --- |
| Student | Only their own lessons, marks and progress ring. |
| Faculty | Class dashboard: every student's progress, subject breakdown, last active. |
| Administrator | Same dashboard, across the whole campus. |

A student signs in by typing their own name or enrollment ID. Classmates are never listed, and one student's record cannot overwrite another's — each student has their own progress record keyed by their ID.

Faculty and admin sign in with a passcode and land on a dashboard showing per-student progress, per-subject completion, and class filters.

**This is a demo, not real security.** The site is static, so all data lives in the browser's `localStorage` and the passcodes are readable in `web/data/staff.js`. A student who opens developer tools can read or edit any record. Real accounts and a shared database need a server-side login.

## Tests

Two dependency-free Node scripts cover the access rules and the UI flows:

```bash
node test-logic.js   # roster, lookup, per-student isolation, migration, passcodes
node test-dom.js     # sign-in flows, role gating, dashboard rendering
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
