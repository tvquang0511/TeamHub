# 09 — Object storage và presigned URL

## Vì sao upload trực tiếp lên S3/MinIO?

API chỉ tạo presigned PUT URL; browser upload file trực tiếp storage. Nhờ đó file không đi qua backend, giảm băng thông, memory và thời gian giữ request của API. Backend vẫn kiểm soát quyền trước lúc cấp URL.

## Backend phải kiểm tra gì trước khi presign?

Xác thực user, kiểm tra membership/quyền với card/board, validate loại file và size theo policy, sinh object key không đoán được và giới hạn thời hạn URL. Không nhận bừa bucket hay object key từ client.

## Nếu upload thành công nhưng chưa lưu attachment DB?

Object trở thành orphan tạm thời. Client cần gọi endpoint commit metadata sau upload; worker `sweep_orphans` đối chiếu object storage với reference DB và xóa object không được liên kết sau khoảng an toàn. Vì cleanup có thể lag nên không xóa ngay.

## Vì sao xóa file qua queue?

Xóa storage là side effect có thể chậm/lỗi. Xóa record DB trước, enqueue `delete_object` với delay và retry, còn sweeper là lớp safety net. Xóa S3 kiểu NotFound được xem là thành công nên job idempotent.

## File có nên public không?

Với attachment nội bộ thì không. Bucket/private object và presigned GET URL ngắn hạn giúp server kiểm soát ai được download. Nếu public, phải chấp nhận URL có thể được chia sẻ tự do và không dùng cho dữ liệu nhạy cảm.
