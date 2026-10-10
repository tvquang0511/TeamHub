# 04 — Database và Kanban ordering

## Data model cốt lõi là gì?

User tham gia workspace qua `workspace_members`; workspace có boards. Board có `board_members`, lists, labels, messages và metrics. List có cards; card có assignees, labels, comments, checklists, attachments và reminders. Bảng trung gian giữ được role, thời điểm tham gia và unique constraint.

## Vì sao dùng bảng membership thay vì mảng user ID?

Membership là quan hệ many-to-many có dữ liệu riêng: role, `createdAt`, ràng buộc unique và index query. Mô hình quan hệ giúp enforce quyền ở DB/query rõ hơn, dễ thay đổi role và mở rộng audit.

## Vì sao có unique constraint?

`(workspaceId, userId)` và `(boardId, userId)` ngăn một người bị thêm cùng membership nhiều lần, kể cả khi có hai request đồng thời. Đây là lớp bảo vệ cuối cùng ngoài kiểm tra ở application code.

## Vì sao `position` là Decimal?

Kéo thả card/list cần chèn giữa hai phần tử. Thay vì renumber cả list, backend lấy position giữa `prev` và `next`; ví dụ giữa 10 và 20 là 15. `Decimal` chính xác hơn floating point, nên tránh lỗi làm tròn trong thứ tự dữ liệu.

## Trade-off của fractional indexing?

Chèn nhiều lần vào cùng một khe làm khoảng cách nhỏ dần. Khi gần cạn độ chính xác, cần rebalance: sắp xếp lại list và gán position cách đều trong transaction. Đây là trade-off đổi lấy việc hầu hết drag chỉ update một record.

## Index `(listId, position)` dùng cho gì?

Nó phục vụ query lấy cards trong một list theo thứ tự hiển thị. Tương tự `(boardId, position)` giúp lấy lists của board. Index phù hợp mẫu query phổ biến nhưng tăng chi phí insert/update, nên chỉ tạo cho đường truy vấn thực sự nóng.

## Soft delete và cascade khác nhau thế nào?

`archivedAt` giữ lịch sử và cho phép khôi phục/ẩn board-list-card. `onDelete: Cascade` xóa bản ghi con khi bản ghi cha bị xóa thật để tránh orphan rows. Cần chọn cẩn thận: soft delete cho nghiệp vụ cần audit, hard delete/cascade cho dữ liệu không còn cần giữ.

## Hai người move cùng card thì sao?

Database sẽ nhận các update theo thứ tự transaction; update sau có thể thắng nếu chưa có optimistic concurrency. Để UX tốt hơn, client gửi version/`updatedAt`, server từ chối khi stale hoặc áp dụng chính sách last-write-wins rõ ràng rồi broadcast trạng thái cuối.
