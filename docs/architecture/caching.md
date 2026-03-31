# TeamHub — Redis Caching Design (Backend)

Tài liệu này mô tả các vị trí nên cache trong backend TeamHub và cách thiết kế cache bằng Redis sao cho:
- Đúng logic (không “cache sai dữ liệu”, không phá phân quyền)
- Chuẩn thiết kế (key naming, TTL, invalidation, chống stampede)
- Dễ mở rộng (thêm endpoint mới, thêm kiểu cache mới)

## 0) Bối cảnh hiện tại
- Redis đang được dùng cho BullMQ queues (analytics/reminders/emails), ví dụ: `backend/src/integrations/queue/*.queue.ts`.
- Analytics API đọc từ bảng rollup `board_metrics_daily`, xem `backend/src/modules/analytics/analytics.service.ts`.
- Một số truy vấn “nặng”/hay gọi:
  - Board view: lists + cards + labels (xem `backend/src/modules/boards/boards.repo.ts`)
  - Membership checks: `isBoardMember`, `isWorkspaceMember` được gọi dày đặc ở nhiều service
  - Chat history: danh sách messages/attachments (xem `backend/src/modules/chat/chat.repo.ts`)

## 1) Nguyên tắc cache (cực quan trọng)
### 1.1 Cache không thay thế phân quyền
- Luôn làm authN/authZ như hiện tại trước.
- Cache chỉ là “tăng tốc sau khi đã đủ quyền”.

### 1.2 Redis down = hệ thống vẫn chạy
- Thiết kế theo kiểu “best-effort”: Redis lỗi thì fallback về DB.
- Không để cache làm endpoint fail.

### 1.3 Chọn đúng dữ liệu để cache
Ưu tiên cache những thứ:
- Read-heavy, write-low (hoặc write theo batch) → ROI cao
- Truy vấn nặng (join/nested/select nhiều)
- Không yêu cầu realtime tuyệt đối

Không nên cache (hoặc chỉ TTL cực ngắn) cho:
- Dữ liệu thay đổi liên tục (board/cards live state)
- Dữ liệu quá phụ thuộc user-specific nếu bạn chưa “scope key” theo user

### 1.4 Tách “cache key space” với BullMQ
Vì Redis đang dùng cho BullMQ, nên:
- Dùng prefix riêng, ví dụ `cache:v1:*`.
- Nếu dự án lớn lên, cân nhắc Redis instance riêng cho cache hoặc cấu hình eviction policy riêng.

## 2) Pattern khuyến nghị: Cache-aside + Version-stamp
### 2.1 Cache-aside (khuyên dùng mặc định)
Flow:
1) Compute cache key
2) `GET` Redis
3) Nếu hit → parse JSON và trả
4) Nếu miss → query DB → `SET` Redis (kèm TTL) → trả

Ưu điểm:
- Dễ áp dụng, dễ debug
- Không phụ thuộc Redis để “đọc” được dữ liệu

### 2.2 Version-stamp (rất hợp cho invalidation)
Thay vì “DEL hàng loạt keys”, dùng một số version per scope:
- Ví dụ: `cache:v1:board:{boardId}:ver`

Key cache sẽ kèm version:
- `cache:v1:board:{boardId}:view:ver:{n}`

Khi board thay đổi:
- `INCR cache:v1:board:{boardId}:ver`

Ưu điểm:
- Không cần scan/del pattern (tránh O(N) và tránh DEL nhầm)
- Dễ mở rộng (mọi cache phụ thuộc boardId đều “tự invalid” khi version tăng)

Gợi ý áp dụng version-stamp cho:
- Board view (lists/cards/labels)
- Analytics response (nếu muốn invalidate ngay sau rollup)

## 3) Các phần nên cache (đề xuất theo mức ROI)

### 3.1 (ROI rất cao) Cache response cho Analytics API
Endpoint: `GET /boards/:id/analytics` (xem `backend/src/modules/analytics/analytics.router.ts` + `analytics.service.ts`).

Đặc điểm:
- Dữ liệu analytics đọc từ bảng rollup theo ngày (`board_metrics_daily`)
- Thay đổi ít (thường 1 lần/ngày, hoặc khi backfill)
- Payload trả về gồm `daily[]` + `summary`

Thiết kế key:
- Prefix: `cache:v1`
- Scope theo board + range:
  - Nếu query dùng `range`: `cache:v1:analytics:board:{boardId}:range:{7d|30d|90d|1y}`
  - Nếu query dùng `from/to`: `cache:v1:analytics:board:{boardId}:from:{YYYY-MM-DD}:to:{YYYY-MM-DD}`

TTL khuyến nghị:
- 5–30 phút (tùy traffic). Với analytics, TTL dài thường vẫn OK.

Invalidation khuyến nghị:
- TTL-only là đủ cho đa số.
- Nếu muốn “đúng ngay” khi rollup xong: thêm version-stamp `cache:v1:analytics:board:{boardId}:ver` và bump version sau khi upsert metrics.

Lưu ý authz:
- Endpoint hiện giới hạn OWNER/ADMIN. Bạn vẫn phải check DB membership trước khi trả cache.

### 3.2 (ROI cao) Cache membership checks (board/workspace)
Điểm nóng: `isBoardMember`, `isWorkspaceMember` được gọi ở nhiều service (cards/checklists/chat/analytics…).

Thiết kế key:
- `cache:v1:member:workspace:{workspaceId}:user:{userId}` → giá trị `{ role } | null`
- `cache:v1:member:board:{boardId}:user:{userId}` → giá trị `{ role } | null`

TTL khuyến nghị:
- 30–120 giây.

