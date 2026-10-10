# Blob storage — MinIO/S3 + Presigned URL (SigV4) + Cleanup (TeamHub)

Mục tiêu phần này: bạn nắm chắc **presign PUT/GET**, hiểu vì sao TeamHub dùng **Nginx single-origin**, và mô tả được **cleanup strategy** (delete job + sweeper + lifecycle).

Nguồn tham khảo “chuẩn ý bạn”:
- `docs/architecture/blob-storage.md`
- Sequence: `docs/diagrams/sequence-diagram.md` (blob delete)

---

## 1) Vì sao dùng MinIO/S3 + presigned URL?
Nếu backend “proxy upload” (client -> backend -> object storage) sẽ có các vấn đề:
- Backend tốn bandwidth/CPU, dễ nghẽn khi file lớn
- Latency cao
- Khó scale (backend phải gánh IO)

Presigned URL giải quyết:
- Backend chỉ cấp quyền (signed URL) sau khi check authZ
- Client upload/download trực tiếp object storage

Điểm quan trọng khi đi phỏng vấn:
- **AuthZ vẫn nằm ở backend**: chỉ ai có quyền mới được cấp URL.
- URL có TTL -> rò rỉ cũng chỉ nguy hiểm trong thời gian ngắn.

---

## 2) Bucket strategy trong TeamHub
Trong dev compose, `minio-init` tạo 2 bucket:
1) `teamhub` (private)
  - dùng cho attachments (file, chat attachments…)
  - anonymous access: none
2) `teamhub-public` (public)
  - dùng cho avatar/background
  - anonymous download allowed (đơn giản hoá hiển thị ảnh)

Lifecycle:
- Best-effort rule expire prefix `tmp/` sau ~7 ngày (backstop cho upload tạm)

---

## 3) Presign SigV4: TeamHub implement tối giản như thế nào?
TeamHub tự implement presign theo AWS SigV4 (tối giản) với các điểm thiết kế:
- Path-style URL: `/{bucket}/{objectKey}` (khớp với Nginx proxy buckets)
- Dùng `UNSIGNED-PAYLOAD` (không hash payload khi presign PUT)
- Presign trả về:
  - `url` (có query params SigV4)
  - `headers` bắt buộc (vd `Content-Type`)

### 3.1 Tại sao path-style quan trọng?
Vì Nginx proxy buckets ở root:
- `/(teamhub|teamhub-public)/...` -> minio:9000

Nếu dùng virtual-host style (`bucket.endpoint/objectKey`) sẽ khó proxy “đẹp” trong 1 origin.

### 3.2 GET presign có “response override”
Khi presign GET, TeamHub có thể set:
- `response-content-disposition`: ép browser download với filename
- `response-content-type`: đảm bảo content-type đúng

Điểm này rất hay để kể: bạn kiểm soát UX download mà không cần backend stream file.

---

## 4) Flow attachments (private bucket) — chuẩn phỏng vấn

### 4.1 Upload: init/presign -> upload trực tiếp -> commit metadata
Luồng chuẩn (2-phase commit):
1) FE gọi API presign
  - `POST /attachments/cards/:cardId/presign`
  - body: `{ fileName, mimeType, size }`
2) Backend:
  - authZ: user phải có quyền write card
  - tạo objectKey (vd `cards/{cardId}/{timestamp}_{safeFileName}`)
  - trả `uploadUrl` + `headers` + `{ bucket, objectKey, url }`
3) FE dùng `fetch(uploadUrl, { method:'PUT', headers, body:file })`
  - upload thẳng qua Nginx -> MinIO
4) FE gọi API commit:
  - `POST /attachments/cards/:cardId/files`
  - body chứa `{ bucket, objectKey, fileName, mimeType, size, url }`
5) Backend commit DB row (source of truth) và trả attachment metadata

Tại sao cần bước commit?
- Object storage chỉ biết “có object”, không biết object thuộc card nào, quyền ai.
- DB row mới là “attachment exists” theo business.
- Nếu upload xong nhưng không commit -> coi như orphan, sweeper sẽ dọn.

### 4.2 Download
Luồng:
1) FE gọi API xin presign download
2) Backend authZ (user có quyền read card)
3) Backend trả downloadUrl (GET presign) kèm response-content-disposition

