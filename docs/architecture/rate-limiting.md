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
- Feature-level limiters are mounted per router (sau `authJwt`) để có thể dùng scope `user-or-ip` (fair hơn so với IP-only):
  - `backend/src/modules/workspaces/workspaces.router.ts`
  - `backend/src/modules/invites/invites.router.ts`
  - `backend/src/modules/boards/boards.router.ts`
  - `backend/src/modules/lists/lists.router.ts`
  - `backend/src/modules/cards/cards.router.ts`
  - `backend/src/modules/users/users.router.ts`
  - `backend/src/modules/attachments/attachments.router.ts`
  - `backend/src/modules/labels/labels.router.ts`
  - `backend/src/modules/checklists/checklists.router.ts`
  - `backend/src/modules/assignees/assignees.router.ts`
  - `backend/src/modules/comments/comments.router.ts`
  - `backend/src/modules/analytics/analytics.router.ts`

- Auth limiter (stricter, per-IP): `backend/src/modules/auth/auth.router.ts`
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

Global API safety net:
- `RATE_LIMIT_API_WINDOW_SEC=60`
- `RATE_LIMIT_API_MAX=240`

Feature-level:
- `RATE_LIMIT_WORKSPACES_WINDOW_SEC`, `RATE_LIMIT_WORKSPACES_MAX`
- `RATE_LIMIT_INVITES_WINDOW_SEC`, `RATE_LIMIT_INVITES_MAX`
- `RATE_LIMIT_BOARDS_WINDOW_SEC`, `RATE_LIMIT_BOARDS_MAX`
- `RATE_LIMIT_BOARD_VIEW_WINDOW_SEC`, `RATE_LIMIT_BOARD_VIEW_MAX`
- `RATE_LIMIT_CHAT_WINDOW_SEC`, `RATE_LIMIT_CHAT_MAX`
- `RATE_LIMIT_LISTS_WINDOW_SEC`, `RATE_LIMIT_LISTS_MAX`
- `RATE_LIMIT_CARDS_WINDOW_SEC`, `RATE_LIMIT_CARDS_MAX`
- `RATE_LIMIT_CARD_DETAIL_WINDOW_SEC`, `RATE_LIMIT_CARD_DETAIL_MAX`
- `RATE_LIMIT_USERS_WINDOW_SEC`, `RATE_LIMIT_USERS_MAX`
- `RATE_LIMIT_ATTACHMENTS_WINDOW_SEC`, `RATE_LIMIT_ATTACHMENTS_MAX`
- `RATE_LIMIT_LABELS_WINDOW_SEC`, `RATE_LIMIT_LABELS_MAX`
- `RATE_LIMIT_CHECKLISTS_WINDOW_SEC`, `RATE_LIMIT_CHECKLISTS_MAX`
- `RATE_LIMIT_ASSIGNEES_WINDOW_SEC`, `RATE_LIMIT_ASSIGNEES_MAX`
- `RATE_LIMIT_COMMENTS_WINDOW_SEC`, `RATE_LIMIT_COMMENTS_MAX`
- `RATE_LIMIT_ANALYTICS_WINDOW_SEC`, `RATE_LIMIT_ANALYTICS_MAX`

Auth:
- `RATE_LIMIT_AUTH_WINDOW_SEC=60`
- `RATE_LIMIT_AUTH_MAX=20`

Password reset:
- `RATE_LIMIT_PASSWORD_WINDOW_SEC=3600`
- `RATE_LIMIT_PASSWORD_MAX=5`

Reverse proxy note:
- Nếu chạy sau Nginx/reverse proxy, bật `TRUST_PROXY=true` để `req.ip` lấy đúng client IP từ `X-Forwarded-For`.

## 4.1) Recommended default profile (TeamHub)
Các giá trị dưới đây là “default profile” khuyến nghị cho đồ án TeamHub (read-heavy, nhưng siết hơn cho endpoint đắt như board view, analytics, upload).

Nguyên tắc:
- **Global `/api`** chỉ là “safety net” (loose), còn limiter theo feature mới là chính.
- Các router sau `authJwt` dùng scope `user-or-ip` để **đã login thì limit theo user**, tránh chặn oan khi nhiều người chung IP.

Recommended (per 60s):
- `RATE_LIMIT_API_MAX=600` (per IP) — safety net.
- `RATE_LIMIT_WORKSPACES_MAX=60` — thao tác workspace không quá dày.
- `RATE_LIMIT_INVITES_MAX=30` — tránh spam mời.
- `RATE_LIMIT_BOARDS_MAX=120` — thao tác board tương đối thường.
- `RATE_LIMIT_BOARD_VIEW_MAX=30` — payload nặng (board detail).
- `RATE_LIMIT_CHAT_MAX=90` — chat vừa phải (đồ án).
- `RATE_LIMIT_LISTS_MAX=120` — CRUD lists.
- `RATE_LIMIT_CARDS_MAX=180` — CRUD/move cards khá thường.
- `RATE_LIMIT_CARD_DETAIL_MAX=90` — endpoint nặng hơn list.
- `RATE_LIMIT_USERS_MAX=60` — browse/search users vừa phải.
- `RATE_LIMIT_ATTACHMENTS_MAX=30` — upload/presign nên siết.
- `RATE_LIMIT_LABELS_MAX=90`, `RATE_LIMIT_CHECKLISTS_MAX=90`, `RATE_LIMIT_ASSIGNEES_MAX=90` — thao tác phụ trợ.
- `RATE_LIMIT_COMMENTS_MAX=120` — comment thường xuyên.
- `RATE_LIMIT_ANALYTICS_MAX=30` — analytics query có thể nặng theo range.

Auth (per IP):
- `RATE_LIMIT_AUTH_MAX=20` / 60s
- `RATE_LIMIT_PASSWORD_MAX=5` / 3600s

Gợi ý tuning:
- Nếu UI có polling (realtime fallback), tăng `CARDS_MAX`/`CHAT_MAX` một chút.
- Nếu thấy DB/CPU nóng ở endpoint nặng, ưu tiên giảm `BOARD_VIEW_MAX`/`ANALYTICS_MAX` trước.

## 5) Recommended upgrades (khi muốn “pro” hơn)
1) **Per-user limiter** sau auth (scope `user-or-ip`) cho các endpoint đắt (board view, card detail, search).
2) **Token bucket / sliding window** để giảm burst ở ranh giới window.
3) **Audit logging** cho 429 (kèm ip/userId/route) để phân tích abuse.
4) **Separate Redis DB / instance** cho rate limit nếu traffic cao.
5) **Allowlist** (internal IP) + different limits per role (ADMIN higher) nếu cần.
