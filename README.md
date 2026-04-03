# TeamHub

TeamHub là đồ án xây dựng ứng dụng quản lý công việc theo mô hình **Trello / Kanban** (Workspace → Board → List → Card), hỗ trợ **realtime sync** (Socket.IO), **chat theo board**, **email reminders** chạy nền (BullMQ + Worker), **analytics**, và **upload attachments** qua **presigned URL** (MinIO/S3).

---

## 1) Giới thiệu đồ án

Mục tiêu của TeamHub là mô phỏng một hệ thống quản lý công việc nhiều người dùng:
- Tổ chức theo workspace/board, phân quyền theo role
- Kanban drag-drop reorder/move (tối ưu bằng chiến lược position float)
- Đồng bộ realtime để nhiều client thấy thay đổi ngay lập tức
- Tách các tác vụ gửi mail, rollup analytics, dọn blob… ra worker chạy nền

---

## 2) Công nghệ & công cụ đã sử dụng

### 2.1 Công nghệ chính
- **Frontend**: React + Vite + TypeScript + Tailwind
- **Backend**: Node.js + Express + TypeScript + Prisma
- **Realtime**: Socket.IO
- **Database**: PostgreSQL
- **Queue/Jobs**: BullMQ (Redis-backed)
- **Cache/Rate limiting**: Redis (best-effort, có thể bật/tắt bằng env)
- **Blob storage**: MinIO (S3-compatible) + presigned URL
- **Reverse proxy**: Nginx (single origin `/` + `/api/` + `/socket.io/`)
- **Container**: Docker + Docker Compose + Makefile shortcuts

### 2.2 Công cụ hỗ trợ phát triển & kiểm thử

#### Swagger (OpenAPI)
- Backend cung cấp **OpenAPI JSON**: `GET /openapi.json`
- Swagger UI: `/api-docs`

Gợi ý truy cập:
- Dev (backend chạy host): `http://localhost:4000/api-docs`
- Prod-like (qua Nginx): `http://localhost/api-docs`

#### Postman
- Bộ Postman collections nằm tại: `backend/postman/collections/`
- Có sẵn environment sample: `backend/postman/TeamHub-Local.postman_environment.json`

#### DBeaver
Mục đích: quản trị/quan sát dữ liệu PostgreSQL (tables, relations, queries).
- Dev (compose infra): kết nối `localhost:5432` (user/pass/db: `teamhub/teamhub/teamhub`)

#### RedisInsight
Mục đích: quan sát Redis keys/queues phục vụ BullMQ, cache và rate limit.
- Dev (compose infra): kết nối `localhost:6379`

---

## 3) Chức năng hệ thống (Frontend cung cấp)

> Ghi chú chèn ảnh: tạo thư mục `docs/screenshots/` và đặt ảnh đúng tên file như bên dưới. Nếu chưa có ảnh, README vẫn mô tả chức năng để đọc hiểu.

### 3.1 Home — danh sách workspaces
![Home](docs/screenshots/home.png)

Chức năng:
- Xem các workspace mà người dùng tham gia
- Điều hướng nhanh vào workspace/board gần đây

### 3.2 Workspace — quản lý workspace
![Workspace](docs/screenshots/workspace.png)

Chức năng:
- Tạo workspace
- Xem thông tin workspace, danh sách boards
- Mời thành viên vào workspace (invite) và quản lý lời mời

### 3.3 Workspace members — thành viên & phân quyền
![Workspace member](docs/screenshots/workspace-member.png)

Chức năng:
- Xem danh sách thành viên
- Cập nhật role (OWNER/ADMIN/MEMBER) theo policy
- Quản lý trạng thái lời mời (pending/accepted)

### 3.4 Board — Kanban view (lists/cards)
![Board](docs/screenshots/board.png)

Chức năng:
- Tạo/đổi tên/reorder lists
- Tạo/move/reorder cards bằng drag-drop
- Đồng bộ thay đổi realtime giữa nhiều client

### 3.5 Board members — quản lý thành viên board
![Board member](docs/screenshots/board-member.png)

