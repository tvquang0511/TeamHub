# ADR-003: Sử Dụng Presigned URLs Cho Tải Tệp Trực Tiếp Lên Object Storage

* **Trạng thái:** Được chấp thuận (Accepted)
* **Ngày quyết định:** 2026-10
* **Người quyết định:** TeamHub Architecture Team

---

## 1. Bối cảnh (Context)
Trong TeamHub, người dùng thường xuyên tải lên các tệp đính kèm thẻ, ảnh nền Workspace, ảnh đại diện và file trao đổi trong phòng Chat.

Nếu cho phép người dùng tải tệp trực tiếp lên máy chủ Backend Node.js (thông qua `multipart/form-data` hoặc `multer`):
* Băng thông mạng bị nhân đôi (Client $\rightarrow$ Backend, rồi Backend $\rightarrow$ Storage).
* Bộ nhớ RAM của Node.js bị chiếm dụng để lưu trữ buffer tệp tin, gây nghẽn Event Loop và ảnh hưởng xấu đến các API nghiệp vụ khác.
* Nguy cơ bị tấn công cạn kiệt tài nguyên (Denial of Service - DoS) thông qua các tệp tin dung lượng lớn.

---

## 2. Quyết định (Decision)
Chúng tôi quyết định áp dụng mô hình **Direct-to-Storage Upload thông qua Presigned PUT URLs**:

1. Client gửi thông tin tệp (`fileName`, `fileSize`, `contentType`) lên Backend API.
2. Backend API xác thực quyền hạn và ký một đường link **Presigned PUT URL** với hạn dùng ngắn (300 giây) bằng thuật toán chữ ký số **AWS Signature Version 4 (SigV4)** tự viết qua module `crypto` nguyên bản của Node.js.
3. Client sử dụng URL có chữ ký này để gửi trực tiếp tệp tin nhị phân lên cụm MinIO/S3 Storage.
4. Sau khi tải lên thành công, Client gọi endpoint `/commit` để Backend lưu lại metadata vào PostgreSQL.
5. Triển khai tiến trình **Janitor Sweeper** ngầm để tự động quét dọn các tệp tin mồ côi (tải lên S3 nhưng không gọi commit).

---

## 3. Hệ quả (Consequences)

### Tích cực:
* **Tải trọng máy chủ Backend gần như bằng 0:** Node.js không cần xử lý luồng nhị phân của tệp tin.
* **Tốc độ truyền tải nhanh nhất:** Tận dụng tối đa băng thông đa luồng giữa Client và máy chủ lưu trữ chuyên dụng.
* **Không phụ thuộc vào thư viện nặng:** Thuật toán SigV4 được tự viết bằng module `crypto`, giúp giảm dung lượng `node_modules` hàng chục MB so với việc cài đặt full `@aws-sdk/client-s3`.

### Đánh đổi (Trade-offs):
* Luồng xử lý phía Client phức tạp hơn (phải gọi 2 bước: `init` $\rightarrow$ upload $\rightarrow$ `commit`).
* Cần bổ sung thêm tiến trình dọn dẹp file mồ côi (Sweeper Cron).
