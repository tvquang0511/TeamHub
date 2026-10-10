# TeamHub Documentation Portal — Trung Tâm Tài Liệu Hệ Thống

Chào mừng bạn đến với trung tâm tài liệu kỹ thuật của dự án **TeamHub**. Toàn bộ tài liệu được chuẩn hóa, phân loại khoa học theo chuẩn kỹ thuật phần mềm quốc tế để phục vụ cho việc: **học tập, đọc hiểu codebase, review kiến trúc và bảo vệ đồ án/phỏng vấn tuyển dụng**.

---

## 🗺️ Bản Đồ Điều Hướng Tài Liệu (Documentation Sitemap)

```
docs/
├── 🎓 modules/               # Bóc tách 8 Module nghiệp vụ cốt lõi (Trọng tâm Backend)
├── 🚀 stack/redis/           # Chuyên đề chuyên sâu 5 bài học về Redis
├── 🏛️ architecture/adr/       # Bộ 4 quyết định thiết kế kiến trúc chuẩn (ADRs)
├── 📐 diagrams/              # Sơ đồ PlantUML & Sơ đồ kiến trúc tổng thể
├── 🔌 api/                   # Danh mục toàn bộ REST API Endpoints & Mã lỗi
├── 🖼️ assets/                # Kho lưu trữ tập trung hình ảnh (Banner, UI, Diagrams)
└── 💼 interview/             # Tài liệu ôn tập phỏng vấn, kịch bản Q&A & CV
```

---

## 📚 1. Bộ Tài Liệu Bóc Tách Nghiệp Vụ (`docs/modules/`)

*Xem chi tiết mục lục tại [docs/modules/README.md](./modules/README.md)*

| STT | Tài liệu | Nội dung trọng tâm |
| :---: | :--- | :--- |
| **01** | [`01-auth-and-security.md`](./modules/01-auth-and-security.md) | Cơ chế JWT kép, Refresh Token Rotation (RTR), Hash SHA-256 bảo vệ DB, Anti-Enumeration. |
| **02** | [`02-workspaces-and-memberships.md`](./modules/02-workspaces-and-memberships.md) | Phân vùng Multi-tenancy, Guards phân quyền (`Owner`/`Admin`/`Member`), Vòng đời Invite. |
| **03** | [`03-kanban-core-engine.md`](./modules/03-kanban-core-engine.md) | Thuật toán toán học **Fractional Indexing $O(1)$**, Cross-list Moves, Archive vs Delete. |
| **04** | [`04-kanban-permissions-and-caching.md`](./modules/04-kanban-permissions-and-caching.md) | Two-Tier RBAC, Enterprise Read-Only Policy, Kỹ thuật tách Actor khỏi Cache. |
| **05** | [`05-storage-and-blobs.md`](./modules/05-storage-and-blobs.md) | Tải file Direct-to-Storage qua Presigned URL, Xóa hoãn 60s, Janitor Sweeper dọn rác mồ côi. |
| **06** | [`06-realtime-engine.md`](./modules/06-realtime-engine.md) | WebSocket Handshake qua JWT, Room Topology (`user:` & `board:`), Event Catalog, Push Service. |
| **07** | [`07-analytics-engine.md`](./modules/07-analytics-engine.md) | Đo lường hiệu năng Agile (Lead/Cycle time), Kiến trúc tính toán trước Daily Rollup. |
| **08** | [`08-frontend-architecture.md`](./modules/08-frontend-architecture.md) | React 19, Feature-driven, TanStack Query v5 Server State, Optimistic Updates 60 FPS. |

---

## 🚀 2. Chuyên Đề Công Nghệ Hạ Tầng: Redis (`docs/stack/redis/`)

*Xem chi tiết mục lục tại [docs/stack/redis/README.md](./stack/redis/README.md)*

* [01 - Tổng Quan & Bản Chất Cốt Lõi Của Redis](./stack/redis/01-overview-and-fundamentals.md)
* [02 - Kỹ Thuật Caching & Version-Stamping Chuyên Sâu](./stack/redis/02-caching-deep-dive.md)
* [03 - Hàng Đợi Nhiệm Vụ (BullMQ & Worker Service)](./stack/redis/03-bullmq-job-queues.md)
* [04 - Kiểm Soát Lưu Lượng & Chống Tấn Công (Rate Limiting)](./stack/redis/04-rate-limiting.md)

---

## 🏛️ 3. Các Quyết Định Kiến Trúc (Architecture Decision Records - ADRs)

Thư mục: [`docs/architecture/adr/`](./architecture/adr/)

1. [`ADR-001: Fractional Indexing Cho Sắp Xếp Kanban`](./architecture/adr/ADR-001-fractional-indexing-for-kanban.md) — Sử dụng số thực `Decimal` $O(1)$ thay thế cho số nguyên $O(N)$ tránh nghẽn Database.
2. [`ADR-002: Version-Stamp Cache Invalidation Trên Redis`](./architecture/adr/ADR-002-redis-version-stamp-cache-invalidation.md) — Sử dụng bộ đếm Atomic `INCR` thay cho quét pattern `SCAN`/`DEL` gây đứng Redis.
3. [`ADR-003: Presigned URLs Tải Tệp Trực Tiếp Lên Object Storage`](./architecture/adr/ADR-003-s3-presigned-url-direct-upload.md) — Sử dụng chữ ký SigV4 cho client upload thẳng lên S3 thay vì trung chuyển qua Node.js.
4. [`ADR-004: Tách Biệt Worker Service Cho Tác Vụ Bất Đồng Bộ`](./architecture/adr/ADR-004-isolated-worker-for-async-jobs.md) — Phân tách tiến trình Worker độc lập với API Server để xử lý gửi mail SMTP và cron dọn rác.

---

## 📐 4. Sơ Đồ Kiến Trúc & Luồng Hệ Thống (`docs/diagrams/`)

* [Sơ đồ Kiến Trúc Tổng Thể (System Architecture)](./diagrams/system-architecture.md)
* [Sơ đồ Thành Phần Hệ Thống (Component Diagram)](./diagrams/component-diagram.md)
* [Sơ đồ Tuần Tự Tương Tác (Sequence Diagrams)](./diagrams/sequence-diagram.md)
* [Sơ đồ Cơ Sở Dữ Liệu (Database ERD Diagram)](./diagrams/database-diagram.md)

---

## 🖼️ 5. Kho Tài Nguyên Hình Ảnh Tập Trung (`docs/assets/`)

*Xem chi tiết mục lục tại [docs/assets/README.md](./assets/README.md)*

* `docs/assets/teamhub-banner.png`: Banner thương hiệu chính.
* `docs/assets/screenshots/`: 18 ảnh chụp màn hình các tính năng trên giao diện Web.
* `docs/assets/diagrams/`: 11 ảnh sơ đồ kiến trúc và luồng tuần tự export từ PlantUML.
