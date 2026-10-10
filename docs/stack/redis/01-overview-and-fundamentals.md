# 01 - Tổng Quan & Bản Chất Cốt Lõi Của Redis

---

## 1. Redis Là Gì? Vì Sao TeamHub Cần Redis?

**Redis** viết tắt của **RE**mote **DI**ctionary **S**erver. Đây là một hệ quản trị cơ sở dữ liệu khóa-giá trị (Key-Value) mã nguồn mở, hoạt động hoàn toàn trên bộ nhớ RAM (**In-Memory Data Store**).

### Tại sao TeamHub lại đưa Redis vào kiến trúc?
Nếu chỉ dùng cơ sở dữ liệu quan hệ truyền thống (**PostgreSQL**):
1. **Tốc độ đọc đĩa (Disk I/O):** Mỗi truy vấn dữ liệu Kanban (Board, Lists, Cards, Labels) hay xác thực thành viên (Membership) đều phải thực hiện JOIN nhiều bảng và đọc từ đĩa, độ trễ từ **5ms - 50ms**.
2. **Nghẽn tác vụ nặng (Blocking CPU/IO):** Khi gửi email, lập lịch nhắc hẹn, tổng hợp biểu đồ phân tích (Analytics rollup), nếu thực hiện trực tiếp trong tiến trình API sẽ làm nghẽn Event Loop của Node.js, khiến người dùng khác bị giật lag.
3. **Chống tấn công Brute-force & Spam:** Kiểm tra số lần đăng nhập sai hoặc spam API nếu ghi/đọc liên tục vào PostgreSQL sẽ làm phình to bảng log và lock bảng.

👉 **Redis giải quyết triệt để 3 vấn đề trên**:
* Lưu trữ trên RAM giúp thời gian phản hồi ở mức **Sub-millisecond** (dưới 1 phần nghìn giây, xấp xỉ 0.2ms - 1ms).
* Đóng vai trò là **Message Broker** trung gian, tách biệt các tác vụ nặng ra một tiến trình riêng (**Worker Service**).
* Cung cấp các lệnh nguyên tử (**Atomic Operations**) như `INCR`, `EXPIRE` để xử lý Rate Limiting mà không sợ Race Condition.

---

## 2. Redis Bao Gồm Những Thành Phần Cốt Lõi Nào?

Để hiểu toàn diện về Redis, bạn cần nắm vững 4 mảng cấu thành chính:

```
                            +--------------------------------------------------+
                            |                   REDIS ENGINE                   |
                            +--------------------------------------------------+
                                  |                 |                 |
                   +--------------+                 |                 +--------------+
                   v                                v                                v
       [ 1. Data Structures ]              [ 2. Storage & Memory ]          [ 3. High Availability ]
       * Strings (SET, GET, INCR)          * In-Memory Engine               * Replication (Master-Replica)
       * Hashes (HSET, HGET)               * Eviction Policies (LRU/LFU)    * Sentinel (Failover)
       * Lists (LPUSH, RPOP)               * Persistence:                   * Cluster (Sharding)
       * Sets (SADD, SMEMBERS)               - RDB (Snapshots)
       * Sorted Sets (ZADD, ZRANGE)          - AOF (Append-Only File)
       * Streams (XADD, XREAD)
```

### 2.1 Các cấu trúc dữ liệu cơ bản (Data Structures)
Khác với Memcached chỉ hỗ trợ kiểu chuỗi (String), Redis hỗ trợ đa dạng cấu trúc dữ liệu:
1. **String:** Cấu trúc cơ bản nhất (Text, JSON string, số nguyên Counter, nhị phân).
   * *Ứng dụng trong TeamHub:* Cache JSON payload (Board view, Card detail), Counter cho Rate limiting (`INCR`), Version tracking.
2. **Hash:** Lưu trữ dạng bảng băm (Field - Value), thích hợp mô hình hóa Object.
3. **List:** Danh sách liên kết hai chiều (Linked List), thao tác thêm/lấy ở đầu/cuối với độ phức tạp $O(1)$. Thường dùng làm hàng đợi cơ bản.
4. **Set:** Tập hợp các phần tử duy nhất, không trùng lặp, hỗ trợ phép giao, hợp.
5. **Sorted Set (ZSet):** Tập hợp có sắp xếp theo trọng số (Score).
   * *Ứng dụng trong BullMQ:* BullMQ dùng ZSet của Redis để quản lý các **Delayed Jobs** (Score chính là timestamp thời điểm job cần kích hoạt).
