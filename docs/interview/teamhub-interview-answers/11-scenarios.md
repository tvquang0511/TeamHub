# 11 — Câu hỏi tình huống production

## Redis down nhưng PostgreSQL vẫn hoạt động?

Cache chuyển thành miss và API fallback DB, nên response chậm hơn nhưng dữ liệu chính vẫn hoạt động. BullMQ, delayed reminders và realtime scale adapter (nếu có) sẽ bị ảnh hưởng. Cần alert, circuit/best-effort handling và khôi phục Redis; không biến cache thành dependency bắt buộc cho read API.

## Hai người kéo cùng một card cùng lúc?

Hiện tại có thể theo last-write-wins nếu không gửi version. Server cần broadcast state cuối từ DB. Khi cần chặt chẽ hơn, client gửi `updatedAt`/revision; server chỉ update nếu revision khớp, nếu conflict thì trả trạng thái mới để client refetch/retry.

## Board có 100.000 card thì làm gì?

Không trả full board detail. Phân trang/card window theo list, index `(listId, position)`, virtualize frontend và chỉ load detail card khi mở. Cũng đo query plan trước khi thêm cache để biết bottleneck thật.

## User nói thấy board private của người khác?

Ưu tiên incident response: xác minh user/board/request log, tạm chặn quyền hoặc feature gây lộ nếu cần, kiểm tra mọi API và socket join có service-level authorization trước cache/emit. Sau đó vá test regression, audit truy cập và thông báo theo quy trình bảo mật nếu có dữ liệu lộ.

## Email reminder bị gửi hai lần?

Kiểm tra job retry sau lỗi/timeout, nhiều worker consumer, trạng thái DB và job ID. Vì email provider có thể gửi thành công nhưng response timeout, cần idempotency theo reminder/event, claim trạng thái gửi trong DB và chỉ gửi nếu chưa `SENT`; không chỉ dựa vào retry count.

## Scale traffic gấp 100 lần theo thứ tự nào?

Đo trước: APM, DB slow query, Redis hit rate, queue lag. Sau đó CDN/static frontend, scale stateless API sau load balancer, connection pool và index/read pattern PostgreSQL, scale worker theo queue, Redis phù hợp, rồi Socket.IO Redis adapter. Không tách microservice chỉ vì traffic tăng nếu metric chưa chỉ ra điểm nghẽn.

## Những giới hạn nên thừa nhận?

Socket horizontal scaling cần adapter; conflict drag-and-drop có thể nâng cấp bằng revision; board rất lớn cần pagination/virtualization; audit/monitoring/rate-limit cần hoàn thiện hơn. Nêu được giới hạn kèm hướng xử lý thể hiện tư duy kỹ sư tốt hơn tuyên bố hệ thống đã hoàn hảo.
