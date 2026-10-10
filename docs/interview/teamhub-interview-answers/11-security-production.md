# 11 — Security và production

## 1. Những lớp bảo mật chính của TeamHub là gì?

Các lớp gồm: HTTPS/TLS khi deploy; secret trong environment; bcrypt cho password; JWT và refresh-token rotation; Zod validation; service-level authorization theo workspace/board membership; foreign key/unique constraint; CORS/Helmet; rate limit; output rendering an toàn; và log redact dữ liệu nhạy cảm. Không có lớp nào đủ một mình.

## 2. Helmet và CORS giải quyết vấn đề gì?

Helmet thêm các HTTP security headers để giảm rủi ro như MIME sniffing, clickjacking và một số XSS vectors tùy cấu hình. CORS nói cho browser origin nào được phép gọi API và gửi credential. Hai thứ hỗ trợ browser security, không thay thế xác thực hay phân quyền server-side.

## 3. CORS không phải authentication — giải thích.

CORS là chính sách do browser thực thi. Curl, mobile app, backend khác hoặc attacker có token vẫn có thể gọi API không bị CORS chặn. Authentication xác định user bằng token/session; authorization kiểm tra user được làm gì. Backend vẫn phải verify token và quyền cho mọi request.

## 4. API nào cần rate limit mạnh nhất?

Login, register, forgot/reset password, resend verification cần chống brute force/abuse. AI breakdown và presigned upload cần limit chi phí/tài nguyên. Chat/comment/socket event cần limit spam. Nên kết hợp key theo IP, user và resource; endpoint nhạy cảm cần ngưỡng chặt hơn read API thông thường.

## 5. Rate limit HTTP và Socket.IO khác nhau thế nào?

HTTP limit thường đếm request theo IP/user trong fixed/sliding window. Socket là kết nối dài, nên limit số connection, số event mỗi giây theo socket và `(userId, boardId)`, payload size và join attempts. Socket vi phạm có thể ack error, mute tạm hoặc disconnect theo policy.

## 6. Làm sao chống XSS ở chat/comment?

Render content như text, không dùng `dangerouslySetInnerHTML` với input người dùng. Nếu cần rich text, sanitize bằng allowlist ở server hoặc trước render, không chỉ regex. Validate length, set CSP phù hợp, và không đưa untrusted data vào HTML attribute/URL mà không encode/validate.

## 7. CSRF có phải mối lo của token architecture hiện tại không?

Nếu access token gửi qua Authorization header và không tự động kèm theo request, CSRF giảm vì site độc hại không đọc token. Nếu refresh token ở cookie thì browser tự gửi cookie; phải dùng `HttpOnly`, `Secure`, `SameSite` phù hợp và CSRF token/origin check cho mutation. XSS vẫn nguy hiểm nếu token được lưu trong nơi script đọc được.

## 8. Bảo vệ JWT secret, database URL, API key thế nào?

Đặt trong secret manager hoặc environment của runtime, không commit `.env`, không in ra log và dùng quyền truy cập tối thiểu. Tách secret theo môi trường, rotate khi nghi ngờ lộ, giới hạn IAM cho storage/provider, và dùng CI secret store thay vì hard-code trong source hoặc Docker image.

## 9. Điều gì tuyệt đối không được đưa vào frontend environment?

Không đưa private JWT secret, database URL/password, Redis URL có credential, S3 access/secret key, email/AI provider key, service-account credential hoặc internal admin password. Biến `VITE_*` được bundle cho browser nên phải xem là công khai; chỉ đặt public URL/key được provider thiết kế để public.

## 10. Logging production cần tránh log gì?

Không log password, access/refresh JWT, reset/verification/invite token, Authorization/Cookie header, presigned URL còn hiệu lực, API key, database connection string, file/chat content nhạy cảm và PII không cần thiết. Dùng request ID, user ID đã cân nhắc privacy, error code và redaction để debug.

## 11. Prisma chống SQL injection thế nào? Raw query thì sao?

Prisma query API parameterizes value nên input không bị ghép thành SQL syntax. Nhưng Prisma không cứu raw SQL nối chuỗi trực tiếp. Với raw query phải dùng parameterized/tagged APIs, allowlist tên cột/order direction khi dynamic, không bao giờ ghép raw input vào câu SQL.

## 12. Cần bổ sung gì trước khi đưa hệ thống thật vào production?

Cần CI/CD và migration rollback plan, backup/restore drill, monitoring/alert/log tập trung, rate limit hoàn chỉnh, TLS/CSP/security headers, test E2E authorization, load test, secret rotation, dependency scanning, least-privilege IAM, policy retention/audit và incident runbook. Ưu tiên theo rủi ro/thực tế sử dụng, không chỉ thêm công nghệ.

## 13. Backup/restore board JSON có rủi ro bảo mật và dữ liệu nào?

JSON có thể chứa PII, comment, attachment metadata và nội dung không tin cậy; file lớn/độc có thể gây DoS parser. Restore có nguy cơ ID collision, cross-workspace reference, partial write, role escalation, duplicate attachment hoặc ghi đè dữ liệu. Chỉ người có quyền cao mới export/restore và file cần validate/giới hạn size.

## 14. Restore JSON thế nào để tránh ghi đè hoặc không nhất quán?

Validate schema, size, ownership và mọi reference trước; preview/dry-run số resource sẽ tạo. Restore vào board mới hoặc yêu cầu xác nhận/version rõ thay vì âm thầm overwrite. Dùng transaction cho các record DB, mapping ID mới cho entity restore, xử lý storage side effect bằng queue/cleanup, ghi audit log actor/time/source/result.
