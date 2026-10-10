# TeamHub (05–12) — Bộ câu hỏi phỏng vấn “đặc sắc” (sát nội dung project)

Dùng file này để luyện theo kiểu **hỏi xoáy – trả lời gọn – bị hỏi follow-up**.

Mapping đúng theo các tài liệu:
- `interview/teamhub/05-realtime-socketio.md`
- `interview/teamhub/06-backend-express-architecture.md`
- `interview/teamhub/07-auth-jwt.md`
- `interview/teamhub/08-db-prisma-postgres.md`
- `interview/teamhub/09-redis-cache-rate-limit.md`
- `interview/teamhub/10-bullmq-queues-worker.md`
- `interview/teamhub/11-minio-presign-blob-storage.md`
- `interview/teamhub/12-docker-nginx.md`

---

## 05) Realtime Socket.IO (board chat + events)
1) Socket handshake auth: token đi qua `socket.handshake.auth.token` hay header? Vì sao TeamHub chọn access JWT cho socket?
2) Token hết hạn giữa phiên socket: symptom thường gặp là gì, và client nên xử lý reconnect/refresh ra sao?
3) `board:join` vì sao bắt buộc **check board membership** trước khi `socket.join('board:{boardId}')`? Nếu bỏ bước này leak gì?
4) TeamHub dùng ack callback `{ ok: true|false, error }`: lợi ích so với “emit fire-and-forget” là gì?
5) Thay vì duplicate authZ rule cho socket, TeamHub reuse service (vd gọi read chat với `limit: 1`) để enforce quyền: trade-off của cách này?
6) Contract events tối thiểu của chat (`send/edit/delete`) và server emits (`new/updated/deleted`) bạn nhớ được gì? Nếu đổi payload, versioning thế nào?
7) Consistency giữa REST mutate và socket broadcast: bạn tránh double-apply ở FE bằng chiến lược nào (upsert theo id, ignore actor, invalidate/refetch)?
8) Ordering: nếu event về out-of-order, client nên sort theo `createdAt` hay theo `position`? Với card/list reorder thì sorting theo gì?
9) Debug case “connect được nhưng không nhận event”: bạn kiểm tra gì trước (đã join đúng room chưa, emit đúng room string chưa, nginx upgrade chưa)?
10) Nginx proxy WebSocket: thiếu `Upgrade/Connection` hoặc timeout thấp sẽ gây symptom gì? Bạn set `proxy_read_timeout` theo nguyên tắc nào?

---

## 06) Backend Express architecture (router/service/repo + middleware)
1) Vì sao TeamHub có cả `app.ts` (Express app) và `server.ts` (HTTP server + Socket.IO + schedulers)? Nếu gộp có rủi ro gì?
2) Middleware stack: vì sao cần `trust proxy` khi chạy sau Nginx, và nó ảnh hưởng gì tới logging/rate limit?
3) Module boundary router → controller → service → repo: rule “cái gì không được nằm ở router/controller” của bạn là gì?
4) Validation bằng Zod: parse ở controller để trả `VALIDATION_ERROR` chuẩn; vậy service có cần validate lại không, khi nào?
5) Error handler: bạn map Zod errors, `ApiError`, Prisma `P2002` (unique) ra status code như thế nào cho frontend dễ xử lý?
6) AuthJwt middleware vs authZ: tại sao authZ nên nằm ở service (không chỉ middleware), và ví dụ bypass thường gặp?
7) Router-level rate limit trong TeamHub thường mount **sau `authJwt`** để dùng scope `user-or-ip`: vì sao fair hơn IP-only?
8) Endpoint nặng (board detail): bạn tối ưu theo thứ tự nào (query shape/select/include → cache → payload split) và vì sao?
9) Swagger/OpenAPI (`/openapi.json`, `/api-docs`): bạn đảm bảo doc không lệch code bằng cách nào?
10) Testability: với kiến trúc này bạn sẽ viết test ở level nào trước (service unit vs API integration) để bắt lỗi authZ nhanh nhất?

---

