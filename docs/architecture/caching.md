# TeamHub — Redis Caching (Implementation & Design)

Tài liệu này mô tả cache Redis trong TeamHub theo đúng **code hiện tại** và đưa ra chuẩn thiết kế để bạn mở rộng thêm nhiều cache khác mà vẫn:
- Đúng logic (không cache sai dữ liệu / không phá phân quyền)
- Dễ vận hành (TTL rõ ràng, Redis down vẫn chạy)
- Dễ mở rộng (key convention + version-stamp + invalidation pattern)

## 0) Bối cảnh
- Redis hiện được dùng cho BullMQ (jobs) và cho cache.
- Để tránh “đụng key” với BullMQ, cache dùng prefix riêng: `CACHE_PREFIX` (mặc định `cache:v1`).

Các file liên quan cache:
- Backend cache helpers: `backend/src/integrations/cache/redisCache.ts`
- Backend env cache knobs: `backend/src/config/env.ts`
- Worker env prefix (bump analytics version): `worker/src/config/env.ts`

Cache đang được áp dụng ở:
- Analytics response: `backend/src/modules/analytics/analytics.service.ts`
- Membership checks: `backend/src/modules/boards/boards.repo.ts`
- Board view (board detail payload): `backend/src/modules/boards/boards.service.ts#getDetail`
- Card detail: `backend/src/modules/cards/cards.service.ts#get`

## 1) Concepts (nắm 3 ý là đủ)

### 1.1 TTL (Time To Live)
Khi bạn `SET key ... EX <ttlSec>`, Redis sẽ tự “expire” key đó sau `ttlSec` giây.
- Với app, bạn có thể hiểu đơn giản: **hết TTL = `GET` trả `null` như không có key**.
- TTL bắt buộc để tránh rác tồn tại vĩnh viễn.

### 1.2 Cache-aside (pattern mặc định)
Luồng chuẩn:
1) Tạo cache key
2) `GET` cache
3) Hit → trả
4) Miss → query DB → `SET EX` → trả

Ưu điểm: Redis down thì vẫn query DB được (cache chỉ là best-effort).

### 1.3 Version-stamp / “bump version” (invalidation không cần DEL pattern)
Khi data thay đổi, thay vì `DEL` hàng loạt key theo prefix/pattern (tốn kém + dễ sai), TeamHub dùng **một con số version** trong Redis.

Ví dụ board view:
- Version key: `${CACHE_PREFIX}:board:{boardId}:ver`
- Cache key có kèm version: `${CACHE_PREFIX}:board:{boardId}:detail:ver:{n}`

Khi board thay đổi:
- Tăng version bằng `INCR` (đây là “bump”): `INCR ${CACHE_PREFIX}:board:{boardId}:ver`

Kết quả:
- Request sau sẽ đọc version mới và dùng key mới → cache cũ tự “bị bỏ qua” (và sẽ tự biến mất theo TTL).

TeamHub tách 2 version độc lập:
- Board view version: `${CACHE_PREFIX}:board:{boardId}:ver`
- Analytics version: `${CACHE_PREFIX}:analytics:board:{boardId}:ver`
  - Lý do: board view thay đổi thường xuyên; analytics chỉ thay đổi khi rollup/backfill metrics.

## 2) Backend cache helper API (theo code)
File: `backend/src/integrations/cache/redisCache.ts`

### 2.1 Key helpers
- `cachePrefix()`
  - Chuẩn hoá prefix (bỏ dấu `:` ở cuối nếu có).
- `cacheKey(...parts)`
  - Nối key dạng `${CACHE_PREFIX}:${parts.join(':')}`.

### 2.2 Basic GET/SET
- `cacheGetString(key)`
  - `CACHE_ENABLED=false` → luôn miss.
  - Redis lỗi → trả `null` (best-effort).
- `cacheSetString(key, value, ttlSec)`
  - Ghi `SET ... EX ttlSec`.
- `cacheDel(key)`
  - Invalidate 1 key ngay bằng `UNLINK` (non-blocking) hoặc fallback `DEL`.

### 2.3 JSON helpers + negative caching
- `cacheGetJson<T>(key)` / `cacheSetJson(key, value, ttlSec)`
  - Lưu/đọc JSON.
  - Có sentinel `__none__` để cache cả `null`.
- `cacheGetJsonNullable<T>(key) -> { hit, value }`
  - Phân biệt:
    - `hit=false`: miss thật
    - `hit=true, value=null`: key tồn tại và là sentinel (negative-cache)

### 2.4 Version helpers
- `getBoardCacheVersion(boardId)` / `bumpBoardCacheVersion(boardId)`
- `getAnalyticsCacheVersion(boardId)` / `bumpAnalyticsCacheVersion(boardId)`

## 3) Những cache đã triển khai (keys/TTL/invalidation)

## 3.1 Analytics response cache (ROI rất cao)
Code: `backend/src/modules/analytics/analytics.service.ts`

Key:
- `${CACHE_PREFIX}:analytics:board:{boardId}:from:{YYYY-MM-DD}:to:{YYYY-MM-DD}:ver:{analyticsVer}`

TTL:
- `CACHE_ANALYTICS_TTL_SEC` (mặc định 600s).

Invalidation:
- Bump analytics version khi metrics thay đổi:
  - Backend manual/backfill rollup: `backend/src/jobs/boardMetricsDaily.ts` gọi `bumpAnalyticsCacheVersion(boardId)`.
  - Worker rollup: `worker/src/modules/analytics/analytics.processor.ts` bump cùng key prefix.

