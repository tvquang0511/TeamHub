# Blob storage (MinIO/S3) — cleanup mechanism

TeamHub dùng MinIO (S3-compatible) để lưu **attachment**, **user avatar**, **workspace background** thông qua presigned URL.

Vấn đề thực tế: khi xoá record trong DB (attachment/avatar/background), object trong MinIO **không tự biến mất** trừ khi app chủ động xoá hoặc bạn cấu hình lifecycle.

Tài liệu này mô tả cơ chế "làm cả 3":
1) delete-on-delete (enqueue async delete),
2) periodic sweeper (reconcile DB vs bucket),
3) lifecycle cho `tmp/`.

---

## 1) Object key conventions

### 1.1 Attachments
- Card attachments: objectKey tuỳ theo flow upload, được lưu kèm `bucket` + `object_key` trong DB.
- Board chat message attachments: tương tự, lưu `bucket` + `object_key` trong DB.

### 1.2 Avatars / backgrounds (overwrite key)
Để tránh "rác" do mỗi lần upload tạo 1 key mới, avatar/background dùng **fixed key** (overwrite):
- Avatar: `teamhub-public/avatars/{userId}`
- Workspace background: `teamhub-public/workspace-backgrounds/{workspaceId}`

Khi commit, URL được cache-bust bằng `?v={timestamp}` để client reload ảnh mới.

---

## 2) Delete-on-delete (async)

Khi xoá entity trong DB, backend **enqueue** job xoá object (BullMQ) thay vì xoá trực tiếp đồng bộ.

Lý do:
- S3 delete có thể fail tạm thời; queue giúp retry/backoff.
- Xoá object là side-effect; không nên làm hỏng transaction chính.

Job:
- Queue: `blobs`
- Name: `delete_object`
- Data: `{ bucket, objectKey }`
- Idempotency: `jobId = "{bucket}/{objectKey}"` (enqueue nhiều lần vẫn an toàn)
 - Delay: `BLOB_DELETE_DELAY_MS` (default 60000ms)
 - Retry: attempts=10, backoff exponential (10s)

Lưu ý: delete trong S3/MinIO là idempotent; object không tồn tại coi như thành công.

---

## 3) Periodic sweeper (reconcile)

Ngoài delete-on-delete, vẫn có các tình huống tạo rác:
- Job delete bị fail quá lâu / redis reset
- Record DB bị xoá thủ công
- Legacy object keys (từng dùng timestamp)

Vì vậy có sweeper chạy định kỳ (cron) để:
- đọc danh sách object trong bucket,
- so với tập referenced trong DB,
- xoá các object **không được tham chiếu** và **đã đủ “grace period”**.

### 3.1 Referenced set
Sweeper coi các object sau là "đang dùng":
- `card_attachments(bucket, object_key)`
- `board_message_attachments(bucket, object_key)`
- `users.avatar_url` (best-effort parse `/{bucket}/{objectKey}`)
- `workspaces.background_image_url` (best-effort parse)

### 3.2 Grace period
- `BLOB_SWEEP_ORPHAN_GRACE_DAYS` (default 7): chỉ xoá object orphan nếu `lastModified` cũ hơn ngưỡng này.
- `BLOB_SWEEP_CHAT_UNLINKED_HOURS` (default 24): xoá object của chat attachments nếu message đã bị xoá (left join message null) và cũ hơn ngưỡng.

### 3.3 Scheduling
Backend schedule job repeatable:
- `BLOB_SWEEP_ENABLED` (default true)
- `BLOB_SWEEP_CRON` (default `30 1 * * *`)
- `BLOB_SWEEP_TZ` (default `UTC`)

Worker thực thi job `sweep_orphans`.

---

## 4) Lifecycle cho `tmp/`

Các object upload tạm (nếu có) nên đặt dưới prefix `tmp/` để MinIO tự expiry.

Trong dev compose, `minio-init` cố gắng apply rule:
- Expire `tmp/` sau 7 ngày cho cả `teamhub` và `teamhub-public`.

Lưu ý: CLI `mc` có thể thay đổi giữa versions, nên script đang chạy best-effort (không fail startup).

---

## 5) Operational notes

- Nên monitor bucket size + object count để phát hiện tăng trưởng bất thường.
- Nếu cần an toàn cao hơn, có thể thêm "tombstone" table cho blob references để dễ reconcile hơn (hiện tại chưa cần).
- Nếu chạy production với MinIO/S3 thật, nên triển khai lifecycle bằng IaC hoặc `mc ilm` trong pipeline thay vì chỉ dev compose.