Invalidation:
- TTL ngắn thường đủ.
- Nếu muốn chặt chẽ hơn: bump `cache:v1:member:board:{boardId}:ver` khi thay đổi members/roles và đưa ver vào key.

Note “negative caching”:
- Cache cả trường hợp “không phải member” với TTL ngắn (10–30s) để giảm DB hit khi bị spam.

### 3.3 (ROI trung bình) Cache board view (lists + cards + labels)
Nguồn: `boardsRepo.listListsByBoard`, `boardsRepo.listCardsByBoard`, `boardsRepo.listLabelsByBoard` (xem `backend/src/modules/boards/boards.repo.ts`).

Đặc điểm:
- Read rất nhiều (mở board, refresh, multi-tab)
- Write cũng nhiều (drag/move/update), nên TTL dài dễ “stale”

Thiết kế khuyến nghị:
- Dùng version-stamp per board:
  - `cache:v1:board:{boardId}:ver` (integer)
  - Key view: `cache:v1:board:{boardId}:view:ver:{n}`

TTL khuyến nghị:
- 3–15 giây nếu TTL-only.
- Nếu version-stamp chuẩn: TTL có thể 1–5 phút (vì version đã xử lý invalidation).

Inval points (cần bump version):
- Card create/update/move/archive
- List create/update/reorder/archive
- Label create/update/delete/attach/detach
- Checklist/item update
- Attachment/comment/assignee changes nếu board view hiển thị counts

Gợi ý triển khai dễ mở rộng:
- Tạo một hàm `touchBoard(boardId)` (INCR ver) và gọi nó trong các service write.

### 3.4 (ROI trung bình) Cache chat history (đọc lại message)
Nếu chat history được load thường xuyên (scroll, reconnect), có thể cache 1–2 trang gần nhất:
- `cache:v1:chat:board:{boardId}:page:{cursor|offset}:{limit}`
TTL 5–30s, invalidation bằng bump `cache:v1:chat:board:{boardId}:ver` khi có message mới.

### 3.5 (ROI thấp, tùy) Cache user search / workspace list
- `GET /users/search` (kết quả theo query string) có thể cache 10–30s.
- `GET /workspaces` / `GET /workspaces/:id/members` có thể cache ngắn 10–60s.

Cẩn thận scope key theo user:
- Workspace list là per-user, nên key phải chứa userId.

## 4) Thiết kế “chuẩn” cho key + data format
### 4.1 Key naming convention
- Luôn có prefix và version:
  - `cache:v1:{domain}:{scope...}:{params...}`
- Luôn encode tham số có giới hạn ký tự (date/range/id). Tránh nhét JSON dài vào key.

Ví dụ (khuyến nghị):
- `cache:v1:analytics:board:{boardId}:from:{YYYY-MM-DD}:to:{YYYY-MM-DD}`
- `cache:v1:member:board:{boardId}:user:{userId}`
- `cache:v1:board:{boardId}:view:ver:{n}`

### 4.2 Value format
- JSON string (dễ debug) + có thể thêm envelope:
  - `{ "v": 1, "data": ..., "createdAt": "..." }`

### 4.3 TTL policy
- TTL là bắt buộc để tránh “rác vĩnh viễn” trong Redis.
- Chọn TTL theo business semantics:
  - Analytics: phút (read-heavy, write-low)
  - Membership: chục giây
  - Board view: vài giây nếu TTL-only, hoặc dài hơn nếu version-stamp

## 5) Chống cache stampede (thundering herd)
Với key hot, nếu cache miss đồng thời, nhiều request sẽ cùng query DB.

Giải pháp đơn giản:
- Dùng lock key theo cache key:
  - `SET cache:v1:lock:{key} 1 NX PX 5000`
- Nếu lock được: bạn query DB và set cache.
- Nếu không lock được: chờ 50–150ms rồi thử GET lại hoặc fallback DB.

## 6) Invalidation strategy: chọn theo độ khó
### A) TTL-only (đơn giản nhất)
- Chỉ cần GET/SETEX.
- Hợp nhất cho analytics.

### B) Version-stamp (khuyên dùng khi cần “đúng ngay”)
- “Bump version” thay vì DEL keys.
- Hợp cho board view và chat history.

### C) Event-driven invalidate
- Khi có activity/write, publish event và invalidation handler xử lý.
- Phức tạp hơn, chỉ nên dùng khi cache nhiều tầng.

## 7) Lộ trình triển khai (khuyến nghị)
### Phase 1: Analytics cache (nhanh, ít rủi ro)
- Cache response của `getBoardAnalytics`.
- TTL 5–30m.
- Optional: version-stamp bump sau rollup.

### Phase 2: Membership cache
- Cache `isBoardMember`/`isWorkspaceMember`.
- TTL 30–120s + negative cache.

### Phase 3: Board view cache (nếu cần)
- Thêm `board:{boardId}:ver`.
- Bump ver ở write paths.
- Cache view theo version.

## 8) Các lỗi thiết kế hay gặp (cần tránh)
- Cache mà không scope theo user (leak dữ liệu).
- Dùng `DEL cache:*` hoặc scan pattern ở runtime.
- TTL quá dài cho dữ liệu write-heavy.
- Không có fallback khi Redis lỗi.
- Không cache “not member” → spam request vẫn đánh DB.

## 9) Checklist khi thêm cache cho endpoint mới
- [ ] Dữ liệu có phụ thuộc user/role không?
- [ ] Key có chứa đủ scope không (workspaceId/boardId/userId)?
- [ ] TTL hợp lý theo tần suất thay đổi?
- [ ] Invalidation dùng TTL hay version-stamp?
- [ ] Redis down có ảnh hưởng endpoint không?
- [ ] Có cần lock chống stampede không?
