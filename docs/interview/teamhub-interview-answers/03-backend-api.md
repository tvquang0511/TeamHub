# 03 — Backend và API

## 1. Controller, service, repository phân vai thế nào?

Controller nhận HTTP request và trả response. Service chứa use case, validation nghiệp vụ, authorization và orchestration. Repository chỉ truy cập Prisma/database. Tách như vậy giúp service test được mà không phụ thuộc Express và tránh lặp nghiệp vụ ở nhiều endpoint.

## 2. Vì sao controller không nên chứa business logic?

Controller gắn với HTTP: đọc params/body, gọi service và chuyển lỗi thành response. Business rule như “board private chỉ member mới ghi được” phải dùng được từ REST, Socket.IO hoặc job; đặt ở service giúp tái sử dụng và test độc lập Express.

## 3. Prisma nằm ở repository để giải quyết gì?

Repository cô lập chi tiết query Prisma khỏi nghiệp vụ. Service nói bằng ý nghĩa như `findMembership` hay `createCard`, không phụ thuộc trực tiếp bảng/query. Điều này giúp mock database trong unit test và thay đổi query ít lan rộng hơn.

## 4. Luồng request từ router đến database ra sao?

Router ghép URL với middleware auth/validate và controller. Controller lấy input đã parse, `userId` từ auth context rồi gọi service. Service kiểm tra use case/quyền, gọi repository Prisma; repository query PostgreSQL. Kết quả hoặc `ApiError` quay về error middleware để thành JSON response thống nhất.

## 5. Vì sao vẫn validate backend khi frontend đã validate?

Frontend không phải trust boundary: request có thể đến từ curl, app cũ hoặc client bị sửa. Backend dùng Zod để kiểm tra kiểu, format và giới hạn dữ liệu trước khi vào business logic/database.

## 6. Chuẩn hóa format lỗi API thế nào?

Tạo `ApiError` có HTTP status, code ổn định và message an toàn; error middleware chuyển mọi lỗi về một envelope như `{ error: { code, message } }`. Validation error có code/chi tiết field phù hợp. Nhờ đó frontend không phải đoán message string và không lộ stack trace production.

## 7. Endpoint nào có ý nghĩa idempotent?

`PUT/PATCH` cập nhật resource về trạng thái mong muốn và `DELETE` thường nên idempotent: gọi lại không làm thay đổi thêm. `POST` create không mặc định idempotent; với request có thể retry cần unique constraint hoặc idempotency key. Không nên nói mọi PATCH đều idempotent nếu nó là “tăng counter”.

## 8. Khi nào dùng 401, 403, 404, 409, 422?

- `401`: chưa xác thực hoặc token không hợp lệ/hết hạn.
- `403`: đã biết user nhưng không có quyền thao tác.
- `404`: tài nguyên không tồn tại hoặc có thể che giấu tài nguyên tùy security policy.
- `409`: xung đột trạng thái, ví dụ email đã đăng ký hoặc user đã là member.

`422` phù hợp khi body đúng cú pháp nhưng không thỏa điều kiện validate/nghiệp vụ theo convention API; dự án cũng có thể dùng `400` nhất quán cho invalid input. Điều quan trọng là giữ convention nhất quán và có code lỗi rõ.

## 9. Vì sao dùng TypeScript ở backend?

TypeScript làm rõ shape của request/service/DTO, giảm lỗi đổi tên field, truyền sai kiểu ID và refactor an toàn hơn. Nó không thay runtime validation hay authorization vì client vẫn gửi JSON tùy ý.

## 10. Làm sao ngăn giả mạo `workspaceId`, `userId`?

`userId` chỉ lấy từ JWT đã verify, không lấy từ body. `workspaceId`, `boardId`, `cardId` từ URL/body được xem là tài nguyên được yêu cầu; service truy ngược quan hệ và membership trong database trước khi thực hiện thao tác. Không có authorization dựa đơn thuần vào ID client gửi.

## 11. API nào cần transaction? Vì sao?

Dùng khi một use case ghi nhiều bản ghi nhưng phải thành công hoặc thất bại cùng nhau; ví dụ tạo workspace cùng owner membership, restore board JSON, hoặc thao tác cần tạo card và dữ liệu liên quan. Nếu không transaction, lỗi giữa chừng có thể để dữ liệu dở dang.

## Vì sao không tin `userId` hay `workspaceId` từ body?

`userId` phải lấy từ JWT đã verify. Với `workspaceId`/`boardId` từ path/body, server truy vấn quan hệ và kiểm tra membership trước khi đọc hoặc ghi. Client chỉ đề xuất tài nguyên muốn thao tác, không quyết định quyền.

## 12. Tạo workspace thành công nhưng tạo owner membership thất bại thì sao?

Hai thao tác phải nằm trong một database transaction. Nếu tạo membership lỗi, transaction rollback workspace vừa tạo, tránh workspace không owner. Cũng có thể dùng nested write Prisma nếu phù hợp, nhưng bản chất vẫn phải atomic.

## 13. Test service layer thế nào? Vì sao đáng giá hơn chỉ test controller?

Ưu tiên service layer: permission, state transition, input không hợp lệ, conflict và side effect. Repository có thể mock trong unit test; sau đó có vài integration test cho Prisma/PostgreSQL để đảm bảo query và constraint đúng. Controller chỉ cần ít test cho mapping HTTP/validation.
