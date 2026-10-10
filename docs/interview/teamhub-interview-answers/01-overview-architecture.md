# 01 — Tổng quan đồ án

## 1. TeamHub giải quyết vấn đề gì? Đối tượng người dùng là ai?

TeamHub là công cụ quản lý công việc nhóm theo Kanban. Một nhóm tạo workspace, trong đó có nhiều board, mỗi board có list và card. Card có người phụ trách, hạn, label, checklist, bình luận, file đính kèm và lịch sử hoạt động. Người dùng mục tiêu là nhóm học tập, nhóm làm đồ án và nhóm phát triển nhỏ cần theo dõi công việc ở một nơi.

## 2. Vì sao chọn Kanban thay vì chỉ làm todo-list?

Todo-list thường chỉ là danh sách cá nhân. Kanban biểu diễn luồng công việc theo các cột như To do, Doing, Done; nhờ đó cả nhóm nhìn thấy trạng thái, WIP và điểm nghẽn. Kanban cũng tự nhiên hơn cho các tính năng kéo thả, phân quyền board, activity log, analytics và realtime collaboration.

## 3. Kiến trúc tổng quan gồm những service/layer nào?

Frontend dùng React/Vite/TypeScript, giao tiếp với Express REST API và Socket.IO. Backend tổ chức theo router → controller → service → repository/Prisma. PostgreSQL là nguồn dữ liệu chính; Redis dùng cho cache, rate limit và BullMQ. Worker Node tách tiến trình xử lý email, reminder, analytics và blob cleanup. File đi vào S3-compatible storage như MinIO qua presigned URL. Nginx/Docker Compose hỗ trợ chạy local cùng origin.

## 4. Luồng dữ liệu khi người dùng tạo card mới là gì?

Frontend gửi request kèm access token. Router/controller parse và validate body; service lấy `userId` từ JWT, kiểm tra workspace/board membership và quyền ghi; repository tạo card trong PostgreSQL với position phù hợp. Sau đó service ghi activity, xóa cache card hoặc bump board cache version và phát event realtime cho room board. Các client đang mở board nhận event, cập nhật cache/UI; API response vẫn là kết quả xác nhận chính thức cho client tạo card.

## 5. Bạn tự làm những phần nào? Phần nào khó nhất?

Một câu trả lời trung thực có thể là: “Em thiết kế và triển khai frontend React, REST API Express/Prisma, database schema, auth JWT, realtime chat/board, Redis cache, worker BullMQ và MinIO ở mức đồ án. Phần khó nhất là các luồng có nhiều hệ thống cùng tham gia: kéo thả realtime, invalidate cache đúng, và upload direct-to-storage nhưng vẫn không tạo file rác. Em giải bằng cách giữ PostgreSQL là source of truth, mọi quyền kiểm tra ở backend, còn Redis/Socket/worker chỉ là các lớp hỗ trợ.” Chỉ giữ các phần bạn thực sự đã làm khi trả lời.

## 6. Nếu chỉ có 2 phút giới thiệu sản phẩm, bạn nói gì?

“TeamHub là web app quản lý công việc nhóm theo Kanban, giống một phiên bản Trello tập trung vào teamwork realtime. Người dùng quản lý workspace, board, list và card; card có assignee, checklist, comment, label, due date và attachment. Về kỹ thuật, frontend là React + TypeScript, backend là Express + Prisma/PostgreSQL. Socket.IO cập nhật chat và board gần realtime; Redis dùng cache và BullMQ, còn worker tách riêng xử lý email reminder, analytics và dọn file rác S3. Em quan tâm nhất đến tính đúng đắn: backend luôn kiểm tra membership, database giữ constraint, cache có TTL/version invalidation và task nền có retry.”

## 7. Dự án khác Trello/Jira ở mức kỹ thuật thế nào?

TeamHub không cạnh tranh độ đầy đủ tính năng với sản phẩm thương mại. Điểm nhấn kỹ thuật là tự xây dựng end-to-end các vấn đề thường gặp: realtime board chat, fractional indexing cho drag-and-drop, direct S3 upload qua presigned URL, queue/worker cho side effect, role-based authorization và versioned Redis cache. Jira/Trello production có quy mô, observability, SLA và ecosystem lớn hơn nhiều.

## 8. Vì sao chọn React + Vite, Express + TypeScript, PostgreSQL và Prisma?

React phù hợp UI nhiều component và state; Vite cho dev server/build nhanh. Express tối giản, dễ tổ chức API và Socket.IO cùng Node process. TypeScript giảm lỗi contract ở cả hai phía. PostgreSQL phù hợp dữ liệu quan hệ và transaction; Prisma tạo type-safe client, migration/schema tập trung và giảm boilerplate query. Trade-off là Prisma có abstraction cost và Express cần tự chọn convention/middleware.

## 9. Đây là microservices hay modular monolith?

Đây là **modular monolith cho API cộng với worker tách process**, chưa phải microservices hoàn chỉnh. Các module auth, boards, cards, chat vẫn deploy trong một backend service và dùng chung PostgreSQL. Cách này phù hợp đồ án vì đơn giản hơn cho deploy, transaction và debug. Worker tách riêng vì workload nền có lifecycle/scale khác request HTTP.

## 10. Nếu triển khai thật, bạn ưu tiên cải tiến gì?

Ưu tiên observability trước: structured log, metrics, tracing, alert cho API/DB/Redis/queue. Tiếp theo là test E2E, load test, rate limit hoàn chỉnh, backup/restore drill và CI/CD. Khi scale ngang realtime, thêm Socket.IO Redis adapter; khi board rất lớn, thêm pagination/virtualization. Em không vội tách microservice vì chưa có metric chứng minh đó là bottleneck.
