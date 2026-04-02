# TeamHub — Architecture Overview

## 1) Goals
- Trello-like Kanban (board/list/card) với drag-drop reorder/move dựa trên **position float**
- Realtime sync bằng **Socket.IO**
- Board chat realtime (1 box chat / board)
- Reminder email per-user (SMTP) chạy bằng **BullMQ + Worker**
- Thống kê (analytics) theo ngày/tháng bằng job nền (BullMQ)
- Upload file (avatar/background/attachment) qua **presigned URL** (MinIO/S3)
- Deploy local bằng Docker Compose (infra deps) + chạy app bằng npm

## 2) High-level components
1. **Frontend (React + Vite + Tailwind)**
   - UI: workspace list, board view, card modal, chat panel
   - Data: REST API + Socket.IO events
2. **API Backend (Node/Express/TypeScript)**
   - REST endpoints: auth, workspaces, boards/lists/cards, invites, attachments, reminders, analytics
   - Socket.IO gateway: auth handshake + join rooms + broadcast events (kanban + chat)
3. **PostgreSQL**
   - Primary storage (Prisma)
4. **Worker (Node/TS)**
   - Consume BullMQ queues: `reminders`, `emails`, `analytics`
   - Sends SMTP emails (reminder)
   - Runs analytics rollups (board metrics daily/monthly)
5. **Redis**
   - Required for **BullMQ** (reminders/emails/analytics)
   - Cache-aside (nếu bật)
   - Rate limiting (Redis-backed)
   - Docs:
     - Cache strategy: see [docs/architecture/caching.md](caching.md)
     - Rate limiting: see [docs/architecture/rate-limiting.md](rate-limiting.md)
6. **Object Storage (MinIO / S3)**
   - Lưu avatar, workspace background, card attachments
   - Flow: init/presign -> client upload -> commit
7. **Nginx (prod-like)**
   - Reverse proxy + serve frontend static (compose prod)

Related docs:
- C4 model (L1–L2): see [docs/architecture/c4.md](c4.md)

## 3) Data flow (main)
### 3.1 Kanban CRUD + realtime
- Client gọi REST -> API validates -> DB write -> API emit Socket.IO to `board:{boardId}` -> clients update UI.

### 3.2 Chat
- Client connect Socket.IO (JWT) -> join `board:{boardId}` -> send message -> server insert DB -> emit to room.

### 3.3 Reminder
- Client set reminder -> DB insert ReminderJob(PENDING)
- API schedule job via BullMQ (delay until `remindAt`)
- Worker consume job -> send SMTP -> update status SENT/FAILED (+ retry)

### 3.4 Upload (avatar/background/attachment)
- Client gọi API để lấy presigned PUT URL
- Client upload trực tiếp lên MinIO/S3
- Client gọi API commit để lưu metadata + broadcast realtime (nếu cần)

### 3.5 Analytics daily/monthly
- Scheduler enqueue job analytics (repeatable/cron)
- Worker chạy rollup `board_metrics_daily` và `board_metrics_monthly`
- Frontend gọi API analytics để hiển thị chart

## 4) Suggested repo structure
- Monorepo:
  - `frontend/` (Vite)
  - `backend/` (Express + Socket.IO)
  - `worker/` (poller + SMTP)
  - `nginx/` (reverse proxy)
  - `docs/` (spec, contracts, backlog)

## 5) Realtime rooms & contracts
- Rooms:
   - `board:{boardId}`: kanban realtime + board chat
- Event payload guideline: `{ type, payload, actorId, ts }` (optional but recommended)

## 6) Security / Authorization baseline
- Workspace access requires **workspace membership**.
- Board access (boards/lists/cards/chat) requires **board membership** if board is `PRIVATE`.
- If board is `WORKSPACE`, any workspace member can **see the board**, but chat/write operations should still require board membership (recommended).
- Owner/Admin controls invites/roles.
- Socket events must validate JWT + membership before join/emit.

## 7) Non-functional notes
- Prefer **archive** over delete.
- Use DB indexes for sorting by position and polling reminders.
- Provide idempotency / safe updates for worker (transaction update-where-status).