6. **Stream:** Cấu trúc dữ liệu ghi nối tiếp (Log-like) hỗ trợ Consumer Groups, tương tự Apache Kafka ở quy mô nhẹ.

### 2.2 Kiến trúc xử lý đơn luồng (Single-Threaded Event Loop)
* Redis xử lý các lệnh đọc/ghi trên một luồng chính duy nhất (**Single-threaded**), kết hợp với kỹ thuật **I/O Multiplexing** (như `epoll` trên Linux).
* **Lợi thế cực lớn:** Bạn không bao giờ phải lo lắng về **Locking, Deadlock hay Race Condition** giữa các câu lệnh trên cùng một key. Một lệnh `INCR` hay `SET NX` luôn được thực thi trọn vẹn trước khi lệnh khác chen vào (Atomic).

### 2.3 Cơ chế lưu trữ bền vững (Persistence)
Dù là In-Memory, Redis không làm mất dữ liệu khi khởi động lại nhờ 2 cơ chế:
1. **RDB (Redis Database Snapshot):** Định kỳ sao lưu toàn bộ snapshot bộ nhớ ra file nhị phân (vd: `dump.rdb`). Gọn nhẹ, phục hồi nhanh.
2. **AOF (Append-Only File):** Ghi lại mọi câu lệnh ghi vào file log liên tục (`appendonly.aof`). An toàn hơn, ít rủi ro mất dữ liệu hơn RDB.

### 2.4 Quản lý vòng đời dữ liệu (TTL & Eviction)
* **TTL (Time-To-Live):** Cho phép đặt thời gian hết hạn (`EXPIRE`) cho từng key. Khi hết giờ, Redis tự thu hồi bộ nhớ.
* **Eviction Policy:** Khi RAM đầy, Redis có các thuật toán dọn dẹp như:
  * `noeviction`: Báo lỗi khi ghi thêm.
  * `allkeys-lru` / `volatile-lru`: Xóa các key ít được dùng nhất gần đây (Least Recently Used).
  * `allkeys-lfu` / `volatile-lfu`: Xóa các key có tần suất truy cập thấp nhất (Least Frequently Used).

---

## 3. Redis Được Xây Dựng & Phân Bổ Thế Nào Trong TeamHub?

Trong TeamHub, thay vì phải dựng 3 dịch vụ riêng biệt, ta tận dụng sức mạnh của **1 cụm Redis duy nhất** để phục vụ 3 nhu cầu khác nhau nhờ kỹ thuật **Namespacing (Phân vùng tiền tố Key)**:

```
                            [ CỤM REDIS DUY NHẤT ]
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
  Prefix: `cache:v1:*`            Prefix: `bull:*`               Prefix: `rl:v1:*`
  
  Trụ Cột 1: CACHE               Trụ Cột 2: MESSAGE QUEUE       Trụ Cột 3: RATE LIMIT
  - Lưu trữ JSON data            - BullMQ Streams/ZSets         - Lưu Counter cửa sổ
  - Version stamp                - Producer: API Server         - Bảo vệ API khỏi spam
  - Tăng tốc đọc Kanban          - Consumer: Worker Service     - Chống DoS / Brute-force
```

### Bảng Phân Tách Namespace Chuẩn Trong TeamHub:

| Namespace / Prefix | Công nghệ quản lý | Mục đích cụ thể trong TeamHub | Nơi khai báo code |
| :--- | :--- | :--- | :--- |
| `cache:v1:board:*` | Custom Helper (`ioredis`) | Cache toàn bộ danh sách cards, lists, members, labels của một Board | [`redisCache.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/infrastructure/redis/redisCache.ts) |
| `cache:v1:member:*` | Custom Helper (`ioredis`) | Cache quyền của User trong Workspace / Board để giảm tải check AuthZ | [`boards.repo.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/boards/boards.repo.ts) |
| `cache:v1:card:*` | Custom Helper (`ioredis`) | Cache chi tiết thông tin một thẻ cụ thể | [`cards.service.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/cards/cards.service.ts) |
| `bull:notifications:*` | BullMQ | Hàng đợi gửi email nhắc việc (Reminder) và email reset mật khẩu | [`reminders.queue.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/infrastructure/queue/reminders.queue.ts) |
| `bull:background_tasks:*`| BullMQ | Hàng đợi tác vụ nền: Dọn dẹp S3 Storage, Rollup báo cáo Analytics | [`analytics.queue.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/infrastructure/queue/analytics.queue.ts) |
| `rl:v1:*` | Custom Middleware | Giới hạn số lượt request/phút theo IP hoặc theo User ID | [`rateLimit.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/common/middlewares/rateLimit.ts) |

