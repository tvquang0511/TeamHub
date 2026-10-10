# 07 — Redis cache

## Redis được dùng để làm gì?

Redis làm cache best-effort cho board detail, card detail, analytics và membership; đồng thời là backend của BullMQ. Cache dùng prefix riêng để không va chạm key queue.

## Cache-aside là gì?

Service đọc cache trước. Cache hit thì trả dữ liệu; miss thì query PostgreSQL, ghi cache có TTL rồi trả. Redis lỗi thì coi như miss và fallback DB, do đó cache không được là nguồn dữ liệu duy nhất.

## Version-stamp invalidation hoạt động thế nào?

Board có key version như `cache:v1:board:{boardId}:ver`. Cache detail chứa version trong key. Khi card/list/label thay đổi, service `INCR` version; request sau dùng key version mới, nên không đọc cache cũ. Cache cũ tự hết hạn qua TTL, tránh scan/xóa hàng loạt key.

## Vì sao tách board version và analytics version?

Board view thay đổi thường xuyên khi card/list thay đổi, còn analytics thay đổi theo rollup/backfill. Tách version tránh việc mỗi drag-and-drop làm mất cache analytics không liên quan.

## Negative caching là gì?

Không có membership cũng được cache bằng sentinel `__none__`. Điều này giảm DB hit khi một user không có quyền liên tục gọi tài nguyên. TTL membership ngắn và key phải chứa cả resource ID lẫn user ID.

## Cache có thay authorization không?

Không. Service phải check quyền trước khi trả cache. Nếu cache được trả chỉ theo `boardId` mà bỏ auth, dữ liệu board có thể bị lộ sang user không có quyền.

## Cache stampede là gì?

Khi cache hot cùng hết hạn, nhiều request đồng thời cùng query DB. Có thể dùng lock ngắn Redis `SET key NX PX`, request giữ lock nạp cache; request khác chờ rất ngắn để đọc lại hoặc fallback DB. Chỉ thêm cơ chế này khi đo được tải gây vấn đề.
