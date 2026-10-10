# 07 — Redis cache

## 1. Redis được dùng trong TeamHub cho những mục đích nào?

Redis làm cache best-effort cho board detail, card detail, analytics và membership; đồng thời là backend của BullMQ. Cache dùng prefix riêng để không va chạm key queue.

## 3. Cache-aside là gì?

Service đọc cache trước. Cache hit thì trả dữ liệu; miss thì query PostgreSQL, ghi cache có TTL rồi trả. Redis lỗi thì coi như miss và fallback DB, do đó cache không được là nguồn dữ liệu duy nhất.

## 8. Version-stamp cache invalidation là gì?

Board có key version như `cache:v1:board:{boardId}:ver`. Cache detail chứa version trong key. Khi card/list/label thay đổi, service `INCR` version; request sau dùng key version mới, nên không đọc cache cũ. Cache cũ tự hết hạn qua TTL, tránh scan/xóa hàng loạt key.

## 10. Board version cache và analytics version cache tách riêng để làm gì?

Board view thay đổi thường xuyên khi card/list thay đổi, còn analytics thay đổi theo rollup/backfill. Tách version tránh việc mỗi drag-and-drop làm mất cache analytics không liên quan.

## 11. Negative caching là gì? Dùng cho membership check có lợi gì?

Không có membership cũng được cache bằng sentinel `__none__`. Điều này giảm DB hit khi một user không có quyền liên tục gọi tài nguyên. TTL membership ngắn và key phải chứa cả resource ID lẫn user ID.


## 2. Redis cache khác gì Redis dùng cho BullMQ?

Có thể dùng cùng Redis server nhưng khác key namespace và mục đích. Cache có TTL, có thể mất và fallback PostgreSQL; BullMQ lưu waiting/delayed/active/failed job và retry metadata. Production có thể tách Redis instance nếu workload hoặc yêu cầu availability khác nhau.

## 4. Nếu Redis down, hệ thống còn hoạt động không?

Read API cache-aside fallback PostgreSQL nên vẫn hoạt động nhưng chậm hơn. BullMQ, delayed reminder và rate limit bị ảnh hưởng theo policy fail-open/fail-closed. Redis không được là source of truth cho card/board; cần alert và recovery plan.

## 5. Vì sao cache vẫn phải kiểm tra authorization trước khi trả dữ liệu?

Key board/card thường không chứa user ID. Nếu trả cache trước authZ, non-member có thể thấy dữ liệu của member. Service luôn kiểm tra quyền trước; response phụ thuộc user/role còn phải scope key theo user/role.

## 6. Cache key nên chứa gì để tránh lộ dữ liệu giữa users?

Key cần prefix/version, ID phạm vi dữ liệu và mọi input làm response khác nhau: user/role, locale, filter, page hoặc date range. Key phải deterministic, chuẩn hóa input và không chứa JWT/password/PII không cần thiết.

## 7. Vì sao board detail có TTL nhưng vẫn cần invalidation?

TTL chỉ giới hạn thời gian stale data, không làm dữ liệu mới xuất hiện ngay. Khi card/list/label đổi, service bump board version hoặc xóa card detail key để request kế tiếp đọc state mới; TTL dọn key cũ và bảo vệ khi invalidation bị bỏ sót.

## 9. Vì sao không xóa theo pattern như `DEL cache:*`?

`DEL` không xử lý wildcard một cách an toàn; dùng `KEYS` hoặc scan namespace lớn tốn CPU, có thể ảnh hưởng Redis và dễ xóa nhầm. Version-stamp invalidation có scope rõ, O(1), và key cũ tự hết hạn.

## 12. Cache stampede/thundering herd là gì?

Đó là lúc một hot key hết hạn và nhiều request cùng miss, cùng query DB. Có thể dùng TTL jitter, stale-while-revalidate hoặc lock; chỉ thêm cơ chế phức tạp khi metric cho thấy DB thực sự bị ảnh hưởng.

## 13. Dùng Redis lock giảm stampede thế nào?

Khi miss, request thử `SET lock:{cacheKey} 1 NX PX 5000`. Holder query DB rồi set cache; request khác chờ jitter ngắn, GET lại rồi mới fallback DB. Lock phải có TTL và ownership token để process chết không khóa vĩnh viễn hoặc xóa lock của request khác.

## 14. Khi nào không nên cache?

Không cache dữ liệu nhạy cảm nếu scoping chưa chắc, response one-off, dữ liệu write-heavy/read-low, payload quá lớn hoặc query chưa được chứng minh là bottleneck. Cache không thay transaction, authorization hay database source of truth.

## 15. Làm sao kiểm tra invalidate đúng sau khi move card?

Tạo cache board detail, ghi nhận version key; move card; xác nhận version tăng và GET tiếp theo trả list/position mới từ key version mới. Có thể bật cache log ở dev và viết integration test mutation → GET state mới.
