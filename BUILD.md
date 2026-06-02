# Build & Deploy

Registry: `registry.white.fm:5000` (HTTP — never use `--push` with buildx)

## API

```bash
docker buildx build --platform linux/amd64 --load \
  -t registry.white.fm/astronomy-api:1.0.0 astronomy/api/

docker push registry.white.fm/astronomy-api:1.0.0
```

Then update `astronomy/kustomization.yaml`:
```yaml
images:
  - name: registry.white.fm/astronomy-api
    newTag: "1.0.0"
```

## UI

```bash
docker buildx build --platform linux/amd64 --load \
  -t registry.white.fm/astronomy-ui:1.0.0 astronomy/ui/

docker push registry.white.fm/astronomy-ui:1.0.0
```

Then update `astronomy/kustomization.yaml`:
```yaml
images:
  - name: registry.white.fm/astronomy-ui
    newTag: "1.0.0"
```

## Deploy

ArgoCD auto-syncs from main. After pushing to git + updating kustomization tags, ArgoCD will roll out the new pods automatically. To force immediately:

```bash
kubectl rollout restart deployment/astronomy-api -n astronomy
kubectl rollout restart deployment/astronomy-ui -n astronomy
```

## Local dev

```bash
# Terminal 1 — API
cd astronomy/api
pip install -r requirements.txt
NASA_API_KEY=your_key uvicorn app.main:app --reload --port 8000

# Terminal 2 — UI
cd astronomy/ui
npm install
npm run dev   # proxies /api to localhost:8000
```
