# Lộ Trình Học PostgreSQL & Prisma ORM Trong TeamHub

Thư mục này chứa toàn bộ tài liệu chuyên sâu về **Cơ sở dữ liệu quan hệ PostgreSQL** và công cụ ánh xạ đối tượng **Prisma ORM** — tầng lưu trữ dữ liệu gốc (**Source of Truth**) của toàn bộ hệ thống **TeamHub**.

---

## 🗺️ Bản Đồ Lộ Trình Chuyên Đề (Roadmap)

| STT | Tài liệu | Trọng tâm kiến thức |
| :---: | :--- | :--- |
| **01** | [`01-postgres-fundamentals.md`](./01-postgres-fundamentals.md) | **Bản chất PostgreSQL:** Kiến trúc RDBMS, tính chất ACID, cơ chế MVCC, Write-Ahead Logging (WAL) và lý do chọn Postgres thay vì MySQL/MongoDB. |
| **02** | [`02-schema-design-and-indexes.md`](./02-schema-design-and-indexes.md) | **Thiết kế Schema & Tối ưu hóa Index:** Khóa chính UUID, kiểu số thực `Decimal(65, 30)` cho Kanban, Composite Unique Index, Cascading Delete và Indexing Strategy. |
| **03** | [`03-prisma-orm-deep-dive.md`](./03-prisma-orm-deep-dive.md) | **Prisma ORM Chuyên Sâu:** Rust Query Engine, phòng chống N+1 Query Problem, xử lý Giao dịch an toàn (`$transaction`), và Connection Pooling. |

---

## 🎯 Vị Trí Của PostgreSQL Trong TeamHub

```
[ Express API / Worker ]
           │
           ▼ (Prisma Client / Rust Engine)
┌────────────────────────────────────────────────────────┐
│                   POSTGRESQL ENGINE                    │
├────────────────────────────────────────────────────────┤
│  1. Quan hệ dữ liệu: Users ──► Workspaces ──► Boards   │
│  2. Toàn vẹn tham chiếu: Foreign Keys & Cascade Delete │
│  3. Giao dịch nguyên tử: ACID Transactions             │
│  4. Đánh chỉ mục tốc độ: B-Tree Indexes                │
│  5. Bền vững dữ liệu: Write-Ahead Log (WAL) đĩa cứng   │
└────────────────────────────────────────────────────────┘
```
