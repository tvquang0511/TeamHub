# Backend — Node.js (Express) Architecture trong TeamHub

## 1) Entry points
- `src/app.ts`: tạo Express app, middleware, swagger, routes, error handler.
- `src/server.ts`: tạo HTTP server, gắn Socket.IO, start listen, schedule một số repeatable jobs.

**Điểm hay để nói:** backend cần HTTP server riêng vì Socket.IO dùng chung server.

---

## 2) Middleware stack (app.ts)
- `trust proxy`: để `req.ip` đúng khi chạy sau Nginx.
- `cors`: set origin; khi đi qua Nginx same-origin thì đơn giản hơn.
- `helmet`: security headers.
- `morgan`: access log.
- `express.json` + `urlencoded`.
- Swagger/OpenAPI:
  - `/openapi.json`
  - `/api-docs`
- Healthcheck: `/health`
- API mount: `/api`
- 404 handler
- `errorHandler` (Zod + ApiError + Prisma errors)

---

## 3) Module structure (router → controller → service → repo)
TeamHub chia theo feature/module:
- `modules/auth`, `modules/workspaces`, `modules/boards`, `modules/lists`, `modules/cards`, ...

Pattern điển hình:
- `*.router.ts`: khai báo routes + middleware (authJwt, rateLimit)
- `*.controller.ts`: lấy params/body, parse với Zod, gọi service
- `*.service.ts`: business logic + authz checks + side effects (queue/cache)
- `*.repo.ts`: truy vấn DB (Prisma)

Lợi ích:
- Dễ test / dễ maintain / rõ boundary.

---

## 4) Validation + error shape
- Request body/query parse bằng Zod.
- Lỗi trả về format thống nhất:
```json
{ "error": { "code": "...", "message": "...", "details": {} } }
```
- Xử lý đặc biệt:
  - Zod → 400 `VALIDATION_ERROR`
  - Prisma unique violation (P2002) → 409 `CONFLICT`

---

## 5) Security basics trong backend
- JWT middleware (`authJwt`) gắn `req.user`.
- Authz theo workspace membership + board membership/role.
- Rate limit bằng Redis (fail-open).

---

## 6) Tích hợp background jobs
Backend **enqueue/schedule**, worker **process**.
- `server.ts` gọi `ensureBoardMetricsDailyJob()` và `ensureBlobSweeperJob()` khi startup.

---

## 7) Câu hỏi phỏng vấn hay gặp
1) *Vì sao tách controller/service/repo?*
- Tách concern: HTTP vs business vs persistence.

2) *Bạn sẽ thêm 1 module mới thế nào?*
- Tạo router/controller/service/repo + add OpenAPI path + mount vào `routes/index.ts`.

3) *Nếu Redis chết, rate limit/cache xử lý sao?*
- Fail-open: không block request.
