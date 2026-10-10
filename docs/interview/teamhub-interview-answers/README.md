# TeamHub — Bộ trả lời phỏng vấn intern

Các câu trả lời dưới đây bám theo code và tài liệu hiện có của TeamHub. Mỗi câu nên nói theo nhịp: **vấn đề → quyết định → cách làm → trade-off**. Không cần học thuộc từng chữ.

## Lộ trình ôn nhanh

1. [Tổng quan và kiến trúc](./01-overview-architecture.md)
2. [Frontend](./02-frontend.md)
3. [Backend và API](./03-backend-api.md)
4. [Database và Kanban ordering](./04-database-kanban.md)
5. [Auth, phân quyền và bảo mật](./05-auth-security.md)
6. [Realtime Socket.IO](./06-realtime.md)
7. [Redis cache](./07-redis-cache.md)
8. [BullMQ và worker](./08-queues-worker.md)
9. [Object storage](./09-object-storage.md)
10. [AI breakdown](./10-ai.md)
11. [Tình huống production](./11-scenarios.md)

## Lưu ý khi trả lời

- Nói rõ đây là **modular monolith API + worker tách tiến trình**, không gọi quá là microservices hoàn chỉnh.
- Phân biệt phần đã làm với phần định hướng scale tiếp theo.
- Khi không chắc chi tiết, quay về invariant: backend kiểm tra quyền, DB giữ ràng buộc, Redis/queue là hạ tầng hỗ trợ chứ không thay thế dữ liệu chính.
