# BullMQ — Queues + Worker (TeamHub)

Mục tiêu phần này: bạn có thể giải thích vì sao TeamHub có **backend producer + worker consumer**, và nắm chắc 4 job chính: **emails / reminders / analytics rollup / blobs cleanup**.

Nguồn tham khảo “chuẩn ý bạn”:
- `docs/architecture/queues.md`
- Sequence diagrams: `docs/diagrams/sequence-diagram.md`

---

## 1) BullMQ là gì? Vì sao dùng?
BullMQ là job queue chạy trên Redis:
- Producer (backend) `queue.add(...)`
- Consumer (worker) `new Worker(queueName, processor, ...)`

Vì sao không làm đồng bộ trong request?
- **Latency**: gửi email/xoá blob/rollup metrics đều tốn thời gian
- **Reliability**: IO hay fail transient; queue có retry/backoff
- **Isolation**: worker có thể scale riêng (tăng concurrency) mà không ảnh hưởng API

---

## 2) Kiến trúc TeamHub (backend = producer/scheduler, worker = consumer)

### 2.1 Backend producer + scheduler
Backend tạo các queue:
- `emails`
- `reminders`
- `analytics`
- `blobs`

Default job options thường thấy:
- `removeOnComplete: true` (tránh Redis phình)
- `removeOnFail: 1000` (giữ một ít để debug)

Ngoài enqueue theo request (emails/reminders/blobs), backend còn làm nhiệm vụ “scheduler”:
- ensure repeatable jobs cho analytics rollup, blob sweeper… khi server start

### 2.2 Worker consumer
Worker tạo consumers theo queue name, mỗi queue có concurrency khác nhau (phù hợp workload):
- reminders: concurrency cao hơn (nhiều job nhỏ)
- analytics: concurrency thấp (job nặng)

Logging:
- log completed/failed để theo dõi
- (nếu production) nên có structured logs + tracing (phase sau)

---

## 3) 3 nguyên tắc “đi phỏng vấn phải nói được”

### 3.1 Idempotency
Job phải chạy lại vẫn đúng.

Chiến lược TeamHub:
- Dùng `jobId` theo business key:
  - reminder: `jobId = reminderJobId`
  - delete blob: `jobId = "{bucket}/{objectKey}"`
- Worker side: update theo trạng thái (PENDING -> SENT) trong transaction để chống gửi trùng.

### 3.2 Retry + backoff
Transient failures (SMTP/MinIO/network) cần retry:
- `attempts: N`
- `backoff: exponential(...)`

### 3.3 Delay & scheduling
BullMQ hỗ trợ:
- `delay` (reminder đúng thời điểm)
- `repeat` (cron, repeatable jobs)

---

## 4) Jobs trong TeamHub (chi tiết)

## 4.1 Queue `emails`
### Job: `password_reset`
Mục tiêu: gửi email reset password.

Producer (backend):
- Khi user forgot-password, backend enqueue job `password_reset`.
- Retry: `attempts=3`, `backoff=exponential(10s)`.

Consumer (worker):
- Processor gọi mailer (nodemailer) gửi email.

Điểm phỏng vấn:
- “Queue giúp gì?” -> retry/backoff + giảm latency API.

---

## 4.2 Queue `reminders`
### Job: `send`
Mục tiêu: gửi reminder email đúng `remindAt`.

Producer:
1) API nhận `remindAt`
2) Upsert `reminder_jobs` (status=PENDING)
3) Enqueue job với:
   - `delayMs = max(0, remindAt - now)`
   - `jobId = reminderJobId` (idempotent)
   - `attempts=3`, `backoff=exponential(10s)`

Consumer:
1) Khi đến giờ, worker nhận job
2) Mở transaction + `SELECT ... FOR UPDATE` row reminder_job
3) Chỉ gửi nếu row đang `PENDING`
4) Update `status=SENT` (hoặc FAILED nếu hết attempts)

Vì sao cần `FOR UPDATE`?
- Để chống double-send nếu job bị deliver 2 lần hoặc worker restart.

---

## 4.3 Queue `analytics`
### Job: `board_metrics_daily` (repeatable cron)
Mục tiêu: rollup metrics theo ngày, có thể kèm aggregation monthly.

#### 4.3.1 Repeatable scheduling
Backend ensure repeatable job khi startup:
- cron chạy mỗi ngày
- timezone khuyến nghị `UTC` để tránh drift
- có logic cleanup legacy repeatable jobs khác timezone (tránh bị chạy 2 lần/ngày)

#### 4.3.2 Rollup algorithm (high-level)
Theo sequence diagram ở `docs/diagrams/sequence-diagram.md`:
1) Scheduler enqueue job `analytics:board_metrics_daily { date }`
2) Worker đọc activities + cards/lists theo board
3) Worker upsert `board_metrics_daily` (và monthly aggregation nếu có)
4) Job completed

Điểm quan trọng để kể:
- Rollup tách khỏi request để không ảnh hưởng UX
- Upsert giúp idempotent (chạy lại vẫn ra kết quả đúng cho ngày đó)

#### 4.3.2.1 Metrics cụ thể TeamHub đang tính (đọc code là hiểu)
Rollup không chỉ “đếm event”, mà còn tính các chỉ số vận hành Kanban:

Nguồn dữ liệu:
- `lists.isDoing`, `lists.isDone` để nhận biết cột Doing/Done
- `activities` theo ngày (filter theo type)
- `cards` để tính WIP/overdue và để tính lead time

