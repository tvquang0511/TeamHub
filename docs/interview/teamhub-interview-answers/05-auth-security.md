# 05 — Authentication, authorization và security

## 1. Luồng register → verify email → login?

Đăng ký tạo user với mật khẩu bcrypt hash và gửi email verification token. Sau xác minh email, user login nhận access JWT ngắn hạn và refresh JWT. Refresh token được hash rồi lưu DB; refresh thành công revoke token cũ và cấp cặp token mới.

## 2. Vì sao không login trước khi verify email?

Xác minh email chứng minh user sở hữu inbox, giảm đăng ký bằng email người khác và bảo đảm reset/invite email có địa chỉ đáng tin hơn. Đây là policy sản phẩm; có thể cho trải nghiệm guest hạn chế nếu nghiệp vụ cần, nhưng action nhạy cảm vẫn nên yêu cầu verify.

## 3. Access token và refresh token khác nhau thế nào?

Access token ngắn hạn, gửi kèm mỗi API/socket request để xác thực; nếu lộ thì thời gian bị lạm dụng ngắn. Refresh token dài hạn, chỉ dùng để xin cặp token mới và được lưu/revoke phía server. Tách hai token giúp vừa có UX phiên đăng nhập lâu, vừa giảm blast radius của access token.

## 4. Vì sao hash refresh/reset token trước khi lưu?

Nếu database bị lộ, attacker không dùng trực tiếp token đang còn hiệu lực. Server hash token client gửi lên rồi so sánh. Đây giống nguyên tắc không lưu password dạng plain text.

## 5. Refresh-token rotation là gì?

Mỗi lần refresh, token cũ bị revoke và một refresh token mới được lưu. Nó làm giảm cửa sổ lạm dụng của token bị đánh cắp và cho phép phát hiện/reject token cũ bị dùng lại, dù vẫn cần chiến lược xử lý reuse nếu muốn bảo mật cao hơn.

## 6. Khi logout, vô hiệu hóa token thế nào?

Client gửi refresh token; backend hash nó, tìm token valid trong DB rồi gắn `revokedAt`. Access token đã phát thường không thu hồi ngay nếu chỉ JWT stateless, nhưng TTL ngắn giảm thời gian còn hiệu lực. Client cũng phải xóa token/session local.

## 7. Reset password vì sao revoke toàn bộ refresh token?

Mật khẩu bị đổi có thể là dấu hiệu session cũ đã bị lộ. Revoke toàn bộ refresh token bắt mọi thiết bị đăng nhập lại bằng mật khẩu mới, ngăn attacker tiếp tục refresh access token.

## 8. Vì sao forgot-password luôn trả thành công?

Để không cho attacker dò email nào đã đăng ký qua response API. Email tồn tại thì gửi reset link; không tồn tại thì vẫn trả `{ ok: true }` với thông điệp trung tính.

## 9. Vì sao bcrypt thay vì mã hóa đối xứng hoặc SHA-256?

Password không cần giải mã nên mã hóa đối xứng làm tăng rủi ro lộ key. SHA-256 rất nhanh, thuận lợi cho brute force. Bcrypt là password hash chậm, có salt và cost factor, khiến tấn công offline tốn kém hơn; nên dùng async API để không block event loop.

## 10. JWT có bị thu hồi ngay lập tức không?

Access JWT thuần không tự thu hồi ngay vì server không tra DB ở mỗi request. Thiết kế hiện tại revoke refresh token khi logout/reset, nên token access còn sống đến hết TTL. Nếu cần revoke access ngay, dùng denylist/cache theo `jti`, token version per user hoặc introspection; đổi lại tăng state/lookup.

## 11. Workspace membership và board membership khác nhau thế nào?

Workspace membership là điều kiện nền để vào workspace. Board membership kiểm soát quyền ghi và quyền đọc board private. Board `WORKSPACE` cho workspace member đọc; nếu không là board member thì read-only. Board `PRIVATE` mặc định chỉ board member xem, với policy hiện tại workspace admin/owner có quyền xem read-only phục vụ quản trị.

## 12. MEMBER, ADMIN, OWNER khác nhau thế nào?

Ở workspace, MEMBER đọc data theo policy; ADMIN tạo board và quản lý member/invite theo policy; OWNER có quyền nhạy cảm như xóa workspace, đồng thời phải luôn còn ít nhất một owner. Ở board, MEMBER thao tác nội dung khi là board member; ADMIN quản lý settings/members; OWNER có quyền cao nhất. Luôn enforce ở backend, không chỉ ẩn nút UI.

## 13. Board `PRIVATE` và `WORKSPACE` khác nhau thế nào?

Board `WORKSPACE` cho mọi workspace member đọc; ai không là board member chỉ read-only. Board `PRIVATE` mặc định chỉ board member đọc. Policy hiện tại cho workspace ADMIN/OWNER đọc private board ở chế độ read-only để phục vụ quản trị; write vẫn yêu cầu board membership.

## 14. Vì sao workspace admin đọc private board nhưng không ghi được?

Đó là trade-off quản trị: admin cần xem dữ liệu khi audit/incident nhưng không nên mặc nhiên sửa nội dung của team. Tách read override khỏi write tránh leo thang quyền ngoài ý muốn; mọi access nhạy cảm nên có audit log.

## 15. Ngăn sửa ID URL để đọc tài nguyên workspace khác thế nào?

Mỗi endpoint truy từ card/list/board về workspace và kiểm tra membership của `userId` từ JWT trước khi trả dữ liệu. ID khó đoán chỉ là lợi ích phụ; authorization server-side mới là lớp bảo vệ thật. Cache/socket cũng phải đi qua kiểm tra này.

## 16. Vì sao email accept invite phải khớp email invite?

Invite token là secret nhưng có thể bị forward/lộ. Ràng buộc email bảo đảm lời mời chỉ được claim bởi người được mời; user phải login đúng account rồi mới tạo membership. Token cũng cần expiration và trạng thái accepted.

## 17. Token nào không được log?

Không log access JWT, refresh token, reset-password token, email-verification token, invite token, presigned URL còn hiệu lực, Authorization/Cookie headers, API key và connection string có password. Chỉ log token ID/hash đã được redact khi cần correlation.

## Socket có cần kiểm tra quyền lại không?

Cần. JWT handshake chỉ biết danh tính; event `board:join` và chat vẫn phải xác minh user có quyền board. Room không phải authorization boundary, vì client có thể tự gửi payload join room.

## Các biện pháp security chính?

Validate input bằng Zod, bcrypt password, JWT verify, service-level authorization, CORS/Helmet, không log token/Authorization header, TTL cho token, unique/foreign-key constraints và rate limit qua Redis. XSS vẫn cần xử lý ở render: không render HTML chưa sanitize từ comment/chat.

## Những việc còn cần trước production mạnh hơn?

Rate limit đầy đủ cho REST và socket, audit log cho hành động nhạy cảm, security headers/CSP phù hợp, secret rotation, monitoring bất thường, kiểm thử authorization tự động và quy trình backup/restore đã được kiểm thử.
