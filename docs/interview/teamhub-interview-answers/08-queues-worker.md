# 08 — BullMQ và worker

## Vì sao tách worker khỏi API?

Gửi mail, cleanup storage và rollup analytics có thể chậm hoặc retry. Nếu chạy trong HTTP request, user phải chờ và API dễ cạn tài nguyên. Worker độc lập nhận job từ Redis nên API trả response nhanh và có thể scale worker theo tải nền.

## Các queue chính?

- `reminders`: delayed email theo `remindAt`.
- `emails`: reset password và verification.
- `analytics`: rollup chỉ số board hằng ngày.
- `blobs`: xóa object có delay và quét orphan định kỳ.

## Retry/backoff dùng để làm gì?

Lỗi mạng/email provider/S3 thường là tạm thời. BullMQ retry với số lần giới hạn và exponential backoff làm giảm việc dồn request vào dependency đang lỗi. Hết retry thì job phải được quan sát và có đường xử lý failure.

## Idempotent job là gì?

Job chạy lại vẫn không tạo kết quả sai hoặc nhân đôi. Ví dụ xóa object S3: object đã không tồn tại coi như thành công; job dùng `jobId = bucket/objectKey` để tránh enqueue trùng. Đây là yêu cầu vì queue có thể retry sau khi worker crash.

## Reminder tránh tạo trùng thế nào?

Database có unique `(cardId, userId, remindAt)` và job dùng ID ổn định. Khi cancel, backend remove theo job ID theo cách idempotent. Nếu gửi email cần chống duplicate chặt hơn, worker cần lưu/claim trạng thái `SENDING`/`SENT` theo transaction trước khi gửi.

## Vì sao analytics cron theo UTC?

UTC cho mốc chạy nhất quán, không bị lệch khi đổi timezone hoặc daylight-saving. Nếu báo cáo theo timezone khách hàng, cần quy đổi rõ ở tầng hiển thị/rollup thay vì để scheduler chạy mơ hồ.

## Redis reset ảnh hưởng gì?

Job pending và schedule nằm trong Redis có thể mất. Khi backend/worker khởi động lại phải đăng ký lại repeatable jobs; các side effect cần idempotent để recovery an toàn. Dữ liệu nghiệp vụ chính vẫn ở PostgreSQL.
