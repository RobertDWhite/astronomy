# astronomy

Astronomy / space-weather dashboard.

- **`api/`** — FastAPI backend aggregating NASA, NOAA space-weather, ISS,
  launch and related feeds. Requires `NASA_API_KEY` (read from the environment;
  supplied in-cluster via a Kubernetes secret).
- **`ui/`** — React + Vite single-page frontend, served by nginx.

Extracted from the `whitehouse-rke2` monorepo. The Kubernetes manifests
(Deployments, Services, HTTPRoutes, secret) remain in that GitOps repo under
`astronomy/`; this repo owns the application source and builds the images those
manifests deploy.

## Images

CI (`.github/workflows/build.yml`) builds and pushes on every push to `main`:

- `ghcr.io/robertdwhite/astronomy-api`
- `ghcr.io/robertdwhite/astronomy-ui`

Tags: `sha-<commit>` (immutable), `latest` (main), and `vX.Y.Z` on git tags.
The GitOps repo pins a specific tag in `astronomy/kustomization.yaml`.

## Local dev

```bash
# API
cd api
pip install -r requirements.txt
NASA_API_KEY=your_key uvicorn app.main:app --reload --port 8000

# UI (proxies /api to localhost:8000)
cd ui
npm install
npm run dev
```
