# Database — Postgres + Prisma (TeamHub)

## 1) Lý thuyết nhanh
- Postgres: ACID transactions, constraints/indexes, phù hợp dữ liệu quan hệ (workspaces/boards/cards).
- Prisma: ORM type-safe, tăng tốc dev, có migrations.

---

## 2) Prisma setup trong TeamHub (điểm khác “default”)
TeamHub dùng Prisma theo kiểu:
- Postgres driver `pg` + pool
- Prisma v7 dùng **driver adapter**: `@prisma/adapter-pg`

Trong code:
- tạo `Pool({ connectionString })`
- tạo `new PrismaPg(pool)`
- tạo `new PrismaClient({ adapter })`

Ý nghĩa:
- Pooling do `pg` quản lý.
- Prisma query chạy qua adapter.

---

## 3) Schema conventions trong TeamHub
Trong `schema.prisma` có conventions rõ:
- UUID primary keys
- snake_case columns via `@map`
- `created_at` / `updated_at`
- `position` = Decimal (Postgres numeric) để reorder ổn định

Ví dụ use-case:
- lists/cards dùng `position` để kéo thả.

---

## 4) Migrations / deploy
Trong Docker Compose:
- service `db-migrate` chạy `prisma migrate deploy` (one-shot)
- backend/worker đợi migrate xong mới start

---

## 5) Khi nào TeamHub dùng SQL thuần?
Worker có một số job dùng `pg` client trực tiếp:
- Reminder job dùng transaction + `SELECT ... FOR UPDATE` để tránh gửi mail trùng.
- Analytics rollup đọc activities theo khoảng ngày.

Trade-off:
- SQL thuần rõ ràng với logic batch/locking.

---

## 6) Câu hỏi phỏng vấn hay gặp
1) *Vì sao position dùng Decimal thay vì integer?*
- Insert giữa 2 item không cần reindex toàn list.

2) *N+1 query là gì và tránh ra sao?*
- Dùng include/select hợp lý ở repo; cache cho read-heavy endpoints.

3) *Prisma migrations chạy ở đâu khi deploy?*
- One-shot container `db-migrate` chạy trước backend/worker.