---

## 4. Mô Hình Triển Khai Hạ Tầng (Infrastructure Setup)

### 4.1 Môi trường Local Development (Docker)
Khi chạy offline trên máy tính, Redis được khởi chạy qua Docker Compose:

File: [`infra/docker-compose.dev.yml`](file:///d:/projects/persional-projects/Teamhub/infra/docker-compose.dev.yml)
```yaml
redis:
  image: redis:7
  container_name: teamhub-redis
  restart: unless-stopped
  ports:
    - "6379:6379"
  volumes:
    - redis-data:/data
```
* Phiên bản sử dụng: **Redis 7 Alpine**.
* Cổng giao tiếp chuẩn: **6379**.
* Dữ liệu được mount vào volume `redis-data` để không bị mất khi stop container.

### 4.2 Môi trường Cloud / Production (Valkey / Upstash Redis)
Khi đưa lên Internet hoặc chạy thử nghiệm với Cloud:
* TeamHub hỗ trợ kết nối trực tiếp với **Upstash Serverless Redis** hoặc **Aiven / Valkey** thông qua kết nối bảo mật **TLS** (`rediss://`).
* Định dạng URI kết nối:
  ```env
  REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
  ```

### 4.3 Cấu hình Client thư viện `ioredis`
Cả Backend và Worker đều sử dụng driver **ioredis** mạnh mẽ nhất trong hệ sinh thái Node.js:

File: [`backend/src/infrastructure/redis/redisCache.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/infrastructure/redis/redisCache.ts)
```typescript
_redis = new IORedis(env.REDIS_URL, {
  // Quan trọng: Tắt giới hạn số lần retry cho mỗi request để tương thích hoàn toàn với BullMQ
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});
```

---

## 5. Danh Mục Biến Môi Trường (Environment Variables)

Hệ thống cung cấp các biến môi trường cấu hình linh hoạt trong [`backend/src/config/env.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/config/env.ts):

| Biến môi trường | Giá trị mặc định | Giải thích ý nghĩa |
| :--- | :--- | :--- |
| `REDIS_URL` | `redis://localhost:6379` | Chuỗi kết nối tới Redis Server |
| `CACHE_ENABLED` | `true` | Bật/tắt toàn bộ tầng Cache (hữu ích khi cần debug trực tiếp DB) |
| `CACHE_PREFIX` | `cache:v1` | Tiền tố cho toàn bộ key bộ nhớ đệm |
| `CACHE_BOARD_VIEW_TTL_SEC` | `120` | Thời gian sống của cache màn hình Board (2 phút) |
| `CACHE_MEMBERSHIP_TTL_SEC` | `60` | Thời gian sống của cache quyền thành viên (1 phút) |
| `CACHE_CARD_DETAIL_TTL_SEC` | `60` | Thời gian sống của cache chi tiết thẻ (1 phút) |
| `CACHE_ANALYTICS_TTL_SEC` | `600` | Thời gian sống của cache biểu đồ phân tích (10 phút) |
| `RATE_LIMIT_ENABLED` | `true` | Bật/tắt cơ chế bảo vệ Rate Limiting |
| `RATE_LIMIT_PREFIX` | `rl:v1` | Tiền tố cho các key đếm lượt truy cập |

---

## 🎯 Tổng Kết Bài Học 01
* Redis là hệ thống In-memory Key-Value cực nhanh, single-threaded, atomic.
* TeamHub gom 3 bài toán lớn (Cache, Queue, Rate Limit) vào 1 thể thống nhất của Redis nhờ tiền tố phân tầng (`cache:v1`, `bull:*`, `rl:v1`).
* Cấu hình sẵn sàng cho cả Docker local và Serverless Cloud Redis.

👉 *Bước tiếp theo: Mời bạn mở file [`02-caching-deep-dive.md`](./02-caching-deep-dive.md) để tìm hiểu chuyên sâu về kỹ thuật Caching và giải pháp Version-Stamping độc đáo của dự án.*
