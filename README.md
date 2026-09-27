# nabha-learning

Learning platform for rural school students in Nabha.

## Live site

**[https://venkatram-77.github.io/nabha-learning/](https://venkatram-77.github.io/nabha-learning/)**

Hosted on GitHub Pages, deployed automatically from the `main` branch on every push. No local setup or server needed to run it.

## Project structure

| Path | Description |
| --- | --- |
| `index.html` | Entry point. Redirects to the landing page. |
| `university_portal/` | Main site: landing page, programs, features, curriculum, impact. |
| `web/` | Student portal: lessons and course content. |

The two sections cross-link to each other, so the whole site is browsable from either entry point.

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

Add a license here if you plan to share or reuse this project.
