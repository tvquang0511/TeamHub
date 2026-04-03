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
- Infra deps via Docker Compose: Postgres + Redis + MinIO
- (Optional) Nginx reverse proxy if you want a single origin in dev

### 1.2 Production (prod)
Goal: stable deployment.
- Current repo (prod-like compose): frontend runs `vite preview`, Nginx proxies `/` to it.
- Recommended production: build static files and let Nginx serve them (no Node process for FE).
- Nginx proxies API + Socket.IO
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
  - runs **infra dependencies only** (Postgres + Redis + MinIO)
- `infra/docker-compose.yml`
  - prod-like deployment (frontend + backend + worker + postgres + redis + nginx + minio)

Note: production environments can either:
- keep MinIO in compose, or
- replace it by managed S3-compatible storage (set `MINIO_*` / S3 endpoint accordingly).

### 3.2 Run commands
From project root (example):
```bash
# Dev: infra deps only
docker compose -f infra/docker-compose.dev.yml up -d

# Prod-like: run everything in containers
docker compose -f infra/docker-compose.yml up -d --build
```

Makefile shortcuts:
```bash
make dev
make prod

make dev-down
make prod-down
```

Recommended dev loop (2-4 terminals):
```bash
# Terminal A
cd backend && npm run dev

# Terminal B
cd worker && npm run dev

# Terminal C
cd frontend && npm run dev
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
- In compose prod-like, backend runs as a Node service.
- Preferred: build TS -> JS and run compiled entry (e.g. `dist/`).
- Dev: run via `npm run dev`.
- Use env vars from `.env`

---

## 6) Worker prod mode
- Worker consumes BullMQ queues (reminders/emails/analytics)
- Preferred: build TS -> JS and run compiled entry.
- Dev: run via `npm run dev`.
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
| Redis | Docker redis | Managed or docker |
| MinIO/S3 | Docker MinIO | S3-compatible storage |