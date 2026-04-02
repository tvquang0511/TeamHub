# Background jobs & queues (BullMQ)

TeamHub dùng BullMQ (Redis-backed) cho các job nền và side-effects.

Nguyên tắc chung:
- Job nên **idempotent** (chạy lại không gây sai dữ liệu).
- Nên cấu hình `attempts` + `backoff` cho transient failures.
- Dùng `jobId` để chống enqueue trùng khi cần.

---

## 1) `reminders` queue

### Job: `send`
- Mục tiêu: gửi reminder email đúng thời điểm `remindAt`.
- Enqueue: backend tính `delay = max(0, remindAt - now)`.
- Options:
  - `jobId = reminderJobId`
  - `delay = delayMs`
  - `attempts = 3`, `backoff = exponential(10s)`
- Cancel: backend remove job theo `jobId` (idempotent).

---

## 2) `emails` queue

### Job: `password_reset`
- Mục tiêu: gửi email reset password.
- Options:
  - `attempts = 3`, `backoff = exponential(10s)`
- Không có `delay` mặc định.

---

## 3) `analytics` queue

### Job: `board_metrics_daily`
- Mục tiêu: rollup metrics theo ngày.
- Scheduling:
  - Repeatable cron mỗi ngày (UTC) để tránh lệch timezone.
  - Có logic dọn repeatable legacy khác `tz`.
- Options:
  - `jobId = board_metrics_daily` (repeatable)
  - `attempts = 3`, `backoff = exponential(10s)`
- Manual enqueue: có helper enqueue theo `date` (cùng retry/backoff).

---

## 4) `blobs` queue

### Job: `delete_object`
- Mục tiêu: xoá object trong MinIO/S3 khi DB record bị xoá (attachment/avatar/background).
- Idempotency:
  - `jobId = "{bucket}/{objectKey}"`
  - S3 delete là idempotent (NotFound coi như OK).
- Options:
  - `delay = BLOB_DELETE_DELAY_MS` (default 60000ms)
  - `attempts = 10`, `backoff = exponential(10s)`

### Job: `sweep_orphans`
- Mục tiêu: dọn object orphan bằng cách reconcile DB references vs bucket listing.
- Scheduling:
  - Repeatable cron: `BLOB_SWEEP_CRON` + `BLOB_SWEEP_TZ` (bật/tắt bằng `BLOB_SWEEP_ENABLED`).
- Options:
  - `jobId = sweep_orphans`
  - `attempts = 3`, `backoff = exponential(30s)`

---

## 5) Redis notes
- BullMQ yêu cầu Redis ổn định; nếu Redis bị reset, repeatable jobs sẽ được schedule lại khi backend khởi động.
- Khi debug, kiểm tra queue state trong Redis (hoặc BullMQ UI nếu có).
