# Infra — Docker Compose + Nginx reverse proxy (TeamHub)

Mục tiêu phần này: bạn trình bày được “**full system chạy như thế nào**”, vì sao cần Nginx (single origin + websocket + presign path proxy), và các điểm cấu hình hay bị hỏi (trust proxy, upload buffering, routing).

Nguồn tham khảo “chuẩn ý bạn”:
- `docs/architecture/deployment.md`
- `infra/nginx/conf.d/teamhub.conf`

---

## 1) Vì sao dùng Docker Compose?
### 1.1 Dev/prod parity
Với một repo full-stack (FE + API + worker + infra deps), Compose giúp:
- dựng Postgres/Redis/MinIO đồng nhất
- giảm “máy em chạy được”
- demo end-to-end nhanh

### 1.2 Dễ vận hành & demo
Trong phỏng vấn, bạn có thể nói:
> Em đóng gói toàn bộ dependencies trong compose, nên người khác chỉ cần 1 lệnh để chạy đủ hệ thống.

---

## 2) 2 compose files: dev deps vs prod-like full stack

### 2.1 `infra/docker-compose.dev.yml` (infra deps only)
Mục tiêu: bạn chạy app bằng `npm run dev` (HMR/watch) ngoài docker, nhưng vẫn có:
- Postgres
- Redis
- MinIO (+ init buckets)

Điểm hay:
- code chạy native => debug dễ, reload nhanh
- deps chạy docker => setup ổn định

### 2.2 `infra/docker-compose.yml` (prod-like)
Mục tiêu: chạy full system trong containers:
- Nginx reverse proxy (port 80)
- Frontend
- Backend
- Worker
- Postgres/Redis/MinIO (+ init)
- One-shot `db-migrate` chạy migrations trước khi app start

Tại sao cần `db-migrate` one-shot?
- đảm bảo schema đúng trước khi backend/worker chạy
- tránh tình trạng backend start trước migrations

---

## 3) Nginx: routing map (phải thuộc)
Trong `infra/nginx/conf.d/teamhub.conf`:

### 3.1 Frontend
- `location /` -> proxy tới frontend service

Trong production “đúng bài” (khuyến nghị), Nginx nên serve static trực tiếp (đỡ 1 Node process). Nhưng hiện compose prod-like có thể đang proxy tới `vite preview`.

### 3.2 API
- `location /api/` -> proxy tới backend
- giữ prefix `/api` (backend mount routes dưới `/api`)

### 3.3 Swagger/OpenAPI
- `location /api-docs` -> backend
- `location = /openapi.json` -> backend

### 3.4 Socket.IO (WebSocket)
- `location /socket.io/` -> backend
- bắt buộc cấu hình upgrade:
  - `proxy_http_version 1.1`
  - `proxy_set_header Upgrade $http_upgrade;`
  - `proxy_set_header Connection "upgrade";`
  - `proxy_read_timeout 60s;` (hoặc cao hơn)

### 3.5 MinIO buckets (single-origin presign)
Điểm “signature feature” của TeamHub:
- `location ~ ^/(teamhub|teamhub-public)/` -> `proxy_pass http://minio:9000;`

Lý do:
- Presign URL dùng path-style `/{bucket}/{objectKey}`
- Browser dùng một origin duy nhất (http://localhost)
- Không expose MinIO ports ra ngoài

Upload tuning:
- `client_max_body_size 60m` (giới hạn file)
- `proxy_request_buffering off` + `proxy_buffering off`
  - tránh Nginx buffer toàn bộ request body (đỡ tốn RAM/disk khi upload file lớn)

---

## 4) Env wiring quan trọng (đi phỏng vấn hay bị hỏi)

### 4.1 Backend env
Trong compose, backend cần:
- `DATABASE_URL` trỏ tới `postgres` container
- `REDIS_URL` trỏ tới `redis` container
- `MINIO_ENDPOINT` trỏ tới `minio` container (internal)
- `MINIO_PUBLIC_ENDPOINT` trỏ tới host public mà browser thấy (vd `http://localhost`) để presign URL hợp lệ cho client

### 4.2 `TRUST_PROXY=true`
Nếu backend đứng sau Nginx:
- client IP thật nằm trong `X-Forwarded-For`
- nếu không trust proxy -> Express lấy IP của Nginx

Hậu quả:
- rate limiting theo IP bị sai
- logging/audit IP sai

---

## 5) “Single origin” là gì và vì sao TeamHub cố giữ?
Nếu tách origin:
- FE: http://localhost:5173
- API: http://localhost:4000
- MinIO: http://localhost:9000

thì phải xử lý:
- CORS
- cookie policy
- mixed content
- presigned URL cross-origin

TeamHub dùng Nginx gom lại:
- `/` + `/api` + `/socket.io` + `/(teamhub|teamhub-public)/...` đều cùng origin

Đây là một câu trả lời rất “đẹp” khi phỏng vấn.

---

## 6) Debug checklist (Nginx/Compose)
1) Socket không connect?

   - check Nginx `/socket.io/` upgrade headers
2) Upload presign PUT bị 413?

   - check `client_max_body_size`
3) Upload bị chậm/timeout?

   - check buffering settings
4) Rate limit sai IP?

   - check `TRUST_PROXY` + Nginx set `X-Forwarded-For`
5) Presign URL trỏ `minio:9000` (không chạy trên browser)?

   - `MINIO_PUBLIC_ENDPOINT` phải là host public (vd `http://localhost`)

---

## 6.1) Code pointers (đọc theo flow)
- Nginx reverse proxy config: `infra/nginx/conf.d/teamhub.conf`
- Compose (dev deps): `infra/docker-compose.dev.yml`
- Compose (prod-like full stack): `infra/docker-compose.yml`
- Backend env parsing (trust proxy/cache/rl/minio endpoints): `backend/src/config/env.ts`
- Backend app bootstrap (middlewares, trust proxy): `backend/src/app.ts`
- Backend server bootstrap (http server + socket + schedulers): `backend/src/server.ts`

---

## 7) Câu hỏi phỏng vấn + câu trả lời mẫu

### Q1: “Vì sao cần trust proxy?”
> Vì backend đứng sau Nginx nên IP client thật nằm ở `X-Forwarded-For`. Nếu không trust proxy thì `req.ip` sẽ là IP của Nginx, dẫn tới rate limit/log sai.

### Q2: “Tại sao proxy bucket ở root?”
> Vì presign dùng path-style `/{bucket}/{objectKey}`. Proxy buckets ở root giúp browser upload/download qua cùng origin, giảm CORS và không expose MinIO.

### Q3: “Tại sao tách dev compose và full compose?”
> Dev compose chỉ chạy deps để mình code/debug nhanh ngoài docker. Full compose chạy end-to-end giống production để demo và test tích hợp.
