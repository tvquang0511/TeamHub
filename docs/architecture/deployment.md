# TeamHub — Deployment & Environments

> Update (project structure): You moved:
> - Nginx config to `infra/nginx/`
> - Compose files to `infra/docker-compose.yml` and `infra/docker-compose.dev.yml`

This doc uses those paths.

---

## 1) Environments

### 1.1 Development (dev)
Goal: fast iteration, hot reload.
- Frontend: Vite dev server (HMR)
- Backend: ts-node-dev/nodemon (watch)
- Worker: watch mode
- Nginx: reverse proxy to avoid CORS issues and keep 1 base URL.

### 1.2 Production (prod)
Goal: stable deployment.
- Frontend: build static files
- Nginx serves frontend static + proxies API + Socket.IO
- Backend/Worker run compiled JS (no watch)

---

## 2) Nginx role

### 2.1 Routing
- `/` -> frontend
- `/api/` -> backend HTTP
- `/socket.io/` -> backend Socket.IO websocket upgrade

### 2.2 Why keep Nginx from day 1?
- Single origin for browser: reduce CORS complexity
- Websocket proxy is consistent between dev/prod
- Later add TLS, caching, gzip without changing app logic

---

## 3) Docker Compose layout (as of now)

### 3.1 Files
- `infra/docker-compose.dev.yml`
  - includes source mount volumes
  - exposes extra ports for debugging
  - runs watchers
- `infra/docker-compose.yml`
  - intended for prod-like deployment (no source mounts)
  - runs built artifacts

### 3.2 Run commands
From project root (example):
```bash
# Dev
docker compose -f infra/docker-compose.dev.yml up -d --build

# Prod-like
docker compose -f infra/docker-compose.yml up -d --build
```

---

## 4) Frontend build for production (nginx static)
Recommended production flow:
1. Build frontend:
   - `npm ci`
   - `npm run build` -> outputs `dist/`
2. Use multi-stage Dockerfile:
   - stage 1 builds `dist/`
   - stage 2 Nginx copies `dist/` into `/usr/share/nginx/html`
3. Nginx config:
   - `try_files $uri /index.html;` for SPA routing
   - keep `/api` and `/socket.io` proxy to backend

Suggested nginx static snippet (prod):
```nginx
location / {
  root /usr/share/nginx/html;
  try_files $uri /index.html;
}
```

In dev, nginx usually proxies to Vite server instead.

---

## 5) Backend prod mode
- Build TS -> JS (`dist/`)
- Start with `node dist/main.js`
- Use env vars from `.env`

---

## 6) Worker prod mode
- Build TS -> JS (`dist/`)
- Start poller with `node dist/main.js`
- Scale worker separately if needed (later)

---

## 7) Secrets & env
- Store `.env` locally (do not commit)
- Commit `.env.example`
- Production: inject env via CI/secret manager

---

## 8) Operational notes
- DB migrations run:
  - dev: `prisma migrate dev`
  - prod: `prisma migrate deploy`
- Healthchecks:
  - backend `/health`
  - add docker healthcheck later
- Logs:
  - nginx access logs
  - backend structured logs (phase 2)

---

## 9) Dev vs Prod summary table

| Component | Dev | Prod |
|---|---|---|
| Frontend | Vite dev server + HMR | Build static served by Nginx |
| Backend | Watch mode (nodemon/ts-node-dev) | Node runs compiled JS |
| Worker | Watch mode | Node runs compiled JS |
| Nginx | Reverse proxy | Static + reverse proxy |
| DB | Docker postgres | Managed or docker |