Chức năng:
- Thêm/xoá thành viên board
- Thiết lập quyền thao tác theo board role
- Hỗ trợ visibility (PRIVATE/WORKSPACE) theo thiết kế backend

### 3.6 Accept invite — nhận lời mời
![Accept invite dialog](docs/screenshots/accept-invite-dialog.png)

Chức năng:
- Người dùng nhận lời mời và tham gia workspace
- Điều hướng về workspace/board tương ứng sau khi accept

### 3.7 Card detail — thao tác chi tiết trên card
![Card detail](docs/screenshots/card-detail.png)

Chức năng:
- Cập nhật title/description/due date
- Labels, assignees
- Checklists
- Comments + activity
- Attachments (upload qua presigned URL)
- Đặt/cancel reminders (worker gửi mail theo lịch)

### 3.8 Analytics dashboard — thống kê
![Analytics](docs/screenshots/analytics.png)

Chức năng:
- Xem thống kê/biểu đồ theo board và khoảng thời gian
- Dữ liệu được rollup bởi jobs nền (worker)

### 3.9 Profile — thông tin người dùng
![Profile](docs/screenshots/profile.png)

Chức năng:
- Cập nhật thông tin cá nhân (hiển thị tên, avatar… tuỳ triển khai)
- Tích hợp avatar lưu trên MinIO/S3

### 3.10 Chat panel — chat theo board (realtime)
![Chat panel](docs/screenshots/chat-panel.png)

Chức năng:
- Chat theo board (1 room/board)
- Gửi/sửa/xoá tin nhắn theo rule
- Đồng bộ realtime (Socket.IO)

---

## 4) Diagrams

### 4.1 Deployment diagram (prod-like compose)

```mermaid
flowchart LR
	U[User Browser]
	N[Nginx :80\nReverse Proxy]
	FE[Frontend\nVite Preview :5173]
	BE[Backend API\nExpress :4000]
	W[Worker\nBullMQ Consumers]
	PG[(PostgreSQL :5432)]
	R[(Redis :6379)]
	S3[(MinIO :9000)]
	SMTP[(SMTP Provider)]

	U -->|HTTP| N
	U -->|WebSocket| N

	N -->|/| FE
	N -->|/api/| BE
	N -->|/socket.io/| BE
	N -->|/api-docs<br/>/openapi.json| BE

	BE -->|Prisma| PG
	BE -->|enqueue jobs\ncache\nrate limit| R
	BE -->|presign| S3
	U -->|upload/download\n(presigned)| S3

	W -->|consume jobs| R
	W -->|read/write| PG
	W -->|blob cleanup| S3
	W -->|send emails| SMTP
```

### 4.2 Components diagram (logical)

```mermaid
flowchart TB
	subgraph Client
		UI[React UI\nPages + Components]
		State[State + API Client]
	end

	subgraph Backend
		REST[REST Controllers\n/auth /workspaces /boards ...]
		RT[Socket.IO Gateway\nrooms + events]
		Services[Services\n(authZ, business rules)]
		Prisma[Prisma Data Access]
	end

	subgraph Worker
		Q[Queue Processors\nreminders/emails/analytics/blobs]
	end

	DB[(PostgreSQL)]
	Redis[(Redis)]
	Obj[(MinIO/S3)]

	UI --> State
	State -->|HTTP /api| REST
	State -->|WS /socket.io| RT

	REST --> Services --> Prisma --> DB
	RT --> Services
	Services -->|enqueue| Redis
	Services -->|presign| Obj

	Q -->|consume| Redis
	Q --> DB
	Q --> Obj
```

### 4.3 Use case diagram

