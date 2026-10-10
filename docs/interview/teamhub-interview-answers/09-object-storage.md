# 09 — Object storage và presigned URL

## 1. Vì sao upload file trực tiếp từ browser lên S3/MinIO thay vì đi qua API?

API chỉ tạo presigned PUT URL; browser upload file trực tiếp storage. Nhờ đó file không đi qua backend, giảm băng thông, memory và thời gian giữ request của API. Backend vẫn kiểm soát quyền trước lúc cấp URL.

## Backend phải kiểm tra gì trước khi presign?

Xác thực user, kiểm tra membership/quyền với card/board, validate loại file và size theo policy, sinh object key không đoán được và giới hạn thời hạn URL. Không nhận bừa bucket hay object key từ client.

## Nếu upload thành công nhưng chưa lưu attachment DB?

Object trở thành orphan tạm thời. Client cần gọi endpoint commit metadata sau upload; worker `sweep_orphans` đối chiếu object storage với reference DB và xóa object không được liên kết sau khoảng an toàn. Vì cleanup có thể lag nên không xóa ngay.

## Vì sao xóa file qua queue?

Xóa storage là side effect có thể chậm/lỗi. Xóa record DB trước, enqueue `delete_object` với delay và retry, còn sweeper là lớp safety net. Xóa S3 kiểu NotFound được xem là thành công nên job idempotent.

## 8. Object storage có nên public không?

Với attachment nội bộ thì không. Bucket/private object và presigned GET URL ngắn hạn giúp server kiểm soát ai được download. Nếu public, phải chấp nhận URL có thể được chia sẻ tự do và không dùng cho dữ liệu nhạy cảm.

## 2. Presigned URL là gì?

Đó là URL có chữ ký do backend tạo, cho phép client thực hiện đúng một action như `PUT` hoặc `GET` lên một object trong thời gian giới hạn mà không biết access key S3. Chữ ký ràng buộc bucket, object key, method, expiry và có thể kèm điều kiện header/content type.

## 3. Backend cần kiểm tra gì trước khi tạo presigned upload URL?

Backend xác thực user, kiểm tra workspace/board/card membership, validate MIME type và file size theo policy, tự sinh object key và bucket được phép. Client không được tự chọn key/bucket tùy ý. Có thể tạo record upload pending để theo dõi commit và cleanup.

## 4. Presigned URL nên hết hạn sau bao lâu?

Chỉ đủ lâu cho upload thực tế, thường vài phút cho file thông thường; file lớn hoặc mạng yếu cần thời gian dài hơn nhưng không nên cấp hàng giờ không cần thiết. Expiry càng ngắn càng giảm cửa sổ bị lộ; upload lớn nên dùng multipart/resumable thay vì chỉ kéo dài URL vô hạn.

## 5. Làm sao giới hạn MIME type và file size?

Backend có allowlist MIME/size trước khi ký URL và kiểm tra lại metadata lúc commit. Nếu storage hỗ trợ policy/conditions thì ràng buộc `Content-Type` và `content-length-range` trong presign. Client-side validation chỉ cải thiện UX, không phải security; file nhạy cảm có thể cần malware scan async.

## 6. Upload thành công nhưng API chưa lưu attachment vào DB thì sao?

Object là orphan tạm thời. Client gọi endpoint commit metadata sau upload; nếu commit thất bại thì retry có kiểm soát. Blob sweeper đối chiếu object với reference DB và xóa object không được link sau grace period, tránh rác storage mà không xóa nhầm upload đang hoàn tất.

## 7. Vì sao cần blob sweeper?

Không thể đảm bảo tuyệt đối upload, database commit và delete queue luôn hoàn tất cùng lúc. Sweeper là reconciliation định kỳ, tìm object bị bỏ lại do client crash, network lỗi hoặc job delete thất bại. Nó là safety net, không thay validation hay delete job thông thường.

## 9. Cách bảo vệ file private khi download?

User gọi backend hoặc endpoint download; backend kiểm tra quyền với resource chứa file rồi cấp presigned GET ngắn hạn, có thể set `Content-Disposition`. Bucket giữ private, object key khó đoán chỉ là lớp phụ. Không để URL download dài hạn trong response/cache công khai.

## 10. Ngăn upload vào object key của người khác thế nào?

Backend tự sinh key theo namespace/resource và chỉ ký đúng key đó sau authorization. Không có API nhận raw bucket/key tùy ý từ client. Bucket policy/IAM cũng giới hạn credential server vào prefix/bucket cần thiết; client chỉ cầm URL ký hạn ngắn cho một object/action.
