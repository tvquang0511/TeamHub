# 04 — Database và Kanban ordering

## 1. Vì sao dùng PostgreSQL thay vì MongoDB?

TeamHub có quan hệ và ràng buộc rõ: membership có role, card có checklist/labels/assignees, dữ liệu cần transaction và report. PostgreSQL có foreign key, unique constraint, index, join và transaction mạnh. MongoDB vẫn làm được nhưng sẽ phải tự giữ nhiều tính nhất quán ở application hơn.

## 2. Quan hệ chính User–Workspace–Board–List–Card?

User và workspace là many-to-many qua `workspace_members`. Workspace có nhiều board; board có board members, lists, labels, messages và metrics. List có nhiều card; card có assignee, comment, label, checklist, attachment và reminder. Các khóa ngoại thể hiện ownership và giữ integrity.

## 3. Vì sao cần bảng `workspace_members` và `board_members`?

User tham gia workspace qua `workspace_members`; workspace có boards. Board có `board_members`, lists, labels, messages và metrics. List có cards; card có assignees, labels, comments, checklists, attachments và reminders. Bảng trung gian giữ được role, thời điểm tham gia và unique constraint.

## Vì sao dùng bảng membership thay vì mảng user ID?

Membership là quan hệ many-to-many có dữ liệu riêng: role, `createdAt`, ràng buộc unique và index query. Mô hình quan hệ giúp enforce quyền ở DB/query rõ hơn, dễ thay đổi role và mở rộng audit.

## 4. Vì sao có unique constraint `(workspaceId, userId)` và `(boardId, userId)`?

`(workspaceId, userId)` và `(boardId, userId)` ngăn một người bị thêm cùng membership nhiều lần, kể cả khi có hai request đồng thời. Đây là lớp bảo vệ cuối cùng ngoài kiểm tra ở application code.

## 5. Index `(listId, position)` hay `(boardId, position)` phục vụ query nào?

`(listId, position)` phục vụ lấy card của một list đã sắp thứ tự; `(boardId, position)` phục vụ lấy list của board. Composite index khớp cả điều kiện lọc lẫn sort nên giảm scan/sort cho màn board.

## 6. Khi nào index nhanh hơn, khi nào làm chậm ghi?

Index nhanh khi query thường xuyên filter/sort theo cột đó và selectivity hợp lý. Mỗi index là một cấu trúc phải cập nhật khi insert/update/delete, tốn disk và memory; quá nhiều index làm write chậm. Chỉ thêm sau khi xem query pattern/`EXPLAIN ANALYZE`.

## 7. `onDelete: Cascade` dùng ở đâu? Lợi ích và rủi ro?

Schema dùng cascade cho quan hệ cha-con như workspace → boards/members và board → lists/messages. Lợi ích là không còn record mồ côi. Rủi ro là hard-delete cha có thể xóa lượng lớn dữ liệu ngoài ý muốn; endpoint destructive phải có quyền chặt, xác nhận và khi cần dùng archive thay vì delete.

## 8. Soft delete khác hard delete thế nào?

Soft delete đặt `archivedAt`, giữ dữ liệu cho restore/audit nhưng mọi query phải lọc archived. Hard delete xóa thật, giải phóng dữ liệu và cascade children nhưng khó khôi phục. TeamHub dùng `archivedAt` cho board/list/card để hỗ trợ lifecycle Kanban.

## 9. Vì sao `position` là `Decimal(65,30)`?

Kéo thả card/list cần chèn giữa hai phần tử. Thay vì renumber cả list, backend lấy position giữa `prev` và `next`; ví dụ giữa 10 và 20 là 15. `Decimal` chính xác hơn floating point, nên tránh lỗi làm tròn trong thứ tự dữ liệu.

## 10. Vì sao không dùng số nguyên 1, 2, 3?

Chèn giữa 1 và 2 không có số nguyên nào; muốn thêm một card sẽ phải tăng position của hàng loạt card phía sau. Với fractional indexing, chèn giữa 1 và 2 có thể là 1.5 nên thường chỉ update card vừa di chuyển.

## 11. Khoảng cách position nhỏ dần thì xử lý thế nào?

Chèn nhiều lần vào cùng một khe làm khoảng cách nhỏ dần. Khi gần cạn độ chính xác, cần rebalance: sắp xếp lại list và gán position cách đều trong transaction. Đây là trade-off đổi lấy việc hầu hết drag chỉ update một record.

## 12. Move card từ list A sang B update gì?

Ít nhất cập nhật `cards.listId`, `cards.position` và `updatedAt`. Nghiệp vụ có thể ghi activity `CARD_MOVED`, bump board cache version, invalidate card detail nếu cần và phát realtime event. Không cần update toàn bộ card khác trừ khi đang rebalance.

## 13. Vì sao chat/comment index `(boardId, createdAt, id)`?

Màn chat thường lấy message của một board theo thời gian và phân trang cursor. `boardId` lọc board, `createdAt` sắp thứ tự, `id` là tie-breaker khi nhiều message cùng timestamp; index này cho pagination ổn định hơn offset trên bảng lớn.

## 14. Vài triệu card thì tối ưu board detail ra sao?

Không trả toàn bộ cards. Phân trang/lazy-load theo list, chỉ select field cần cho card preview, có index `(listId, position)`, cursor pagination và load detail khi mở card. Đo `EXPLAIN ANALYZE`, chống N+1 query, caching dữ liệu read-heavy; virtualize phía frontend.

## 15. Prisma có ưu nhược điểm gì so với SQL thuần?

Prisma cho type-safe query, schema/migration tập trung, relation API và tăng tốc development. Đổi lại nó có abstraction overhead, cần hiểu SQL/query plan để tránh query kém, và một số query/report phức tạp dễ rõ ràng hơn khi viết SQL parameterized. Prisma không thay thế kiến thức database.

## Bổ sung: Hai người move cùng card thì sao?

Database sẽ nhận các update theo thứ tự transaction; update sau có thể thắng nếu chưa có optimistic concurrency. Để UX tốt hơn, client gửi version/`updatedAt`, server từ chối khi stale hoặc áp dụng chính sách last-write-wins rõ ràng rồi broadcast trạng thái cuối.
