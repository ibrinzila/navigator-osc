# Navigator OSC

Navigator OSC is a static, public-interest web app for organizations of civil society in the Republic of Moldova. It turns the practical guide on accessing public resources into routes, mechanisms, deadlines, CPV hints, source links, and a compact PDF reader.

Live site:

- `https://navigator-resurse-publice-osc.pages.dev`
- Target custom domain: `https://navigator-osc.cohesionlab.org`

## What is included

- Static source under `src/`
- Build script under `scripts/build.mjs`
- Cloudflare Pages configuration in `wrangler.toml`
- GitHub Actions deployment workflow in `.github/workflows/deploy.yml`
- Guide PDF at `src/assets/docs/ghid-practic.pdf`
- Attribution and source notice in `NOTICE.md`

## Local development

```bash
npm run build
python3 -m http.server 8099 --directory dist
```

Open `http://localhost:8099`.

## Cloudflare Pages deployment

The GitHub Actions workflow builds the static site, copies `dist/` into an isolated `.deploy/` directory, and deploys that directory to the existing Cloudflare Pages project:

```text
navigator-resurse-publice-osc
```

Required GitHub repository secret:

```text
CLOUDFLARE_API_TOKEN
```

The token needs permission to deploy to Cloudflare Pages in account `3b9559789b36b17e8dd609519a52ae13`.

## Sanitization notes

The public repository intentionally excludes:

- local Wrangler OAuth/cache files
- generated `dist/`
- temporary PDF renders
- local environment files
- the experimental Pages Function / Workers AI stub

The current app is static and retrieval-first. Live deadlines, forms, calls, legal changes, and institution-specific requirements must still be checked against official sources before use.
