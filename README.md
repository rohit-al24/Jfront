# Jfront

Vite + React (TypeScript) frontend.

## Local dev

```bash
npm install
npm run dev
```

## Cloudflare Pages (japanese.krgi.co.in)

This repo builds a static site into `dist/`.

### Important: SPA routing

React Router needs a fallback so deep links work (e.g. refreshing `/login`).
This repo includes `public/_redirects` so Cloudflare Pages serves `index.html` for all routes.

### Option A: Deploy via Cloudflare Dashboard (recommended)

1. Cloudflare Dashboard → **Workers & Pages** → **Pages** → **Create a project**.
2. Connect your Git repo.
3. Build settings:
   - Framework preset: **Vite** (or “None”)
   - Build command: `npm ci && npm run build`
   - Build output directory: `dist`
   - Node version: set `NODE_VERSION` to `22` (or at least `20.19+`)
4. (If your API backend is NOT on the same domain) set env vars in Pages → Settings → Variables:
   - `VITE_API_BASE_URL` = `https://<your-backend-domain>`
   - `VITE_NATIVE_API_BASE_URL` = `https://<your-backend-domain>` (only if you want to override the native default)

### Option B: Deploy from your machine (CLI)

```bash
npm install
npm run cf:pages:deploy
```

The first run will prompt you to authenticate and choose/create a Pages project.

### Add the custom domain: japanese.krgi.co.in

In Cloudflare Pages → your project → **Custom domains**:

1. Add `japanese.krgi.co.in`.
2. If `krgi.co.in` is on Cloudflare DNS, Cloudflare will add the DNS record automatically.
   Otherwise, create a DNS `CNAME` record:
   - Name: `japanese`
   - Target: `<your-project>.pages.dev`
3. Wait for SSL to provision (usually a few minutes).