```mermaid
usecaseDiagram
	actor Guest as Guest
	actor User as User
	actor "Workspace Owner/Admin" as Admin
	actor Worker as Worker

	rectangle TeamHub {
		(Register/Login/Logout) as UC_Auth
		(Refresh token) as UC_Refresh
		(Forgot/Reset password) as UC_Reset

		(View my workspaces) as UC_WS_List
		(Create workspace) as UC_WS_Create
		(Invite member) as UC_WS_Invite
		(Accept invite) as UC_WS_Accept
		(Manage workspace members/roles) as UC_WS_Roles

		(Create board) as UC_Board_Create
		(Join board) as UC_Board_Join
		(Manage board members) as UC_Board_Members

		(Create/rename/reorder lists) as UC_Lists
		(Create/update/move cards) as UC_Cards
		(Card detail: labels/assignees/checklists/comments) as UC_Card_Detail
		(Attachments: upload & preview) as UC_Attach

		(Board chat realtime) as UC_Chat

		(Set/cancel reminder) as UC_Reminder
		(Send reminder emails) as UC_Worker_Reminder

		(View analytics/statistics) as UC_Analytics
		(Run analytics jobs) as UC_Worker_Analytics
	}

	Guest --> UC_Auth

	User --> UC_Auth
	User --> UC_Refresh
	User --> UC_Reset
	User --> UC_WS_List
	User --> UC_WS_Accept

	Admin --> UC_WS_Create
	Admin --> UC_WS_Invite
	Admin --> UC_WS_Roles
	Admin --> UC_Board_Create
	Admin --> UC_Board_Members

	User --> UC_Board_Join
	User --> UC_Lists
	User --> UC_Cards
	User --> UC_Card_Detail
	User --> UC_Attach
	User --> UC_Chat
	User --> UC_Reminder
	User --> UC_Analytics

	Worker --> UC_Worker_Reminder
	Worker --> UC_Worker_Analytics

	UC_Worker_Reminder ..> UC_Reminder : consumes jobs
	UC_Worker_Analytics ..> UC_Analytics : builds stats
```

---

## 5) Tóm tắt tài liệu kiến trúc (docs/architecture)

Các tài liệu trong `docs/architecture/` được dùng để “đóng khung” thiết kế và đảm bảo code/infra thống nhất:

- `overview.md`: bức tranh tổng quan (components chính + data flow) và các nguyên tắc thiết kế.
- `kanban.md`: domain Workspace/Board/List/Card, rules phân quyền, position-float ordering + rebalance, flow realtime.
- `security.md`: threat model tối thiểu, JWT access/refresh rotation, authZ theo workspace/board, Socket room join check.
- `realtime-events.md`: rooms + event contracts cho kanban/chat (client→server và server→client) + ack/error format.
- `queues.md`: thiết kế BullMQ queues (`reminders`, `emails`, `analytics`, `blobs`), idempotency, retry/backoff.
- `blob-storage.md`: presigned upload + cơ chế cleanup (delete-on-delete + sweeper + lifecycle `tmp/`).
- `caching.md`: cache-aside + TTL, version-stamp (bump version) để invalidate, keys/TTL/invalidation theo code.
- `rate-limiting.md`: fixed-window limiter Redis, key design + recommended profile cho các nhóm endpoint.
- `env.md`: hướng dẫn tạo `.env` cho backend/worker/frontend theo dev vs prod-like.
- `deployment.md`: mô tả môi trường dev/prod, vai trò Nginx, cách chạy compose + notes production.
- `use-case-diagram.md`: use case diagram (Mermaid) + mapping nhanh use case → các màn hình UI.

API docs (không liệt kê endpoints trong README):
- `docs/api/endpoints.md`
- `docs/api/errors.md`

---

## 6) Build & run bằng Docker

### 6.1 Chuẩn bị `.env`
Xem hướng dẫn chi tiết: `docs/architecture/env.md`.

Tối thiểu:
- `backend/.env`: JWT secrets, CORS/TRUST_PROXY, MINIO settings…
- `worker/.env`: DB/Redis, SMTP (nếu gửi mail thật)
- `frontend/.env`: `VITE_API_BASE_URL` (dev)

### 6.2 Dev mode (infra deps only)
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

### 6.3 Prod-like mode (everything in compose + nginx single origin)
```bash
make prod
```

Mở app:
- `http://localhost/`

Swagger:
- `http://localhost/api-docs`

Stop:
```bash
make prod-down
```

### 6.4 Troubleshooting nhanh
- Prod-like mode: không mở `http://localhost:5173` (port nội bộ). Luôn dùng `http://localhost/`.
- Nếu backend báo lỗi Prisma Client: cần `prisma generate` (compose đã chạy tự động trước khi start backend).
