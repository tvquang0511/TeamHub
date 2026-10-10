# Redis — Cache (bump version) + Rate limiting (TeamHub)

Mục tiêu phần này: bạn hiểu **cache-aside + version bump** (điểm mạnh của TeamHub) và **rate limit Redis INCR/EXPIRE** (đủ để giải thích + debug).

Nguồn tham khảo “chuẩn ý bạn”:
- `docs/architecture/caching.md`
- `docs/architecture/rate-limiting.md`

---

## 1) Redis trong TeamHub làm 3 vai trò
1) **Cache** (cache-aside + TTL)
2) **Rate limiting** (fixed window counter)
3) **BullMQ broker** (queue storage)

Nguyên tắc thiết kế:
- Keyspace tách nhau bằng prefix để không “đụng” BullMQ.
- Redis down không làm API chết (best-effort / fail-open tuỳ tính năng).

---

## 2) Cache trong TeamHub: tư duy thiết kế

### 2.1 Pattern: cache-aside (đúng với code)
Flow chuẩn:
1) build key
2) `GET` cache
3) hit -> trả
4) miss -> query DB -> `SET EX` -> trả

Tại sao chọn cache-aside?
- Redis chỉ là tăng tốc, không phải source of truth
- Redis lỗi -> vẫn query DB được

### 2.2 TTL là bắt buộc
TTL giúp:
- tự dọn rác
- tránh stale vô hạn

TeamHub có TTL theo loại data (analytics/board view/membership/card detail).

### 2.3 Prefix & key conventions
Trong cache module, key được chuẩn hoá dạng:
- `CACHE_PREFIX` (mặc định `cache:v1`)
- key join theo `:`

Ví dụ (concept):
- `cache:v1:board:{boardId}:detail:ver:{n}`

Lợi ích:
- dễ grep/debug
- dễ migrate namespace bằng cách bump prefix `cache:v2`

### 2.4 Negative caching bằng sentinel
Vấn đề: với các check như “user có phải member không?”, attacker/non-member spam sẽ làm DB bị hit liên tục.

Giải pháp TeamHub:
- Cache cả `null` bằng sentinel (vd `__none__`) để:
  - cache hit vẫn trả `null` (nhưng biết là “đã check rồi”)
  - giảm DB load

### 2.5 “Bump version” để invalidate cache (điểm mạnh nhất)
Đây là đoạn bạn nên kể như một “design highlight”.

#### 2.5.1 Vì sao không `DEL cache:*`?
- `DEL` theo pattern phải dùng scan (tốn, dễ lag Redis)
- Dễ sai (xoá nhầm key)

#### 2.5.2 Version-stamp strategy
TeamHub dùng một key version cho từng scope:
- Board view version:
  - `cache:v1:board:{boardId}:ver`
- Analytics version:
  - `cache:v1:analytics:board:{boardId}:ver`

Cache key luôn “kèm version”:
- Board detail key: `...:detail:ver:{boardVer}`
- Analytics key: `...:from:{from}:to:{to}:ver:{analyticsVer}`

Khi dữ liệu thay đổi:
- không cần xoá key cũ
- chỉ cần `INCR` version -> request sau sẽ dùng key mới
- key cũ tự hết hạn theo TTL

Lợi ích khi đi phỏng vấn:
- invalidation **đúng** và **rẻ**
- tránh “xóa nhầm” hoặc scan prefix runtime

### 2.6 AuthZ safety: cache không được phá phân quyền
Nguyên tắc:
- Không bao giờ trả cached response nếu chưa check quyền.

TeamHub áp dụng:
- Những cache có thể share giữa users (vd analytics response) thì vẫn check role trước.
- Board detail cache: cache phần “chung”; phần user-specific (actor) tính sau.
- Membership cache có key chứa `userId` nên không leak giữa users.

---

## 3) Cache trong TeamHub: các “case study” (dễ học)

### 3.1 Analytics response cache
Mục tiêu: analytics query thường nặng (range + aggregate).

Key (theo doc):
- `cache:v1:analytics:board:{boardId}:from:{YYYY-MM-DD}:to:{YYYY-MM-DD}:ver:{analyticsVer}`

TTL:
- `CACHE_ANALYTICS_TTL_SEC` (default 600s)

Invalidation:
- Khi rollup/backfill metrics chạy xong -> bump analytics version.

### 3.2 Board view cache (payload nặng)
Key:
- `cache:v1:board:{boardId}:detail:ver:{boardVer}`

