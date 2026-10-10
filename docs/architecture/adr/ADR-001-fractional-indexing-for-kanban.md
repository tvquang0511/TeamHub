# ADR-001: Sử Dụng Thuật Toán Fractional Indexing Cho Sắp Xếp Thẻ Kanban

* **Trạng thái:** Được chấp thuận (Accepted)
* **Ngày quyết định:** 2026-10
* **Người quyết định:** TeamHub Architecture Team

---

## 1. Bối cảnh (Context)
Trong một ứng dụng quản lý công việc Kanban, người dùng thường xuyên kéo thả (Drag & Drop) để sắp xếp lại thứ tự của các thẻ (Cards) trong một cột hoặc di chuyển thẻ giữa các cột khác nhau.

Nếu sử dụng phương pháp truyền thống đánh số thứ tự bằng số nguyên liên tiếp (`position = 1, 2, 3...`):
* Khi một thẻ bị chèn vào đầu hoặc giữa danh sách có 1.000 thẻ, hệ thống buộc phải cập nhật lại giá trị `position = position + 1` cho hàng trăm thẻ nằm phía sau.
* Thao tác này gây ra gánh nặng đĩa rất lớn ($O(N)$ write operations), tăng nguy cơ khóa hàng/khóa bảng (Row/Table Lock) và làm chậm cơ sở dữ liệu khi có nhiều người cùng thao tác đồng thời.

---

## 2. Quyết định (Decision)
Chúng tôi quyết định lưu trữ cột `position` dưới dạng **Số thập phân độ chính xác cao (`Decimal(65, 30)` trong PostgreSQL)** và sử dụng thuật toán **Fractional Indexing**:

Khi chèn một thẻ vào giữa 2 thẻ kề cận (`prev` và `next`), vị trí mới được tính bằng công thức trung bình cộng:
$$\text{position}_{\text{new}} = \frac{\text{position}_{\text{prev}} + \text{position}_{\text{next}}}{2}$$

Hàm tính toán được tách riêng thành utility `computeBetweenPosition` sử dụng thư viện `Prisma.Decimal` (Decimal.js) để tránh lỗi làm tròn dấu phẩy động của JavaScript.

---

## 3. Hệ quả (Consequences)

### Tích cực:
* **Tối ưu hóa hiệu năng vượt bậc:** Mỗi thao tác kéo thả thẻ chỉ phát sinh **đúng 1 câu lệnh `UPDATE` duy nhất ($O(1)$ complexity)** vào chính chiếc thẻ được di chuyển. Hoàn toàn không đụng tới các thẻ khác trong cột.
* **Không bị khóa bảng:** Loại bỏ nguy cơ Deadlock khi nhiều thành viên kéo thả thẻ trong cùng một cột cùng lúc.

### Đánh đổi (Negative / Trade-offs):
* Sau hàng chục nghìn lần kéo thả vào cùng một vị trí hẹp, khoảng cách giữa 2 thẻ có thể trở nên rất nhỏ. Trong tương lai cần thêm một tiến trình định kỳ Re-balancing để chia đều lại khoảng cách giữa các thẻ nếu cần.