## 07) Auth JWT (access/refresh rotation + reset password)
1) Access token vs refresh token: vì sao TeamHub dùng access TTL ngắn và refresh TTL dài?
2) TeamHub lưu **hash refresh token** (SHA-256) trong DB thay vì plaintext: nếu DB leak thì khác nhau thế nào?
3) Refresh rotation: nếu attacker steal refresh token trước khi user refresh lần sau thì sao? Rotation giảm blast radius kiểu gì?
4) “Revoke access token ngay lập tức” khó vì JWT stateless: TeamHub giải thích/giảm rủi ro bằng cách nào?
5) Forgot-password: làm sao TeamHub tránh user enumeration (email có tồn tại hay không) nhưng vẫn UX ổn?
6) Reset password token: vì sao cũng nên lưu hash trong DB và one-time use? TTL/attempt limits đặt ở đâu?
7) Vì sao gửi email reset qua queue (`emails`) thay vì gửi đồng bộ trong request? Trade-off về reliability/latency?
8) Khi user reset password/đổi password, vì sao nên revoke toàn bộ refresh tokens hiện có?
9) Authorization model 2 tầng workspace → board: boundary nào “hay bị quên” nhất khi implement API/chat?
10) Token storage ở FE: nếu dùng cookie httpOnly vs localStorage, risk chính (CSRF vs XSS) khác nhau gì trong bối cảnh TeamHub?

---

## 08) Postgres + Prisma (schema + positions + migrations)
1) TeamHub dùng Prisma v7 + `@prisma/adapter-pg` (driver adapter): lợi ích/khác biệt so với “Prisma mặc định” là gì?
2) Setup `pg` Pool + adapter: bạn chọn pool size/timeout theo tiêu chí gì?
3) Vì sao Kanban dùng `position` = Decimal (Postgres numeric) thay vì index int? Khi nào cần rebalance/reindex?
4) Concurrency khi kéo thả: nếu 2 người cùng move vào giữa, position có thể “kẹt”/xung đột không? Bạn giải quyết bằng strategy nào?
5) N+1 query với Prisma: dấu hiệu/log nào giúp bạn phát hiện, và bạn sửa bằng `select/include` ra sao?
6) Constraints: unique nào là “cốt lõi” để tránh data corruption (membership, invites, board members…)?
7) Indexing cho endpoints nặng (board detail, analytics range): bạn ưu tiên index cột nào trước?
8) Migrations trong deploy: vì sao TeamHub dùng container one-shot `db-migrate` chạy `prisma migrate deploy` trước backend/worker?
9) Khi nào TeamHub dùng SQL thuần qua `pg` trong worker (vd job cần locking)? Tiêu chí chọn ORM vs SQL?
10) Debug migration drift: bạn kiểm tra sự khác nhau giữa `prisma/migrations` và `_prisma_migrations` như thế nào?

---

## 09) Redis cache + rate limit
1) Redis trong TeamHub làm 3 vai trò (cache/rate-limit/BullMQ). Bạn tách keyspace bằng prefix như thế nào để tránh đụng nhau?
2) Cache-aside: Redis down thì behavior của API/caching là gì và vì sao TeamHub chọn best-effort (không làm API chết)?
3) Version-bump invalidation: vì sao TeamHub dùng `board:{boardId}:ver` và key kèm `ver:{n}` thay vì `DEL cache:*`?
4) Board view cache: TeamHub cache phần “chung” và compute `actor` sau. Vì sao không cache `actor` chung trong key?
5) Negative caching membership bằng sentinel (vd `__none__`): lợi ích và rủi ro (stale authZ) là gì? TTL chọn sao?
6) Analytics cache dùng version riêng (`analytics:board:{boardId}:ver`) thay vì dùng chung với board view: vì sao cần tách?
7) Rate limit fixed window: key format có `windowStartSec` để làm gì, và “burst ở boundary” xuất hiện thế nào?
8) Scope `user-or-ip`: vì sao các router sau `authJwt` nên limit theo user để tránh chặn oan khi nhiều người chung IP?
9) `TRUST_PROXY=true` ảnh hưởng gì tới `req.ip` và tính đúng của rate limiting phía sau Nginx?
10) Rate limit headers (`Retry-After`, `X-RateLimit-*`): bạn dùng chúng để debug/throttle UI như thế nào?

---