TTL:
- `CACHE_BOARD_VIEW_TTL_SEC` (default 120s)

Invalidation:
- Mọi mutation trong board (lists/cards/labels/...) -> bump board version.

### 3.3 Membership cache + negative caching
Keys:
- `cache:v1:member:workspace:{workspaceId}:user:{userId}`
- `cache:v1:member:board:{boardId}:user:{userId}`

TTL:
- `CACHE_MEMBERSHIP_TTL_SEC` (default 60s)

Invalidation:
- Add/remove/update role -> xoá đúng key (targeted `cacheDel`).

---

## 4) Rate limiting trong TeamHub

### 4.1 Mục tiêu
- Chặn brute-force/login spam
- Giảm request burst vào endpoint nặng (board view, analytics, upload presign)
- Redis down không làm API chết (fail-open)

### 4.2 Thuật toán: fixed window counter
Key format (theo doc):
- `{RATE_LIMIT_PREFIX}:{name}:{identity}:{windowStartSec}`

Logic:
1) `INCR` key
2) nếu là request đầu -> `EXPIRE(windowSec)`
3) nếu `count > max` -> trả `429` + `Retry-After`

Ưu/nhược:
- Ưu: nhanh, đơn giản, đủ cho đồ án
- Nhược: burst ở boundary giữa 2 window

### 4.3 Identity scope
TeamHub hỗ trợ scope:
- `ip`
- `user`
- `user-or-ip`:
  - đã login: limit theo `userId` (fair)
  - chưa login: limit theo IP

### 4.4 Headers (nên biết để debug)
TeamHub set:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After`

### 4.5 Fail-open trade-off
Nếu Redis down:
- middleware catch error và `next()` để không chặn API.

Bạn cần nói được trade-off:
- Ưu: không “đổ domino” làm app chết vì Redis
- Nhược: khi Redis down thì attacker không bị limit

---

## 5) Reverse proxy note: `TRUST_PROXY=true`
Nếu chạy sau Nginx, `req.ip` sẽ lấy IP của Nginx nếu không trust proxy.
Hậu quả:
- rate limit theo IP bị sai (tất cả user chung 1 IP)

Giải pháp:
- bật `TRUST_PROXY=true` để Express đọc `X-Forwarded-For`.

---

## 6) Debug checklist (cache + rate limit)
### 6.1 Cache
1) Redis đang connect đúng URL?
2) `CACHE_ENABLED` có bật?
3) Kiểm tra version keys có tăng sau mutation/rollup?
4) TTL có hợp lý (không quá dài)?
5) Có cache leak giữa users không? (key có `userId` khi cần)

### 6.2 Rate limit
1) `TRUST_PROXY` đúng chưa?
2) identity scope dùng `user-or-ip` đúng chỗ chưa?
3) endpoint nặng (board view/analytics/presign) có limit chặt hơn chưa?

---

## 6.1) Code pointers (đọc theo flow)
Cache:
- Redis cache helpers + version bump: `backend/src/integrations/cache/redisCache.ts`
- Cache knobs/env: `backend/src/config/env.ts`
- Analytics cache usage: `backend/src/modules/analytics/analytics.service.ts`
- Board view cache usage: `backend/src/modules/boards/boards.service.ts`
- Membership cache: `backend/src/modules/boards/boards.repo.ts`
- Card detail cache: `backend/src/modules/cards/cards.service.ts`

Rate limiting:
- Rate limit middleware: `backend/src/common/middlewares/rateLimit.ts`
- Router-level mounting (per feature): các file `backend/src/modules/*/*.router.ts`
- Nginx/compose trust proxy wiring: `infra/nginx/conf.d/teamhub.conf` + `infra/docker-compose.yml`

---

## 7) Câu hỏi phỏng vấn + câu trả lời mẫu

### Q1: “Cache invalidation làm sao cho rẻ mà đúng?”
> Em dùng version-stamp: giữ một key version (INCR khi data thay đổi) và cache key kèm version. Invalidate chỉ là bump version, không cần scan/del theo pattern; cache cũ tự hết hạn theo TTL.

### Q2: “Vì sao rate limit dùng Redis?”
> Redis cho counter atomic (`INCR`) và shared state giữa nhiều instance. Nếu scale backend ra nhiều pods, rate limit vẫn nhất quán.

### Q3: “Fixed window có nhược điểm gì?”
> Có burst ở ranh giới 2 window. Nếu cần mượt hơn có thể nâng cấp sliding window/token bucket.
