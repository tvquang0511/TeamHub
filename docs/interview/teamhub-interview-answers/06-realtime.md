# 06 — Realtime với Socket.IO

## 1. Vì sao dùng Socket.IO thay vì polling API?

Polling tạo request lặp lại và độ trễ phụ thuộc interval. Socket.IO giữ kết nối hai chiều, phù hợp chat và cập nhật Kanban. Nó cũng cung cấp fallback transport, room, acknowledgement và reconnect tiện hơn WebSocket thuần.

## 3. Luồng kết nối Socket.IO trong dự án diễn ra ra sao?

Client gửi JWT ở `handshake.auth.token` hoặc Authorization header. Middleware verify bằng `JWT_ACCESS_SECRET`, lưu user vào `socket.data`, rồi socket join room cá nhân `user:{userId}`. Khi join board, server gọi service để kiểm tra quyền rồi mới `join(board:{boardId})`.

## 7. Khi user gửi chat message, luồng từ socket đến database rồi broadcast hoạt động thế nào?

Event gửi `boardId`, content và attachment IDs. Server gọi `chatService.createMessage`, service kiểm tra quyền và lưu DB. Thành công thì server broadcast `chat:message:new` đến room board và trả acknowledgement cho sender.

## 9. Ack trong Socket.IO có tác dụng gì?

Ack cho sender biết event thành công hay lỗi có cấu trúc ngay sau khi server xử lý. Nhờ đó UI có thể chuyển message từ pending sang sent hoặc hiển thị lỗi/retry, thay vì chỉ đoán qua broadcast.

## 10. Xử lý reconnect thế nào để client không mất đồng bộ?

Sau reconnect client cần xác thực lại, join lại các board đang mở và refetch dữ liệu gần nhất hoặc từ cursor cuối. Không nên chỉ tin các event có thể đã bỏ lỡ trong thời gian mất kết nối.

## 11. Nếu có nhiều instance API server, socket room hiện tại gặp vấn đề gì?

Room trong memory của instance A không tự biết client ở instance B. Cần Socket.IO Redis adapter/pub-sub để fan-out event qua các instance; load balancer cũng phải hỗ trợ WebSocket và có sticky session khi kiến trúc/transport yêu cầu.

## 14. Nếu event bị gửi trùng hoặc đến sai thứ tự, client xử lý thế nào?

Event nên có ID/timestamp/version khi cần. Client xử lý idempotent theo entity ID, bỏ event cũ hơn phiên bản hiện tại; nếu phát hiện lệch nhiều thì refetch từ REST. Database vẫn quyết định state cuối cùng.

## 2. WebSocket thuần khác Socket.IO như thế nào?

WebSocket là protocol kết nối hai chiều mức thấp. Socket.IO là thư viện/protocol riêng, thêm event có tên, room, acknowledgement, reconnect và fallback transport. Vì protocol khác nhau, Socket.IO client không nói chuyện trực tiếp với một WebSocket server thuần.

## 4. JWT được gửi và kiểm tra khi socket handshake thế nào?

Client gửi access token qua `handshake.auth.token` hoặc Authorization Bearer header. Middleware gọi `jwt.verify` với access secret, lưu user hợp lệ vào `socket.data`; token thiếu, sai hoặc hết hạn bị từ chối trước khi handler event chạy.

## 5. Vì sao không tin `boardId` client gửi khi join room?

`boardId` chỉ là yêu cầu vào room, không phải bằng chứng về quyền. Server phải kiểm tra workspace/board membership qua service trước khi gọi `socket.join`; nếu không, user đoán ID có thể nghe event của board private.

## 6. Room `board:{boardId}` dùng để làm gì?

Room nhóm các socket đang xem cùng board. Server emit một event chat/card/list vào room để chỉ thành viên đang mở board nhận được, thay vì broadcast toàn hệ thống. Room chỉ định tuyến event, không thay thế authorization.

## 8. Vì sao event realtime vẫn phải kiểm tra authorization ở backend?

Client có thể tự emit event bằng DevTools hoặc script, không qua UI. JWT chỉ xác định danh tính, còn service phải xác minh user có quyền trên board/message đang tác động. Mọi command socket cần enforce quyền giống REST.

## 12. Cần bổ sung gì để scale Socket.IO ngang?

Dùng Socket.IO Redis adapter hoặc pub/sub tương đương để fan-out event xuyên instance. Load balancer cần hỗ trợ WebSocket và sticky session khi transport yêu cầu. Cần theo dõi connection count, backpressure, event rate và graceful shutdown.

## 13. Làm sao tránh gửi event cho người không có quyền xem board?

Chỉ cho join room sau authorization, chỉ emit tới room đó, và remove/disconnect socket khi membership bị thu hồi. REST fetch cũng vẫn kiểm tra quyền. Không broadcast dữ liệu nhạy cảm rồi để client tự lọc.

## 15. REST API và Socket.IO nên phân vai thế nào?

REST phù hợp query/command có response rõ như load board, pagination, create/update resource. Socket.IO phù hợp push thay đổi, chat và presence. Một REST mutation có thể ghi DB rồi emit Socket.IO; socket không nên là nguồn duy nhất của dữ liệu bền vững.