Các counters theo ngày (daily row):
- `cards_created_count`: số activity `CARD_CREATED`
- `cards_moved_count`: số activity `CARD_MOVED`
- `comments_count`: `COMMENT_ADDED`
- `attachments_count`: `ATTACHMENT_ADDED`
- `assignees_added_count`: `ASSIGNEE_ADDED`
- `assignees_removed_count`: `ASSIGNEE_REMOVED`

`cards_done_count` (điểm thú vị):
- TeamHub xác định “card done” theo **thời điểm done cuối cùng** trong ngày:
  - event `CARD_UPDATED` với payload `{ field: 'isDone', to: true }`, hoặc
  - event `CARD_MOVED` khi move vào list thuộc `isDone=true`
- Với mỗi card, lấy `doneAt` là timestamp lớn nhất trong ngày
- `cards_done_count = số cardIds có doneAt`

WIP & overdue:
- `wip_count` = số card đang nằm trong list Doing (nếu có cấu hình Doing),
  - fallback: count card `is_done=false` nếu board chưa set Doing lists
- `overdue_count` = số card `is_done=false` và `due_at < dayEnd`

Lead time vs Cycle time (đi phỏng vấn rất hay hỏi):
- **Lead time**: từ `cards.created_at` -> `doneAt` (sec)
- **Cycle time**: từ lúc card **lần đầu vào Doing** -> `doneAt`
  - tìm “firstDoingAt” bằng cách quét lịch sử `CARD_MOVED` trước `dayEnd` và lấy lần sớm nhất move vào Doing list
- `avg_lead_time_sec`, `avg_cycle_time_sec` là average (làm tròn) theo các card done trong ngày

Monthly aggregation:
- Sau khi upsert daily, TeamHub upsert monthly bằng cách sum các daily rows trong tháng và average lại cycle/lead times.

Điểm hay để kể:
- Metrics dựa trên event log + state (cards/lists) nên vừa phản ánh hành vi (events) vừa phản ánh snapshot (WIP/overdue).

#### 4.3.3 Cache invalidation sau rollup
Sau khi rollup xong, worker/backend bump analytics cache version:
- `cache:v1:analytics:board:{boardId}:ver` (INCR)

Hệ quả:
- FE gọi analytics API sẽ hit key mới, tránh hiển thị số cũ.

---

## 4.4 Queue `blobs`
### Job: `delete_object`
Mục tiêu: xoá object trong MinIO/S3 khi DB metadata đã bị xoá.

Producer:
- Sau khi xoá DB record (attachment/avatar/background), enqueue delete_object với:
  - data `{ bucket, objectKey }`
  - `jobId = "{bucket}/{objectKey}"` (idempotent)
  - `delay = BLOB_DELETE_DELAY_MS` (cho eventual consistency hoặc “undo” ngắn)
  - `attempts = 10`, backoff exponential

Consumer:
- Gọi `removeObject`.
- Nếu NotFound -> coi như OK (delete trong S3/MinIO là idempotent).

### Job: `sweep_orphans` (repeatable cron)
Mục tiêu: reconcile bucket listing vs DB references để dọn rác.

Tại sao cần sweeper nếu đã enqueue delete?
- Redis reset / job fail lâu
- dữ liệu bị xoá thủ công
- legacy object keys

Sweeper (high-level):
1) Build referenced set từ DB
2) List objects trong buckets
3) Xoá orphan đã quá “grace period”

---

## 5) Redis connection notes (BullMQ-specific)
BullMQ khuyến nghị một số option để tránh lỗi offline queue:
- `maxRetriesPerRequest: null`

Giải thích đơn giản khi phỏng vấn:
- Giúp BullMQ xử lý reconnect/blocked commands ổn hơn (không retry kiểu “kẹt”).

---

## 6) Debug checklist (queue/worker)
1) Redis up chưa? URL đúng chưa?
2) Worker có chạy không? (container/process)
3) Job có vào queue không? (log producer)
4) Job fail vì gì? (log consumer + fail history)
5) Repeatable job có bị duplicate do timezone/cấu hình không?
6) Idempotency có đảm bảo không? (`jobId`, upsert, status transitions)

---

## 6.1) Code pointers (đọc theo flow)
Backend (producer + scheduler):
- Queue definitions: `backend/src/integrations/queue/*.queue.ts`
- Ensure repeatable jobs (analytics/blob sweep) thường nằm ở `backend/src/server.ts` hoặc `backend/src/jobs/*`

Worker (consumers):
- Worker bootstrap + concurrency: `worker/src/main.ts`
- Reminders processor: `worker/src/modules/reminder/reminder.processor.ts`
- Emails processor: `worker/src/modules/email/email.processor.ts`
- Analytics processor (rollup + bump cache): `worker/src/modules/analytics/analytics.processor.ts`
- Blobs processors/sweeper: `worker/src/modules/blobs/*`

Shared infra:
- Redis connection options (BullMQ): tìm trong `backend/src/integrations/queue/*` và `worker/src/integrations/queue/*`

---

## 7) Câu hỏi phỏng vấn + câu trả lời mẫu

### Q1: “Idempotency trong queue làm sao?”
> Em đặt `jobId` theo business key (reminderJobId, bucket/objectKey) để chống enqueue trùng, và trong worker em dùng transaction + status check (PENDING -> SENT) để tránh double-send.

### Q2: “Vì sao analytics rollup chạy qua worker?”
> Vì rollup đọc nhiều dữ liệu và aggregate sẽ nặng, không phù hợp chạy trong request. Đưa sang worker giúp API responsive, rollup có retry, và sau khi xong em bump cache version để UI thấy số mới.

### Q3: “Repeatable job hay lỗi gì?”
> Hay gặp timezone drift hoặc schedule trùng khi thay config. Em dùng ensure-job khi startup và cleanup legacy repeatables khác timezone để tránh chạy 2 lần/ngày.