AuthZ:
- Service vẫn check quyền (board role) trước khi trả cached response.

## 3.2 Membership cache (ROI cao)
Code: `backend/src/modules/boards/boards.repo.ts`

Keys:
- `${CACHE_PREFIX}:member:workspace:{workspaceId}:user:{userId}` → `{ id, role } | null`
- `${CACHE_PREFIX}:member:board:{boardId}:user:{userId}` → `{ id, role } | null`

TTL:
- `CACHE_MEMBERSHIP_TTL_SEC` (mặc định 60s).

Negative caching:
- Cache `null` bằng sentinel để giảm DB hit khi bị spam request từ non-member.

Invalidation:
- Khi add/remove/update role board member, repo gọi `cacheDel(key)` đúng key user+board.

## 3.3 Board view cache (board detail payload)
Code: `backend/src/modules/boards/boards.service.ts#getDetail`

Key:
- `${CACHE_PREFIX}:board:{boardId}:detail:ver:{boardVer}`

TTL:
- `CACHE_BOARD_VIEW_TTL_SEC` (mặc định 120s).

Value:
- Cache phần chung `{ board, lists, cards, members, labels }`.
- Không cache `actor` vì user-specific; service tính `actor` sau đó merge vào response.

Invalidation (bump board version):
- Khi board thay đổi: `boards.service.ts` gọi `bumpBoardCacheVersion(boardId)`.
- Khi list thay đổi: `backend/src/modules/lists/lists.service.ts` bump board version.
- Khi label thay đổi: `backend/src/modules/labels/labels.service.ts` bump board version.
- Khi card thay đổi/move/archive/label attach/detach: `backend/src/modules/cards/cards.service.ts` bump board version.

## 3.4 Card detail cache
Code: `backend/src/modules/cards/cards.service.ts#get`

Key:
- `${CACHE_PREFIX}:card:{cardId}:detail`

TTL:
- `CACHE_CARD_DETAIL_TTL_SEC` (mặc định 60s).

Invalidation:
- Mọi thao tác mutate card gọi `cacheDel(cardDetailKey)` và bump board version (để board view cache tự đổi version).

Lưu ý bảo mật:
- `cards.service.ts#get` hiện có thể đọc cache trước, nhưng vẫn thực hiện authZ trước khi trả response.

## 4) Env variables (cache)
Backend (`backend/src/config/env.ts`):
- `REDIS_URL`
- `CACHE_ENABLED` (`true|false`)
- `CACHE_PREFIX` (ví dụ `cache:v1`)
- `CACHE_ANALYTICS_TTL_SEC`
- `CACHE_MEMBERSHIP_TTL_SEC`
- `CACHE_BOARD_VIEW_TTL_SEC`
- `CACHE_CARD_DETAIL_TTL_SEC`

Worker (`worker/src/config/env.ts`):
- `REDIS_URL`
- `CACHE_PREFIX` (phải giống backend)

## 5) Cách thêm cache mới (checklist thực chiến)
1) Xác định scope:
   - Per-user? Per-workspace? Per-board? Per-card?
2) Thiết kế key bằng `cacheKey(...)`:
   - Nếu dữ liệu user-specific → key phải chứa `userId`.
3) Chọn invalidation:
   - Write-low → TTL-only
   - Write-heavy hoặc cần “đúng ngay” → version-stamp (bump) hoặc `cacheDel` theo key cụ thể
4) Luôn có fallback khi cache lỗi (best-effort).
5) Luôn có TTL.

## 6) Gợi ý cache tiếp theo (chưa implement)
- Chat recent pages per board (TTL 5–30s) + chat version bump khi có message mới.
- Workspace list per user (TTL 10–60s) + invalidate khi membership đổi.
- Labels list per board (cache theo board version).

## 7) Chống cache stampede (thundering herd)
Với key hot, nếu cache miss đồng thời, nhiều request có thể cùng query DB.

Giải pháp đơn giản (gợi ý, chưa implement trong code):
- Dùng lock key theo cache key:
  - `SET ${CACHE_PREFIX}:lock:{cacheKey} 1 NX PX 5000`
- Nếu lock được: query DB rồi set cache.
- Nếu không lock được: chờ 50–150ms rồi GET lại, hoặc fallback DB.

## 8) Các lỗi thiết kế hay gặp (cần tránh)
- Cache mà không scope theo user (leak dữ liệu giữa users).
- Cache thay phân quyền (skip authz) → lỗi bảo mật.
- Dùng `DEL cache:*` hoặc scan prefix ở runtime (tốn, dễ gây lag Redis).
- TTL quá dài cho dữ liệu write-heavy mà không có invalidation.
- Không cache “negative” cho membership → request spam vẫn đánh DB.

## 9) Cách verify nhanh (dev)
Bạn có thể kiểm tra 3 thứ để chắc cache đang hoạt động đúng:
1) Version keys
  - Board view: `${CACHE_PREFIX}:board:{boardId}:ver`
  - Analytics: `${CACHE_PREFIX}:analytics:board:{boardId}:ver`
2) Cache keys
  - Board detail: `${CACHE_PREFIX}:board:{boardId}:detail:ver:{n}`
  - Card detail: `${CACHE_PREFIX}:card:{cardId}:detail`
  - Analytics response: `${CACHE_PREFIX}:analytics:board:{boardId}:from:{YYYY-MM-DD}:to:{YYYY-MM-DD}:ver:{n}`
3) Invalidation
  - Sau một thao tác write (update card/move list/attach label), version board phải tăng.
  - Sau khi rollup metrics chạy, analytics version phải tăng.
