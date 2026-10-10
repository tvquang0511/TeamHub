# Bản Đồ Module Backend Trong TeamHub

Thư mục này chứa toàn bộ tài liệu phân tích thiết kế, luồng dữ liệu (Data Flow) và bóc tách mã nguồn cho từng module nghiệp vụ của hệ thống **TeamHub**.

---

## 🗺️ Bản Đồ Lộ Trình Module (Module Roadmap)

Hệ thống được module hóa theo nguyên tắc **Domain-Driven & Layered Architecture**:

```
                                  [ CLIENT REQUEST ]
                                          │
                                          ▼
                                ┌──────────────────┐
                                │ Global RateLimit │
                                └─────────┬────────┘
                                          ▼
                          ┌──────────────────────────────┐
                          │   authJwt Middleware Guard   │
                          └──────────────┬───────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
 [ 01. AUTH & SECURITY ]      [ 02. WORKSPACES (Tenant) ]      [ 03. KANBAN CORE ]
 - JWT, Token Rotation        - Multi-tenancy Isolation        - Boards, Lists, Cards
 - SHA-256 Hashed Tokens      - RBAC Matrix (Owner/Admin/Mem)  - Fractional Indexing
 - Anti-enumeration flow      - Invite Token Lifecycle         - Versioned Caching
        │                                │                                │
        └────────────────────────────────┼────────────────────────────────┘
                                         │
        ┌────────────────────────────────┴────────────────────────────────┐
        ▼                                ▼                                ▼
 [ 04. REALTIME SOCKET ]      [ 05. STORAGE & BLOBS ]          [ 06. ASYNC WORKERS ]
 - Event Catalog              - MinIO/S3 Presigned URLs        - BullMQ Reminders
 - Board/Workspace Rooms      - Delayed Cleanup (60s)          - Daily Metrics Rollup
 - Socket Admin UI Auth       - Sweeper Orphan File Cron       - SMTP Email Processing
```

---

## 📚 Danh Mục Tài Liệu Chi Tiết

| STT | Module | File Tài Liệu | Trọng Tâm Thiết Kế |
| :---: | :--- | :--- | :--- |
| **01** | **Auth & Security** | [`01-auth-and-security.md`](./01-auth-and-security.md) | Cơ chế JWT kép, Refresh Token Rotation (RTR), Hash token bảo vệ database, chống User Enumeration, và Email Verification Gate. |
| **02** | **Workspaces & RBAC** | [`02-workspaces-and-memberships.md`](./02-workspaces-and-memberships.md) | Kiến trúc Multi-tenancy, Guards phân quyền (`Owner`, `Admin`, `Member`), luồng mời thành viên an toàn và quản lý thành viên. |
| **03** | **Kanban Core** | [`03-kanban-core-engine.md`](./03-kanban-core-engine.md) | Thuật toán toán học Fractional Indexing $O(1)$ tính toán vị trí thẻ, xử lý kéo thả qua cột, và vòng đời Archive vs Delete. |
| **04** | **Board RBAC & Cache** | [`04-kanban-permissions-and-caching.md`](./04-kanban-permissions-and-caching.md) | Two-Tier RBAC, Enterprise Read-Only Policy, kỹ thuật tách Actor khỏi Cache và ma trận Bump Version Redis. |
| **05** | **Storage & Blobs** | [`05-storage-and-blobs.md`](./05-storage-and-blobs.md) | Tải file trực tiếp lên MinIO/S3 qua Presigned URL, dọn dẹp file trễ (60s delay) và cron job dọn rác mồ côi. |
| **06** | **Realtime Socket** | [`06-realtime-engine.md`](./06-realtime-engine.md) | Quản lý kết nối WebSocket qua Socket.IO, cấu trúc Room, và từ điển sự kiện đồng bộ Kanban/Chat. |
| **07** | **Async Analytics** | [`07-analytics-engine.md`](./07-analytics-engine.md) | Đo lường hiệu năng Agile (Lead time, Cycle time), kiến trúc tính toán trước Daily Rollup và cache 10 phút. |
| **08** | **Frontend Architecture** | [`08-frontend-architecture.md`](./08-frontend-architecture.md) | React 19, TanStack Query v5 Server State, Optimistic Updates 60 FPS, Axios Interceptor Token Rotation. |

---

## 🏛️ Các Quyết Định Kiến Trúc Trọng Yếu (Architecture Decision Records - ADRs)

Xem chi tiết tại thư mục [`docs/architecture/adr/`](../architecture/adr/):
1. [`ADR-001: Fractional Indexing cho Kanban`](../architecture/adr/ADR-001-fractional-indexing-for-kanban.md)
2. [`ADR-002: Version-Stamp Cache Invalidation trên Redis`](../architecture/adr/ADR-002-redis-version-stamp-cache-invalidation.md)
3. [`ADR-003: Presigned URL Direct-to-Storage Upload`](../architecture/adr/ADR-003-s3-presigned-url-direct-upload.md)
4. [`ADR-004: Tách biệt Worker Service cho tác vụ bất đồng bộ`](../architecture/adr/ADR-004-isolated-worker-for-async-jobs.md)

## 🎯 Chuẩn Kiến Trúc Của Một Module Trong TeamHub

Mỗi module trong `backend/src/modules/` đều tuân thủ kiến trúc 4 tầng phân lập rõ ràng:

1. **Router (`*.router.ts`):** Khai báo HTTP method, đường dẫn, gắn middlewares (`authJwt`, `rateLimit`, RBAC guards).
2. **Controller (`*.controller.ts`):** Đọc request, validate input bằng thư viện **Zod**, bắt lỗi định dạng và điều hướng gọi Service.
3. **Service (`*.service.ts`):** Trái tim nghiệp vụ (Business Logic). Điều phối tính toán, phát sinh side-effects (Redis cache bump, push queue, emit socket).
4. **Repository (`*.repo.ts`):** Tầng giao tiếp cơ sở dữ liệu duy nhất thông qua **Prisma Client**.
