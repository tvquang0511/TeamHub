# Lộ Trình Học Redis Trong TeamHub

Thư mục này được biên soạn để giúp bạn làm chủ toàn diện công nghệ **Redis** — từ nền tảng lý thuyết cốt lõi đến cách áp dụng thực tế ở cấp độ production trong hệ thống **TeamHub**.

---

## 🗺️ Bản Đồ Học Tập (Learning Roadmap)

Hệ thống tài liệu được chia thành 4 phần chuyên sâu, tương ứng với 4 file:

| STT | Tài liệu | Nội dung chính |
| :---: | :--- | :--- |
| **01** | [`01-overview-and-fundamentals.md`](./01-overview-and-fundamentals.md) | **Tổng quan & Bản chất của Redis**<br>• Redis là gì? Kiến trúc In-memory & Event Loop.<br>• Các cấu trúc dữ liệu cốt lõi (String, Hash, List, Set, ZSet...).<br>• Tổng quan kiến trúc Redis trong TeamHub (3 trụ cột).<br>• Cấu hình môi trường (Docker local vs Upstash/Cloud). |
| **02** | [`02-caching-deep-dive.md`](./02-caching-deep-dive.md) | **Kỹ thuật Caching & Version-Stamping**<br>• Mô hình Cache-Aside, Fail-open, Non-blocking `UNLINK`.<br>• Negative Caching (chống spam DB).<br>• Kỹ thuật **Version-Stamp (Bump version)** xử lý cache invalidation mà không cần quét `SCAN`/`DEL`.<br>• Walkthrough code: Board View, Membership, Card & Analytics. |
| **03** | [`03-bullmq-job-queues.md`](./03-bullmq-job-queues.md) | **Hàng Đợi Nhiệm Vụ (BullMQ & Worker)**<br>• Cơ chế Queue trên nền Redis của BullMQ.<br>• Mô hình phân tách Producer (API) & Consumer (Worker).<br>• Thiết kế các hàng đợi `notifications` và `background_tasks`.<br>• Delayed Jobs (Reminder), Repeatable Jobs (Daily cron), Exponential Backoff.<br>• Tối ưu chi phí Redis Cloud (`stalledInterval`, `drainDelay`). |
| **04** | [`04-rate-limiting.md`](./04-rate-limiting.md) | **Kiểm Soát Lưu Lượng (Rate Limiting)**<br>• Thuật toán Fixed Window Counter bằng `INCR` + `EXPIRE`.<br>• Dynamic Scope: Phân biệt `ip` vs `user-or-ip` để tránh phạt oan.<br>• Phân tích middleware `rateLimit.ts` & các HTTP Headers chuẩn.<br>• So sánh các giải pháp Rate Limit và kịch bản nâng cấp. |

---

## 🎯 3 Trụ Cột Của Redis Trong Dự Án TeamHub

```
                                  +-----------------------+
                                  |      REDIS SERVER     |
                                  +-----------+-----------+
                                              |
                   +--------------------------+--------------------------+
                   |                          |                          |
                   v                          v                          v
          [ 1. Caching Layer ]       [ 2. Message Broker ]     [ 3. Traffic Protection ]
             Prefix: `cache:v1`         Prefix: `bull:*`          Prefix: `rl:v1`
                   |                          |                          |
       * Board View Payload       * BullMQ Queues:           * Fixed Window Counter
       * Membership Authz Check     - notifications            * Scope: IP (Public/Auth)
       * Card Detail Data           - background_tasks         * Scope: User-or-IP (Features)
       * Versioned Invalidation   * Worker Decoupling        * Fail-open Safety Net
```

---

## 💡 Gợi Ý Cách Học Hiệu Quả
1. Đọc lý thuyết trong tài liệu kết hợp đối chiếu trực tiếp với các file mã nguồn được đính kèm link.
2. Mở Redis CLI (qua docker container `teamhub-redis` hoặc client tool) để trực tiếp `MONITOR` hoặc `KEYS *` khi thao tác trên web app.
3. Chú ý các phần **"Góc nhìn phỏng vấn / Best Practices"** ở cuối mỗi tài liệu để chuẩn bị kiến thức bảo vệ đồ án tốt nhất.
