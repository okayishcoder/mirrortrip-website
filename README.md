# Mirror Trip Website

Static public website for the Mirror Trip mobile app.

## Files that matter most

- `index.html`: landing page and public app overview
- `privacy.html`: published privacy policy
- `support.html`: support and contact page
- `delete-account.html`: public account deletion information
- `styles.css`: shared design system and page styling
- `script.js`: lightweight navigation and active-link behavior
- `assets/mt.png`: copied app brand asset used for the site icon and favicon

## Local preview

Because this is a plain static site, the simplest local preview is to open `index.html` directly in a browser.

If you prefer serving it over HTTP, run this from the repo root:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

The site is static-hosting friendly and can be deployed directly to GitHub Pages or any similar static host.
