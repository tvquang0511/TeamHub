# TeamHub — Rate Limiting (Redis)

Tài liệu này mô tả rate limit trong TeamHub (thiết kế + implementation hiện tại) và cách cấu hình.

## 0) Mục tiêu
- Bảo vệ backend khỏi spam/brute-force (đặc biệt auth/password reset).
- Giảm rủi ro DoS nhẹ ở mức đồ án.
- Redis down không làm API chết (fail-open), nhưng vẫn log/monitor về sau.

## 1) Pattern được dùng
**Fixed window counter** (đơn giản, đủ tốt cho đồ án):
- Mỗi request sẽ `INCR` một key theo cửa sổ thời gian.
- Nếu lần đầu trong window → `EXPIRE` key bằng `windowSec`.
- Nếu `count > max` → trả `429 RATE_LIMITED`.

Ưu điểm:
- Rất nhanh, dùng ít tài nguyên, atomic.

Nhược điểm:
- Có “burst” ở ranh giới giữa 2 window (có thể chấp nhận cho đồ án).

## 2) Implementation
- Middleware: `backend/src/common/middlewares/rateLimit.ts`
- Mount global API limiter: `backend/src/app.ts` → `app.use("/api", apiRateLimit, routes)`
- Auth limiter (stricter): `backend/src/modules/auth/auth.router.ts`
  - `router.use(authRateLimit)` cho toàn bộ `/auth/*`
  - `forgot-password` và `reset-password` thêm `passwordRateLimit` (siết theo giờ)

## 3) Key design
Prefix riêng để không lẫn với cache/BullMQ:
- `RATE_LIMIT_PREFIX` (mặc định `rl:v1`)

Key format:
- `${RATE_LIMIT_PREFIX}:{name}:{identity}:{windowStartSec}`

Trong đó:
- `name`: nhóm limiter (`api`, `auth`, `password`)
- `identity`: `ip:{req.ip}` hoặc `u:{userId}` tuỳ scope
- `windowStartSec`: mốc bắt đầu của fixed window

## 4) Config (env)
Trong backend (`backend/src/config/env.ts`):
- `RATE_LIMIT_ENABLED=true|false`
- `RATE_LIMIT_PREFIX=rl:v1`

Global API:
- `RATE_LIMIT_API_WINDOW_SEC=60`
- `RATE_LIMIT_API_MAX=240`

Auth:
- `RATE_LIMIT_AUTH_WINDOW_SEC=60`
- `RATE_LIMIT_AUTH_MAX=20`

Password reset:
- `RATE_LIMIT_PASSWORD_WINDOW_SEC=3600`
- `RATE_LIMIT_PASSWORD_MAX=5`

Reverse proxy note:
- Nếu chạy sau Nginx/reverse proxy, bật `TRUST_PROXY=true` để `req.ip` lấy đúng client IP từ `X-Forwarded-For`.

## 5) Recommended upgrades (khi muốn “pro” hơn)
1) **Per-user limiter** sau auth (scope `user-or-ip`) cho các endpoint đắt (board view, card detail, search).
2) **Token bucket / sliding window** để giảm burst ở ranh giới window.
3) **Audit logging** cho 429 (kèm ip/userId/route) để phân tích abuse.
4) **Separate Redis DB / instance** cho rate limit nếu traffic cao.
5) **Allowlist** (internal IP) + different limits per role (ADMIN higher) nếu cần.
