# TeamHub

TeamHub là ứng dụng quản lý công việc kiểu **Trello (Kanban)**, có **realtime sync** (Socket.IO), **chat theo board**, **email reminders** (BullMQ + Worker), **analytics**, và **upload attachments** (MinIO/S3 qua presigned URL).

## Chức năng chính
- **Auth**: register/login/refresh/logout, forgot/reset password
- **Workspace**: tạo workspace, quản lý members/roles, mời thành viên (invite) + accept lời mời
- **Board**: visibility (PRIVATE/WORKSPACE), board members
- **Kanban**: list/card, drag-drop reorder/move dựa trên **position float**
- **Card detail**: labels, assignees, checklists, comments, activity, attachments
- **Realtime**: đồng bộ board + chat panel theo board
- **Reminder email**: nhắc nhở theo từng user tự đặt
- **Analytics/Thống kê**: rollup jobs + dashboard
- **Blob storage**: avatar/background/attachments + cleanup (queue + sweeper)

## Chèn ảnh (screenshots) vào README
Bạn có thể tạo thư mục `docs/screenshots/` và đặt ảnh vào đúng tên file bên dưới.

Hướng dẫn nhanh:
1) Tạo thư mục `docs/screenshots/`
2) Export ảnh đúng tên (PNG/JPG)
3) Commit ảnh → GitHub sẽ render ngay trong README

### Home
![Home](docs/screenshots/home.png)

### Workspace
![Workspace](docs/screenshots/workspace.png)

### Workspace member
![Workspace member](docs/screenshots/workspace-member.png)

### Board
![Board](docs/screenshots/board.png)

### Board member
![Board member](docs/screenshots/board-member.png)

### Dialog accept lời mời
![Accept invite dialog](docs/screenshots/accept-invite-dialog.png)

### Card detail
![Card detail](docs/screenshots/card-detail.png)

### Thống kê (analytics)
![Analytics](docs/screenshots/analytics.png)

### Profile
![Profile](docs/screenshots/profile.png)

### Chat panel
![Chat panel](docs/screenshots/chat-panel.png)

## Tài liệu
### Architecture
- docs/architecture/overview.md
- docs/architecture/kanban.md
- docs/architecture/security.md
- docs/architecture/realtime-events.md
- docs/architecture/queues.md
- docs/architecture/blob-storage.md
- docs/architecture/caching.md
- docs/architecture/rate-limiting.md
- docs/architecture/env.md
- docs/architecture/deployment.md
- docs/architecture/use-case-diagram.md

### API docs
README không liệt kê endpoints (đã có tài liệu API riêng):
- docs/api/endpoints.md
- docs/api/errors.md
- Postman collections: backend/postman/collections/

---

## Build & run bằng Docker (ở cuối README)

### 1) Chuẩn bị `.env`
Xem hướng dẫn chi tiết: docs/architecture/env.md

Tối thiểu:
- backend/.env (JWT secrets, CORS, …)
- worker/.env (DB/Redis, SMTP nếu gửi mail thật)
- frontend/.env (VITE_API_BASE_URL cho dev)

### 2) Dev mode (infra deps only)
Chạy Postgres/Redis/MinIO bằng Docker:
```bash
make dev
```

Sau đó chạy 3 service trên host (3 terminal):
```bash
cd backend && npm install && npm run prisma:generate && npm run dev
cd worker && npm install && npm run dev
cd frontend && npm install && npm run dev
```

Stop:
```bash
make dev-down
```

### 3) Prod-like mode (everything in compose + nginx single origin)
```bash
make prod
```

Mở app:
- http://localhost/

Stop:
```bash
make prod-down
```

## Troubleshooting nhanh
- Trong prod-like mode, **không** mở `http://localhost:5173` (đó là port nội bộ trong docker network). Hãy mở `http://localhost/` (nginx port 80).
- Nếu backend báo lỗi Prisma Client: đảm bảo đã chạy `prisma generate` (compose hiện đã chạy trước khi `npm run dev`).
