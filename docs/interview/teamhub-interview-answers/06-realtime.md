# 06 — Realtime với Socket.IO

## Vì sao Socket.IO thay vì polling?

Polling tạo request lặp lại và độ trễ phụ thuộc interval. Socket.IO giữ kết nối hai chiều, phù hợp chat và cập nhật Kanban. Nó cũng cung cấp fallback transport, room, acknowledgement và reconnect tiện hơn WebSocket thuần.

## Luồng kết nối trong TeamHub?

Client gửi JWT ở `handshake.auth.token` hoặc Authorization header. Middleware verify bằng `JWT_ACCESS_SECRET`, lưu user vào `socket.data`, rồi socket join room cá nhân `user:{userId}`. Khi join board, server gọi service để kiểm tra quyền rồi mới `join(board:{boardId})`.

## Khi gửi chat message, điều gì xảy ra?

Event gửi `boardId`, content và attachment IDs. Server gọi `chatService.createMessage`, service kiểm tra quyền và lưu DB. Thành công thì server broadcast `chat:message:new` đến room board và trả acknowledgement cho sender.

## Ack dùng để làm gì?

Ack cho sender biết event thành công hay lỗi có cấu trúc ngay sau khi server xử lý. Nhờ đó UI có thể chuyển message từ pending sang sent hoặc hiển thị lỗi/retry, thay vì chỉ đoán qua broadcast.

## Reconnect xử lý thế nào?

Sau reconnect client cần xác thực lại, join lại các board đang mở và refetch dữ liệu gần nhất hoặc từ cursor cuối. Không nên chỉ tin các event có thể đã bỏ lỡ trong thời gian mất kết nối.

## Nhiều API instances thì vấn đề gì?

Room trong memory của instance A không tự biết client ở instance B. Cần Socket.IO Redis adapter/pub-sub để fan-out event qua các instance; load balancer cũng phải hỗ trợ WebSocket và có sticky session khi kiến trúc/transport yêu cầu.

## Event đến trùng hoặc sai thứ tự thì sao?

Event nên có ID/timestamp/version khi cần. Client xử lý idempotent theo entity ID, bỏ event cũ hơn phiên bản hiện tại; nếu phát hiện lệch nhiều thì refetch từ REST. Database vẫn quyết định state cuối cùng.
