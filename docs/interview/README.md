# Interview Prep (Software Developer Intern)

Mục tiêu của bộ tài liệu này: giúp bạn **trả lời chắc** trong buổi phỏng vấn theo đúng JD nhấn mạnh **AI / vibe coding**, và đi sâu vào project chính **TeamHub**.

## Cách dùng nhanh (30–60 phút trước phỏng vấn)
1. Đọc [qa/ai-vibe-coding-questions.md](qa/ai-vibe-coding-questions.md) để “đóng khung” cách bạn dùng AI xuyên SDLC nhưng vẫn hiểu code.
2. Đọc [teamhub/00-overview.md](teamhub/00-overview.md) để kể câu chuyện hệ thống end-to-end.
3. Chọn 3 mảng bạn tự tin nhất (gợi ý: **Redis + BullMQ**, **MinIO presign**, **Realtime Socket.IO**) và đọc các file tương ứng.

## Q&A theo JD
- AI (across SDLC) + vibe coding: [qa/ai-vibe-coding-questions.md](qa/ai-vibe-coding-questions.md)
- Câu hỏi intern/web fundamentals: [qa/general-intern-questions.md](qa/general-intern-questions.md)

## TeamHub deep-dive
- Tổng quan kiến trúc + flow: [teamhub/00-overview.md](teamhub/00-overview.md)

### Frontend
- React (hooks + cách bạn dùng): [teamhub/01-frontend-react.md](teamhub/01-frontend-react.md)
- UI (Tailwind + shadcn/ui) (ngắn): [teamhub/02-frontend-ui-tailwind-shadcn.md](teamhub/02-frontend-ui-tailwind-shadcn.md)
- TanStack Query (data-fetching + optimistic update): [teamhub/03-frontend-tanstack-query.md](teamhub/03-frontend-tanstack-query.md)
- React DnD (drag & drop + move algorithm): [teamhub/04-frontend-react-dnd.md](teamhub/04-frontend-react-dnd.md)
- Realtime Socket.IO (client + server): [teamhub/05-realtime-socketio.md](teamhub/05-realtime-socketio.md)

### Backend / Infra
- Express architecture + middleware: [teamhub/06-backend-express-architecture.md](teamhub/06-backend-express-architecture.md)
- Auth JWT (access/refresh rotation + reset password): [teamhub/07-auth-jwt.md](teamhub/07-auth-jwt.md)
- Postgres + Prisma (schema + adapter-pg): [teamhub/08-db-prisma-postgres.md](teamhub/08-db-prisma-postgres.md)
- Redis (cache + rate limit): [teamhub/09-redis-cache-rate-limit.md](teamhub/09-redis-cache-rate-limit.md)
- BullMQ (queues + worker + cron/delay/idempotency): [teamhub/10-bullmq-queues-worker.md](teamhub/10-bullmq-queues-worker.md)
- MinIO blob + presigned URL: [teamhub/11-minio-presign-blob-storage.md](teamhub/11-minio-presign-blob-storage.md)
- Docker Compose + Nginx reverse proxy: [teamhub/12-docker-nginx.md](teamhub/12-docker-nginx.md)
