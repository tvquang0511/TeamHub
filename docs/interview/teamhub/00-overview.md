# TeamHub — Tổng quan hệ thống (để kể 2–3 phút)

## 1) Elevator pitch (20–30s)
TeamHub là một nền tảng kiểu Trello cho teamwork: **workspaces → boards → lists → cards**, có **drag & drop**, **activity tracking**, **attachments**, **labels/assignees/comments/checklists**, và **realtime in-board chat**.

Điểm nhấn kỹ thuật theo đúng “scalable web app”:
- Backend REST + realtime Socket.IO
- Redis cho **cache + rate limit** và làm broker cho **BullMQ queues**
- Worker tách riêng xử lý nền (email/reminder/analytics/blob cleanup)
- MinIO (S3-compatible) + **presigned PUT/GET**
- Docker Compose + Nginx reverse proxy (single-origin)

---

## 2) Kiến trúc chạy (end-to-end)
**Các service chính (Docker Compose):**
- `frontend` (Vite build + preview)
- `backend` (Express API + Socket.IO)
- `worker` (BullMQ Workers)
- `postgres` (data chính)
- `redis` (cache + rate limit + queues)
- `minio` + `minio-init` (blob storage + bucket policy + lifecycle)
- `nginx` (reverse proxy)

**Reverse proxy (Nginx) làm 3 việc quan trọng:**
1) `/` → frontend
2) `/api/*`, `/api-docs`, `/openapi.json` → backend
3) `/(teamhub|teamhub-public)/*` → minio (để presigned URL chạy cùng origin)
4) `/socket.io/*` → backend (WebSocket upgrade)

---

## 3) Data model cốt lõi (để trả lời thiết kế DB)
- Workspace có members (OWNER/ADMIN/MEMBER)
- Board thuộc workspace, có visibility (PRIVATE/WORKSPACE), có board members (OWNER/ADMIN/MEMBER)
- List thuộc board, Card thuộc list
- `position` lưu kiểu **Decimal** để reorder ổn định khi kéo thả
- Activities ghi lại sự kiện (card moved, comment, attachment…)

---

## 4) Các flow “đáng bị hỏi” nhất
### 4.1 Auth
- Access token (JWT) + refresh token rotation
- Forgot/reset password → enqueue email job

### 4.2 Drag & drop (List/Card)
- Frontend tính `prevId/nextId` theo vị trí drop
- Backend tính position “between” (Decimal) để chèn giữa

### 4.3 Realtime chat
- Socket handshake auth bằng JWT
- Join room theo board: `board:{boardId}`
- Khi send/edit/delete message: backend emit event cho room

### 4.4 Attachments (MinIO presign)
- Backend presign PUT → client upload trực tiếp MinIO qua Nginx
- Client commit metadata vào DB
- Download: backend presign GET (có content-disposition)
- Delete: enqueue background delete + sweeper job dọn orphan

### 4.5 Redis
- Cache-aside cho analytics/card detail
- Versioned cache key: bump version khi dữ liệu thay đổi
- Rate limit: INCR + EXPIRE + fail-open

### 4.6 BullMQ + worker
- Reminders: delayed jobs (jobId = reminderJobId)
- Emails: retry/backoff
- Analytics: repeatable cron daily + bump cache version
- Blobs: delete_object delayed + sweep_orphans cron

---

## 5) 10 câu hỏi “nhà tuyển dụng hay xoáy”
1) Vì sao split `backend` và `worker`?
2) Redis down thì API có chết không?
3) Presigned URL giúp gì so với upload qua backend?
4) Làm sao đảm bảo user chỉ join chat board họ thuộc?
5) Rate limit bạn làm per-IP hay per-user?
6) Position Decimal có trade-off gì?
7) BullMQ repeatable job có rủi ro schedule lệch timezone không?
8) Orphan blob là gì và bạn dọn thế nào?
9) Với cache, bạn invalidate bằng cách nào?
10) Bạn dùng AI ở bước nào và kiểm soát output ra sao?