## 10) BullMQ queues + worker (emails/reminders/analytics/blobs)
1) Vì sao TeamHub tách backend (producer/scheduler) và worker (consumer)? Worker chết thì phần nào degrade nhưng API vẫn chạy?
2) Default job options (`removeOnComplete`, `removeOnFail`) giúp gì? Nếu không set thì Redis phình ra sao?
3) Idempotency bằng `jobId`: TeamHub đặt `jobId` theo business key nào (reminderJobId, `bucket/objectKey`) và lợi ích?
4) Reminder double-send: vì sao worker dùng transaction + `SELECT ... FOR UPDATE` + status transition `PENDING -> SENT`?
5) Retry/backoff: job nào nên retry (SMTP/MinIO) và job nào không nên retry (validation/business rule)?
6) Repeatable jobs timezone: vì sao TeamHub chọn `tz=UTC`, và cleanup legacy repeatable khác tz để tránh chạy 2 lần/ngày làm sao?
7) “At-least-once” delivery: bạn thiết kế processor theo giả định nào để không double-count/double-send?
8) Analytics rollup idempotent bằng upsert: nếu job chạy lại cùng `date` thì logic phải đảm bảo gì?
9) Redis reset làm mất repeatables: TeamHub re-ensure schedule ở backend startup như thế nào để tự phục hồi?
10) BullMQ Redis connection note `maxRetriesPerRequest: null`: vì sao hay cần setting này cho BullMQ?

---

## 11) MinIO/S3 presigned URLs + blob cleanup
1) Vì sao TeamHub dùng presigned URL thay vì backend proxy upload? Trade-off về security/observability là gì?
2) TeamHub dùng bucket strategy `teamhub` (private) vs `teamhub-public` (public): vì sao cần 2 bucket?
3) Presign path-style `/{bucket}/{objectKey}`: vì sao quyết định này “ăn khớp” với Nginx single-origin proxy?
4) Presign PUT dùng `UNSIGNED-PAYLOAD`: lợi/hại gì? Khi nào bạn cần signed payload thật?
5) Flow 2-phase: presign -> upload -> commit metadata. Nếu upload xong không commit thì orphan dọn bằng cơ chế nào?
6) GET presign có `response-content-disposition` để ép download filename: vì sao đây là điểm UX tốt?
7) Vì sao TeamHub delete object async qua queue `blobs:delete_object` (delay + retry) thay vì sync delete trong request?
8) Sweeper reconcile: referenced set lấy từ các bảng/field nào, và vì sao cần grace period để tránh xoá nhầm?
9) Avatar/background fixed key overwrite + cache-bust `?v=`: nếu không có `?v=` thì bug gì xuất hiện?
10) Debug presign/upload fail: 3 nguyên nhân hay gặp nhất (clock skew, proxy path mismatch, Content-Type header mismatch) là gì?

---

## 12) Docker Compose + Nginx reverse proxy
1) TeamHub có 2 compose: `docker-compose.dev.yml` (deps only) và `docker-compose.yml` (prod-like). Vì sao tách, lợi ích khi dev/debug?
2) Container one-shot `db-migrate` chạy `prisma migrate deploy` trước backend/worker: nếu bỏ bước này hay gặp lỗi gì?
3) Nginx routing map bạn phải thuộc: `/` (FE), `/api` (backend), `/socket.io` (ws), `/(teamhub|teamhub-public)/...` (MinIO). Vì sao single-origin “đáng tiền”?
4) WebSocket qua Nginx: thiếu upgrade headers hoặc timeout thấp thì symptom thường gặp là gì?
5) Upload tuning: vì sao TeamHub bật `proxy_request_buffering off` + `proxy_buffering off`? Nếu bật buffering thì tốn gì?
6) `client_max_body_size`: đặt ở Nginx có ý nghĩa gì với presigned PUT? Nếu không set đúng sẽ thấy lỗi nào?
7) `TRUST_PROXY=true` ảnh hưởng gì tới rate limiting theo IP và log IP khi chạy sau Nginx?
8) Env MinIO: phân biệt `MINIO_ENDPOINT` (internal) vs `MINIO_PUBLIC_ENDPOINT` (browser-visible). Nếu config sai, presign sẽ lỗi kiểu gì?
9) Nếu scale backend lên 2 replicas: Socket.IO sẽ gặp vấn đề gì (sticky session, adapter Redis) và vì sao hiện tại TeamHub chưa cần?
10) Debug 502/504: bạn lần lượt kiểm tra gì (upstream name, container network, health, logs) để tìm root cause nhanh?