### 4.3 Delete
Luồng theo sequence diagram:
1) FE gọi `DELETE /attachments/:attachmentId`
2) Backend xoá DB metadata trước
3) Backend enqueue job `blobs:delete_object { bucket, objectKey }` (async)
4) Worker delete object trong MinIO (idempotent)

Tại sao xoá async?
- delete object là side-effect; nếu fail tạm thời không nên làm request fail
- queue retry/backoff

---

## 5) Avatars / workspace background (public bucket) — fixed key + cache bust
Vấn đề: nếu mỗi lần upload tạo key mới -> bucket phình.

TeamHub chọn fixed key (overwrite) để tránh rác:
- Avatar: `teamhub-public/avatars/{userId}`
- Workspace background: `teamhub-public/workspace-backgrounds/{workspaceId}`

Sau khi commit URL, thêm `?v={timestamp}` để cache-bust.

Điểm phỏng vấn:
- “Vì sao cần `?v=`?”
  - Vì browser/CDN cache có thể giữ ảnh cũ dù object overwritten. Query param buộc reload.

---

## 6) Nginx single-origin proxy buckets (rất quan trọng)
Trong `infra/nginx/conf.d/teamhub.conf`:
- `location ~ ^/(teamhub|teamhub-public)/ { ... proxy_pass http://minio:9000; }`

Mục tiêu:
- Browser chỉ làm việc với 1 origin (http://localhost)
- Không expose port MinIO ra ngoài
- Giảm complexity CORS

Điểm cấu hình đáng chú ý:
- `client_max_body_size 60m` (cho upload)
- `proxy_request_buffering off` + `proxy_buffering off`
  - tránh Nginx buffer toàn bộ file trước khi forward (tốt cho upload lớn)

---

## 7) Cleanup strategy: 3 lớp bảo vệ (rất “thực chiến”)
Theo `docs/architecture/blob-storage.md`, TeamHub làm 3 lớp:

### 7.1 Delete-on-delete (enqueue async delete)
- Khi DB record bị xoá -> enqueue `blobs:delete_object`.
- jobId `bucket/objectKey` để idempotent.

### 7.2 Periodic sweeper (reconcile DB references vs bucket)
Vẫn có orphan do:
- job fail lâu
- redis reset
- record bị xoá thủ công

Sweeper làm:
1) Build referenced set từ DB:
  - `card_attachments(bucket, object_key)`
  - `board_message_attachments(bucket, object_key)`
  - parse `users.avatar_url`, `workspaces.background_image_url` (best-effort)
2) List objects
3) Xoá orphan nếu quá grace period

Grace period giúp tránh xoá nhầm object vừa upload nhưng chưa commit kịp.

### 7.3 Lifecycle cho `tmp/`
- Backstop cuối: tmp objects tự expire.

---

## 7.1) Code pointers (đọc theo flow)
Presign (SigV4 tối giản):
- PUT presign: `backend/src/common/minio/minio.presign.put.ts`
- GET presign: `backend/src/common/minio/minio.presign.get.ts`

Upload flows:
- Attachments presign/commit: `backend/src/modules/attachments/*`
- User avatar init/commit: `backend/src/modules/users/*`
- Workspace background init/commit: `backend/src/modules/workspaces/*`

Queue cleanup:
- Blobs queue producer: `backend/src/integrations/queue/blobs.queue.ts`
- Blobs worker processors: `worker/src/modules/blobs/*`

Nginx single-origin buckets proxy:
- `infra/nginx/conf.d/teamhub.conf`

---

## 8) Câu hỏi phỏng vấn + câu trả lời mẫu

### Q1: “Presigned URL có rủi ro gì?”
> Nếu URL bị leak trong thời gian hiệu lực thì người có URL có thể upload/download. Em giảm rủi ro bằng TTL ngắn và chỉ cấp URL sau khi check authZ. Với private bucket, download cũng phải xin presign lại.

### Q2: “Vì sao phải commit metadata sau upload?”
> Vì upload chỉ tạo object, còn DB mới là source of truth cho business. Commit đảm bảo attachment gắn với card, có owner, và được enforce permission. Nếu user upload nhưng không commit thì sweeper/lifecycle sẽ dọn.

### Q3: “Tại sao cần sweeper nếu đã enqueue delete?”
> Delete job có thể fail/redis reset hoặc có dữ liệu legacy. Sweeper là backstop reconcile để đảm bảo bucket không phình và không giữ dữ liệu rác lâu dài.
