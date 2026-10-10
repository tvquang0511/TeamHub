# 12 — Câu hỏi tình huống intern

## 1. Hai người kéo cùng một card đến hai list gần như đồng thời, kết quả nào đúng?

Nếu chưa có optimistic concurrency, update đến sau có thể thắng theo last-write-wins và server broadcast state cuối. Khi cần chặt hơn, client gửi revision/`updatedAt`; server chỉ update khi revision khớp, nếu conflict thì trả state mới để client refetch/retry. Cần xác định policy thay vì để UI tự quyết.

## 2. User mất mạng sau khi kéo card, UI và server có thể lệch — xử lý sao?

Optimistic UI đánh dấu mutation pending. Nếu request timeout/lỗi, rollback hoặc refetch state server; khi reconnect, join room lại và sync board. Không hiển thị thành công vĩnh viễn trước khi server xác nhận; có thể lưu outbox local chỉ khi sản phẩm thật sự cần offline support.

## 3. Board có 100.000 card thì endpoint board detail gặp gì?

Full payload gây query nặng, network response lớn, memory API cao và React render chậm. Giải pháp là pagination/lazy-load theo list, cursor query với index `(listId, position)`, select field preview tối thiểu, load card detail khi mở và virtualize danh sách frontend.

## 4. Redis down nhưng PostgreSQL vẫn sống thì tính năng nào bị ảnh hưởng?

Cache miss làm read API chậm hơn nhưng vẫn fallback DB. BullMQ jobs, delayed reminders, queue retry và rate limit Redis bị ảnh hưởng; Socket.IO Redis adapter cũng ảnh hưởng nếu đã scale ngang. Card/board data vẫn ở PostgreSQL, nên Redis không được là nguồn dữ liệu chính.

## 5. PostgreSQL chậm thì debug từ đâu?

Xem metrics CPU/IO/connections, slow-query log, `EXPLAIN ANALYZE`, query count/N+1, missing index, lock/transaction dài và connection-pool exhaustion. Reproduce endpoint chậm với data tương tự production. Chỉ thêm cache/scale database sau khi biết query hoặc tài nguyên nào là bottleneck.

## 6. Email reminder gửi 2 lần: tìm nguyên nhân và sửa ở đâu?

Kiểm tra retry/stalled job, nhiều worker consumer, timeout giữa provider và update DB, `jobId` và reminder status. Sửa ở business layer/worker: claim conditional `PENDING → SENDING`, chỉ gửi khi claim thành công, đánh dấu `SENT` và dùng provider idempotency key nếu có. Queue có thể at-least-once nên không chỉ dựa retry count.

## 7. AI provider hết quota: trải nghiệm user phải thế nào?

Không mất card hay checklist hiện có; thông báo rõ chức năng AI tạm unavailable. Thử fallback provider nếu được cấu hình và còn budget, giới hạn thời gian chờ, hoặc để user thử lại sau. User vẫn có luồng tạo checklist thủ công; log quota event để vận hành xử lý.

## 8. User báo nhìn thấy board private: quy trình điều tra?

Xem đây là security incident. Xác minh user, board, thời gian và request/event; kiểm tra authorization ở REST, socket join, cache response và membership invalidation. Tạm chặn luồng rủi ro nếu cần, xác định phạm vi lộ, vá kèm regression test, audit lại access và thông báo theo policy xử lý dữ liệu.

## 9. Upload file 2 GB: thiết kế cần thay đổi gì?

Cần multipart/resumable upload trực tiếp storage, checksum, quota per user/workspace, URL expiry phù hợp, progress/retry client và malware scan async. Không proxy qua API. Cần lifecycle policy/storage cost monitoring và giới hạn file theo loại nghiệp vụ.

## 10. Nếu cần audit log đầy đủ, schema thế nào?

Tạo bảng append-only gồm ID, actor ID, tenant/workspace/board/card scope, action, target type/ID, timestamp, request/correlation ID, IP/user-agent khi hợp pháp, cùng metadata trước/sau đã redact. Index theo tenant/time và actor/time; không lưu password/token/plain secret. Log audit tách với activity feed UI vì mục đích retention/forensics khác nhau.

## 11. Nếu cần multi-tenant mạnh hơn, đảm bảo isolation thế nào?

Mọi query phải có workspace/tenant boundary và authZ trung tâm; unique/index composite chứa tenant khi phù hợp. Storage key có namespace tenant, cache key và queue job chứa tenant/resource scope. Viết test cross-tenant, cân nhắc row-level security PostgreSQL cho defense-in-depth và không dựa vào ID khó đoán.

## 12. Traffic tăng 100 lần: scale theo thứ tự nào?

Đo trước qua metrics/APM. Phục vụ static frontend qua CDN, scale stateless API sau load balancer, tối ưu connection pool/index/query PostgreSQL, scale worker theo queue lag, chọn Redis đủ capacity/HA và thêm Socket.IO adapter cho realtime nhiều instance. Chỉ tách service khi metric hoặc ownership chỉ rõ bottleneck.
