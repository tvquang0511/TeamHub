# TeamHub — Architecture Overview

## 1) Goals
- Trello-like Kanban (board/list/card) với drag-drop reorder/move dựa trên **position float**
- Realtime sync bằng **Socket.IO**
- Board chat realtime (1 box chat / board)
- Reminder email per-user (SMTP) chạy bằng worker poll DB
- Deploy local bằng Docker Compose + Nginx reverse proxy

## 2) High-level components
1. **Frontend (React + Vite + Tailwind)**
   - UI: workspace list, board view, card modal, chat panel
   - Data: REST API + Socket.IO events
2. **API Backend (Node/Express/TypeScript)**
   - REST endpoints: auth, workspace, boards/lists/cards, reminders
   - Socket.IO gateway: auth handshake + join rooms + broadcast events
3. **PostgreSQL**
   - Primary storage (Prisma)
4. **Worker (Node/TS)**
   - Poll reminder_jobs và gửi SMTP
5. **Nginx**
   - Reverse proxy: `/` -> frontend, `/api` -> backend, `/socket.io` -> backend
6. **Redis**
   - Required for **BullMQ** (reminder/background jobs)
   - (Optional) cache board detail (phase 2)
   - (Optional) Socket.IO Redis adapter (scale many instances)
   - (Optional) rate limit chat
   - Cache strategy doc: see [docs/architecture/caching.md](caching.md)
7. (Optional) **BullMQ**
   - Background jobs (reminders, activity log async, notification pipeline)

## 3) Data flow (main)
### 3.1 Kanban CRUD + realtime
- Client gọi REST -> API validates -> DB write -> API emit Socket.IO to `board:{boardId}` -> clients update UI.

### 3.2 Chat
- Client connect Socket.IO (JWT) -> join `board:{boardId}` -> send message -> server insert DB -> emit to room.

### 3.3 Reminder
- Client set reminder -> DB insert ReminderJob(PENDING)
- API schedule job via BullMQ (delay until `remindAt`)
- Worker consume job -> send SMTP -> update status SENT/FAILED (+ retry)

## 4) Suggested repo structure
- Monorepo:
  - `frontend/` (Vite)
  - `backend/` (Express + Socket.IO)
  - `worker/` (poller + SMTP)
  - `nginx/` (reverse proxy)
  - `docs/` (spec, contracts, backlog)

## 5) Realtime rooms & contracts
- Rooms:
   - `board:{boardId}`: board realtime events + board chat
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