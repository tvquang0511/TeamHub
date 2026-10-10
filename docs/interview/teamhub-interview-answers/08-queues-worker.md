# 08 — BullMQ và worker

## 1. Vì sao cần worker riêng thay vì xử lý email ngay trong request API?

Gửi mail, cleanup storage và rollup analytics có thể chậm hoặc retry. Nếu chạy trong HTTP request, user phải chờ và API dễ cạn tài nguyên. Worker độc lập nhận job từ Redis nên API trả response nhanh và có thể scale worker theo tải nền.

## 3. Các queue trong dự án gồm những job nào?

- `reminders`: delayed email theo `remindAt`.
- `emails`: reset password và verification.
- `analytics`: rollup chỉ số board hằng ngày.
- `blobs`: xóa object có delay và quét orphan định kỳ.

## 5. `attempts` và exponential backoff dùng để giải quyết gì?

Lỗi mạng/email provider/S3 thường là tạm thời. BullMQ retry với số lần giới hạn và exponential backoff làm giảm việc dồn request vào dependency đang lỗi. Hết retry thì job phải được quan sát và có đường xử lý failure.

## 6. Idempotent job là gì? Tại sao rất quan trọng?

Job chạy lại vẫn không tạo kết quả sai hoặc nhân đôi. Ví dụ xóa object S3: object đã không tồn tại coi như thành công; job dùng `jobId = bucket/objectKey` để tránh enqueue trùng. Đây là yêu cầu vì queue có thể retry sau khi worker crash.

## Bổ sung: Reminder tránh tạo trùng thế nào?

Database có unique `(cardId, userId, remindAt)` và job dùng ID ổn định. Khi cancel, backend remove theo job ID theo cách idempotent. Nếu gửi email cần chống duplicate chặt hơn, worker cần lưu/claim trạng thái `SENDING`/`SENT` theo transaction trước khi gửi.

## 12. Vì sao cron analytics chạy theo UTC?

UTC cho mốc chạy nhất quán, không bị lệch khi đổi timezone hoặc daylight-saving. Nếu báo cáo theo timezone khách hàng, cần quy đổi rõ ở tầng hiển thị/rollup thay vì để scheduler chạy mơ hồ.

## 13. Nếu Redis bị reset, scheduled/repeatable jobs bị ảnh hưởng thế nào?

Job pending và schedule nằm trong Redis có thể mất. Khi backend/worker khởi động lại phải đăng ký lại repeatable jobs; các side effect cần idempotent để recovery an toàn. Dữ liệu nghiệp vụ chính vẫn ở PostgreSQL.

## 2. BullMQ sử dụng Redis như thế nào?

Backend thêm job vào Redis-backed queue. Worker claim job, chạy processor, rồi BullMQ lưu trạng thái waiting, delayed, active, completed hoặc failed cùng retry/backoff metadata. Redis là hạ tầng queue; PostgreSQL vẫn giữ dữ liệu nghiệp vụ như card và reminder status.

## 4. Delayed job cho reminder hoạt động thế nào?

Backend tính `delay = max(0, remindAt - now)`, tạo job `send` có delay và `jobId` ổn định. Đến hạn, worker kiểm tra reminder còn `PENDING`, gửi email rồi đánh dấu `SENT`. Cancel phải remove job hoặc đổi trạng thái DB để job chạy muộn không gửi.

## 7. `jobId` giúp chống job trùng như thế nào?

`jobId` ổn định biểu diễn một side effect logic, như reminder ID hoặc `{bucket}/{objectKey}`. Enqueue lại cùng ID không tạo job độc lập theo quy tắc BullMQ. Nó bổ sung, không thay unique constraint và trạng thái database.

## 8. Nếu worker chết giữa lúc gửi email thì chuyện gì có thể xảy ra?

Provider có thể đã nhận email nhưng worker chết trước khi ghi `SENT`, nên retry tạo mail trùng; hoặc worker chết trước khi gọi provider thì retry là đúng. Đây là đặc tính at-least-once, không thể hứa exactly-once end-to-end chỉ bằng queue.

## 9. Làm sao giảm nguy cơ gửi email trùng?

Lưu trạng thái `PENDING/SENDING/SENT`, claim theo transaction hoặc conditional update và chỉ gửi khi chưa `SENT`. Dùng idempotency key với email provider nếu hỗ trợ, job ID ổn định và audit retry. Khi timeout mơ hồ, cần thiết kế idempotency thay vì retry mù quáng.

## 10. Vì sao xóa object S3 nên là async job?

Xóa object là network side effect chậm, có thể timeout và không cần chặn response user. API xóa DB reference rồi enqueue delete có retry/backoff; S3 delete NotFound coi như thành công. Blob sweeper là lớp safety net khi job/commit gặp lỗi.

## 11. Orphan blob là gì? Worker phát hiện và dọn thế nào?

Orphan blob là object trong bucket không còn reference DB, ví dụ upload thành công nhưng commit metadata thất bại. Sweeper list object theo trang, đối chiếu object key với các reference DB và xóa sau grace period. Grace period tránh xóa nhầm upload đang hoàn tất.

## 13. Nếu Redis reset, scheduled/repeatable jobs bị ảnh hưởng thế nào?

Delayed, pending và repeatable-job metadata có thể mất. Backend/worker cần đăng ký lại schedule khi startup; job quan trọng có thể backfill dựa vào PostgreSQL. Processor phải idempotent để replay/recovery không làm sai dữ liệu.

## 14. Làm sao quan sát queue lỗi, retry hay backlog?

Theo dõi waiting/active/delayed/failed, queue lag, tuổi job lâu nhất, retry count, processor duration và error rate qua BullMQ dashboard hoặc metrics/log tập trung. Alert khi failed/backlog vượt ngưỡng; log job ID và resource ID nhưng redact secret/token.

## 15. Khi nào nên tách worker thành service độc lập hoàn toàn?

Khi workload nền cần scale, deploy, permission hoặc lifecycle khác API; ví dụ xử lý file/AI CPU-heavy hay lượng email lớn. Với đồ án, worker process riêng trong cùng codebase đủ đơn giản. Chỉ tách sâu hơn khi metric và ownership chứng minh lợi ích vượt chi phí vận hành.
