# 05 — Authentication, authorization và security

## Luồng auth trong dự án?

Đăng ký tạo user với mật khẩu bcrypt hash và gửi email verification token. Sau xác minh email, user login nhận access JWT ngắn hạn và refresh JWT. Refresh token được hash rồi lưu DB; refresh thành công revoke token cũ và cấp cặp token mới.

## Vì sao hash refresh/reset token trước khi lưu?

Nếu database bị lộ, attacker không dùng trực tiếp token đang còn hiệu lực. Server hash token client gửi lên rồi so sánh. Đây giống nguyên tắc không lưu password dạng plain text.

## Refresh token rotation là gì?

Mỗi lần refresh, token cũ bị revoke và một refresh token mới được lưu. Nó làm giảm cửa sổ lạm dụng của token bị đánh cắp và cho phép phát hiện/reject token cũ bị dùng lại, dù vẫn cần chiến lược xử lý reuse nếu muốn bảo mật cao hơn.

## Vì sao forgot-password luôn trả thành công?

Để không cho attacker dò email nào đã đăng ký qua response API. Email tồn tại thì gửi reset link; không tồn tại thì vẫn trả `{ ok: true }` với thông điệp trung tính.

## Phân quyền workspace và board?

Workspace membership là điều kiện nền để vào workspace. Board membership kiểm soát quyền ghi và quyền đọc board private. Board `WORKSPACE` cho workspace member đọc; nếu không là board member thì read-only. Board `PRIVATE` mặc định chỉ board member xem, với policy hiện tại workspace admin/owner có quyền xem read-only phục vụ quản trị.

## Socket có cần kiểm tra quyền lại không?

Cần. JWT handshake chỉ biết danh tính; event `board:join` và chat vẫn phải xác minh user có quyền board. Room không phải authorization boundary, vì client có thể tự gửi payload join room.

## Các biện pháp security chính?

Validate input bằng Zod, bcrypt password, JWT verify, service-level authorization, CORS/Helmet, không log token/Authorization header, TTL cho token, unique/foreign-key constraints và rate limit qua Redis. XSS vẫn cần xử lý ở render: không render HTML chưa sanitize từ comment/chat.

## Những việc còn cần trước production mạnh hơn?

Rate limit đầy đủ cho REST và socket, audit log cho hành động nhạy cảm, security headers/CSP phù hợp, secret rotation, monitoring bất thường, kiểm thử authorization tự động và quy trình backup/restore đã được kiểm thử.
