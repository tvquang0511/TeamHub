# ADR-002: Sử Dụng Kỹ Thuật Version-Stamp Để Hủy Bỏ Bộ Nhớ Đệm (Cache Invalidation)

* **Trạng thái:** Được chấp thuận (Accepted)
* **Ngày quyết định:** 2026-10
* **Người quyết định:** TeamHub Architecture Team

---

## 1. Bối cảnh (Context)
Màn hình xem chi tiết Board (`GET /boards/:id/detail`) chứa lượng dữ liệu lớn gồm: Board, Lists, Cards, Members và Labels. Đây là endpoint được gọi nhiều nhất và tốn tài nguyên nhất hệ thống.

Để giảm tải Database, chúng tôi lưu trữ toàn bộ payload này vào Redis Cache. Tuy nhiên, vấn đề nan giải xuất hiện:
* Khi bất kỳ thành viên nào tạo thẻ mới, đổi tên cột, gán nhãn, di chuyển thẻ... dữ liệu cache cũ sẽ bị sai lệch (Stale Data).
* Nếu dùng lệnh quét pattern `KEYS cache:v1:board:123:*` hoặc `SCAN` để xóa các key liên quan, Redis (vốn là single-threaded) sẽ bị nghẽn luồng xử lý và đứng toàn bộ hệ thống khi số lượng key lớn.

---

## 2. Quyết định (Decision)
Chúng tôi quyết định áp dụng kỹ thuật **Version-Stamp (Bump Version Invalidation)**:

1. Duy trì một key lưu số nguyên version độc lập trong Redis cho mỗi Board:
   $$\text{Version Key: } \text{cache:v1:board:\{boardId\}:ver}$$
2. Key lưu trữ dữ liệu thực tế sẽ gắn kèm số version này:
   $$\text{Data Key: } \text{cache:v1:board:\{boardId\}:detail:ver:\{n\}}$$
3. Mỗi khi có thao tác ghi (Mutation), Backend chỉ cần tăng version lên 1 đơn vị bằng lệnh nguyên tử:
   ```typescript
   await redis.incr(`cache:v1:board:${boardId}:ver`);
   ```
4. Request đọc tiếp theo sẽ tự động nhận diện version mới, miss cache và nạp dữ liệu mới nhất từ PostgreSQL vào key version mới.
5. Cache chung tuyệt đối không lưu đối tượng quyền hạn `actor` để tránh rò rỉ phân quyền giữa các user.

---

## 3. Hệ quả (Consequences)

### Tích cực:
* **Hủy cache tức thì trong $O(1)$:** Hàm `bumpBoardCacheVersion` chỉ tốn 0.2ms để thực hiện 1 lệnh `INCR`.
* **Không cần dọn dẹp rác thủ công:** Dữ liệu thuộc version cũ tự động bị bỏ qua và sẽ biến mất theo cơ chế `TTL` (120s) mà không cần quét xóa.
* **Không có Stale Read:** Tuyệt đối không bao giờ trả về dữ liệu cũ cho người dùng.

### Đánh đổi (Trade-offs):
* Tiêu tốn thêm một lượng nhỏ RAM trong thời gian ngắn (120s) để lưu trữ key của version cũ trước khi nó tự hết hạn.
