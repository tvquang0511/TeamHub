# ADR-004: Tách Biệt Tiến Trình Worker Độc Lập Cho Tác Vụ Bất Đồng Bộ

* **Trạng thái:** Được chấp thuận (Accepted)
* **Ngày quyết định:** 2026-10
* **Người quyết định:** TeamHub Architecture Team

---

## 1. Bối cảnh (Context)
Hệ thống có nhiều tác vụ tiêu tốn nhiều thời gian và tài nguyên:
* Gửi Email khôi phục mật khẩu và xác thực qua giao thức SMTP (mất từ 1 đến 4 giây).
* Lên lịch thông báo nhắc hẹn công việc (Delayed Reminders) chính xác theo thời gian tương lai.
* Xóa tệp tin trên MinIO/S3 với độ trễ an toàn 60 giây.
* Tổng hợp số liệu phân tích và biểu đồ Agile (Daily Metrics Rollup) vào ban đêm.

Nếu xử lý đồng bộ trực tiếp trong các route của Backend API:
* Người dùng phải chờ đợi lâu khi gọi API.
* Nếu máy chủ SMTP hoặc S3 bị chập chờn, lỗi mạng sẽ làm chết request và báo lỗi 500 cho người dùng.
* Tác vụ tổng hợp dữ liệu nặng về CPU sẽ làm chậm các truy vấn đọc/ghi Kanban của người dùng khác.

---

## 2. Quyết định (Decision)
Chúng tôi quyết định áp dụng mô hình **Producer-Consumer Phân Tách Hoàn Toàn** sử dụng **BullMQ chạy trên nền Redis**:

1. **Backend API (Producer):** Chỉ làm nhiệm vụ đẩy Job vào hàng đợi Redis (`notifications` và `background_tasks`) rồi trả về kết quả cho người dùng ngay lập tức (< 50ms).
2. **Worker Service (Consumer):** Một tiến trình Node.js hoàn toàn độc lập (`worker/src/main.ts`), chạy riêng biệt với API Server, chuyên lấy job ra để thực thi ngầm.
3. Thiết lập cơ chế thử lại tự động (**Exponential Backoff** với tối đa 3–10 lần thử lại) và gán `jobId` tường minh để đảm bảo tính **Idempotent**.
4. Cấu hình tối ưu chi phí Cloud (`stalledInterval: 300000`, `drainDelay: 15s`) để không làm cạn kiệt hạn ngạch lệnh Redis khi nhàn rỗi.

---

## 3. Hệ quả (Consequences)

### Tích cực:
* **Khả năng mở rộng độc lập (Independent Scalability):** Nếu lượng gửi email hoặc tác vụ dọn dẹp tăng vọt, chúng tôi có thể scale thêm 5 container Worker mà không cần chạm vào API Server.
* **Độ tin cậy cao (Fault Tolerance):** Nếu máy chủ SMTP chết tạm thời, các job sẽ tự động xếp hàng và thử lại sau; API chính không bao giờ bị ảnh hưởng.
* **Phản hồi người dùng tức thì:** Thời gian phản hồi của các thao tác như Quên mật khẩu, Lưu hạn thẻ giảm xuống mức tính bằng mili-giây.

### Đánh đổi (Trade-offs):
* Tăng độ phức tạp trong vận hành hạ tầng (phải quản lý và giám sát thêm một tiến trình Worker và cụm Redis).
