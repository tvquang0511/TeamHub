# 03 — Backend và API

## Controller, service, repository phân vai thế nào?

Controller nhận HTTP request và trả response. Service chứa use case, validation nghiệp vụ, authorization và orchestration. Repository chỉ truy cập Prisma/database. Tách như vậy giúp service test được mà không phụ thuộc Express và tránh lặp nghiệp vụ ở nhiều endpoint.

## Vì sao vẫn validate backend khi frontend đã validate?

Frontend không phải trust boundary: request có thể đến từ curl, app cũ hoặc client bị sửa. Backend dùng Zod để kiểm tra kiểu, format và giới hạn dữ liệu trước khi vào business logic/database.

## Khi nào dùng 401, 403, 404, 409?

- `401`: chưa xác thực hoặc token không hợp lệ/hết hạn.
- `403`: đã biết user nhưng không có quyền thao tác.
- `404`: tài nguyên không tồn tại hoặc có thể che giấu tài nguyên tùy security policy.
- `409`: xung đột trạng thái, ví dụ email đã đăng ký hoặc user đã là member.

## Transaction dùng khi nào?

Dùng khi một use case ghi nhiều bản ghi nhưng phải thành công hoặc thất bại cùng nhau; ví dụ tạo workspace cùng owner membership, restore board JSON, hoặc thao tác cần tạo card và dữ liệu liên quan. Nếu không transaction, lỗi giữa chừng có thể để dữ liệu dở dang.

## Vì sao không tin `userId` hay `workspaceId` từ body?

`userId` phải lấy từ JWT đã verify. Với `workspaceId`/`boardId` từ path/body, server truy vấn quan hệ và kiểm tra membership trước khi đọc hoặc ghi. Client chỉ đề xuất tài nguyên muốn thao tác, không quyết định quyền.

## Idempotency là gì, API nào cần chú ý?

Một thao tác idempotent gọi lặp nhiều lần vẫn có cùng trạng thái cuối. `DELETE` và update setting thường nên có tính chất này. Với thao tác create do retry mạng, cần idempotency key hoặc unique constraint nếu tạo trùng gây hại, ví dụ reminder dùng unique `(cardId, userId, remindAt)`.

## Test backend nên tập trung đâu?

Ưu tiên service layer: permission, state transition, input không hợp lệ, conflict và side effect. Repository có thể mock trong unit test; sau đó có vài integration test cho Prisma/PostgreSQL để đảm bảo query và constraint đúng. Controller chỉ cần ít test cho mapping HTTP/validation.
