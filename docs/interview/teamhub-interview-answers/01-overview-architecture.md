# 01 — Tổng quan và kiến trúc

## TeamHub giải quyết vấn đề gì?

TeamHub là ứng dụng quản lý công việc nhóm theo Kanban: workspace chứa board, board có list và card. Người dùng có thể giao việc, gắn nhãn, bình luận, đính kèm file, chat theo board và nhận nhắc hạn. Mục tiêu là gom luồng làm việc của một nhóm nhỏ vào một nơi, đồng thời cập nhật thay đổi gần thời gian thực.

## Kiến trúc tổng quan như thế nào?

- Frontend: React 19, Vite, TypeScript, Tailwind và TanStack Query.
- API: Express + TypeScript, Prisma và PostgreSQL; Socket.IO chạy cùng HTTP server.
- Hạ tầng phụ trợ: Redis cho cache và BullMQ; MinIO/S3 cho file.
- Worker: tiến trình Node độc lập nhận job email, reminder, analytics và cleanup blob.
- Nginx/Docker Compose phục vụ môi trường local theo một origin.

## Đây có phải microservices không?

Chính xác hơn đây là **modular monolith**: các domain như auth, boards, cards, chat là module trong cùng backend API và dùng chung PostgreSQL. Worker được tách process để chạy tác vụ nền. Cách này đơn giản hơn microservices thật, dễ deploy và debug cho quy mô đồ án; khi cần scale độc lập có thể tách các domain nóng sau.

## Luồng tạo một card mới?

Frontend gọi REST API với access token. Router/controller validate input, service xác nhận người dùng thuộc workspace và là board member có quyền ghi, repository ghi card vào PostgreSQL. Service ghi activity, invalidate/bump cache phù hợp và phát event realtime cho board. Frontend người khác nhận event rồi cập nhật UI/cache.

## Vì sao chọn PostgreSQL thay vì MongoDB?

Nghiệp vụ có nhiều quan hệ và ràng buộc: user–workspace–board–card, membership, role, checklist, attachment. PostgreSQL giúp dùng foreign key, unique constraint, transaction và index rõ ràng. Dữ liệu Kanban cũng cần thứ tự, báo cáo và query quan hệ; relational database phù hợp hơn.

## Điểm kỹ thuật đáng kể nhất?

Ba điểm là realtime có kiểm soát quyền bằng Socket.IO room, drag-and-drop với `Decimal position` để tránh đánh số lại toàn bộ list, và pipeline file direct upload S3 kèm worker dọn orphan blob. Các phần này giải quyết trực tiếp tính tương tác, hiệu năng ghi và vận hành storage.

## Nếu phát triển tiếp, ưu tiên gì?

Ưu tiên observability (structured logs, metrics, alert), test end-to-end và tải, rate limit hoàn chỉnh, Socket.IO Redis adapter khi chạy nhiều API instance, và phân trang/virtualization cho board lớn. Đây là cải tiến theo rủi ro vận hành trước, không vội tách microservice.
