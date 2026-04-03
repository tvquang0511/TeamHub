# Environment variables & `.env` setup

TeamHub là monorepo gồm 3 service chính:
- `backend/` (API + Socket.IO)
- `worker/` (BullMQ consumers: reminders/emails/analytics/blobs)
- `frontend/` (React/Vite)

Mỗi service có file `env.example` để làm mẫu.

## 1) Quy tắc chung
- Không commit `.env`.
- Copy `env.example` → `.env` và chỉnh giá trị.
- Khi chạy bằng Docker Compose (prod-like), một số biến được override trực tiếp trong compose.

## 2) Backend `.env`
File mẫu: `backend/env.example`

### 2.1 Tạo file
```bash
# từ root repo
cp backend/env.example backend/.env
```

### 2.2 Biến quan trọng (tối thiểu)
- `PORT` (default `4000`)
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- `TRUST_PROXY` (nếu chạy sau nginx)
- MinIO/S3: `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_BUCKET_PUBLIC`

### 2.3 Giá trị khuyến nghị theo mode
**Dev (infra deps qua docker, backend chạy trên host):**
- `DATABASE_URL=postgresql://teamhub:teamhub@localhost:5432/teamhub?schema=public`
- `REDIS_URL=redis://localhost:6379`
- `MINIO_ENDPOINT=http://localhost:9000`
- `CORS_ORIGIN=http://localhost:5173`
- `TRUST_PROXY=false`

**Prod-like (everything in compose + nginx single origin):**
- `TRUST_PROXY=true`
- `CORS_ORIGIN=http://localhost`
- `APP_WEB_URL=http://localhost`

Lưu ý: trong [infra/docker-compose.yml](../../infra/docker-compose.yml), service `backend` đã set `DATABASE_URL/REDIS_URL/MINIO_ENDPOINT` trỏ về tên service trong docker network.

## 3) Worker `.env`
File mẫu: `worker/env.example`

### 3.1 Tạo file
```bash
cp worker/env.example worker/.env
```

### 3.2 Biến quan trọng
- `DATABASE_URL`
- `REDIS_URL`
- SMTP (nếu muốn gửi mail thật):
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- MinIO/S3 (phục vụ blob cleanup):
  - `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_BUCKET_PUBLIC`

### 3.3 Gợi ý
- Nếu chưa cấu hình SMTP: có thể để trống, nhưng job gửi mail sẽ fail (tuỳ logic worker).
- Khi chạy bằng compose, `DATABASE_URL/REDIS_URL/MINIO_ENDPOINT` nên trỏ về `postgres/redis/minio`.

## 4) Frontend `.env`
File mẫu: `frontend/env.example`

### 4.1 Tạo file
```bash
cp frontend/env.example frontend/.env
```

### 4.2 Biến quan trọng
- `VITE_API_BASE_URL`

**Dev (backend chạy host):**
- `VITE_API_BASE_URL=http://localhost:4000/api`

**Prod-like qua nginx single origin:**
- `VITE_API_BASE_URL=/api`

Lưu ý: [infra/docker-compose.yml](../../infra/docker-compose.yml) đang set `VITE_API_BASE_URL=/api` ở `frontend.environment`, vì vậy khi chạy prod-like compose thì biến này đã đúng kể cả khi bạn không sửa `.env`.

## 5) Checklist nhanh
- [ ] `backend/.env` có JWT secrets
- [ ] `backend/.env` + `worker/.env` dùng cùng DB/Redis
- [ ] `frontend/.env` trỏ đúng `VITE_API_BASE_URL`
- [ ] Khi chạy sau nginx: `backend/.env` set `TRUST_PROXY=true`

## 6) Liên kết liên quan
- Deployment: [docs/architecture/deployment.md](deployment.md)
- Security: [docs/architecture/security.md](security.md)
