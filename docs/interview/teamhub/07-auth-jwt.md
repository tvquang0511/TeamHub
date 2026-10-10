# Auth/Security — JWT (access/refresh), password reset, authorization (TeamHub)

Mục tiêu phần này: bạn có thể trình bày **đầy đủ threat model tối thiểu**, và giải thích rõ **TeamHub xử lý auth + phân quyền + socket auth** như thế nào.

Nguồn tham khảo “chuẩn ý bạn”: `docs/architecture/security.md`.

---

## 1) Threat model tối thiểu (đi phỏng vấn phải nói được)
Những rủi ro thực tế (tối thiểu) mà TeamHub phải xử lý:
1) **Token leak** (access/refresh)
2) **Broken authorization**: user truy cập board/workspace không thuộc họ
3) **Socket join trái phép**: đoán boardId để nghe event/chat
4) **Spam/abuse**: brute-force login, spam forgot-password, spam chat
5) **XSS/CSRF** tuỳ cách lưu token ở client

MVP ưu tiên đúng thứ tự:
- Authorization đúng (workspace/board boundary)
- Refresh token revoke/rotate
- Socket auth + room join check

---

## 2) Authentication: Access token vs Refresh token

### 2.1 Access token (JWT)
Mục tiêu: auth cho REST + socket handshake.
- TTL ngắn (ví dụ 10–20 phút).
- Payload gợi ý:
  - `sub`: userId
  - `email` (optional)
  - `iat`, `exp`

Trong TeamHub:
- REST: middleware `authJwt` verify và gắn `req.user`.
- Socket.IO: middleware handshake verify và gắn `socket.data.user`.

Điểm phỏng vấn hay hỏi:
- “Vì sao access TTL ngắn?”
  - Giảm blast radius khi leak.
- “Revoke access token thế nào?”
  - Thường không revoke “tức thì” (vì JWT stateless). Mình dựa vào TTL + revoke refresh tokens để buộc logout sau khi access hết hạn.

### 2.2 Refresh token (JWT) + rotation
Mục tiêu: cấp access mới khi access hết hạn.
- TTL dài hơn (7–30 ngày).
- Nên có claim phân biệt, ví dụ `type: 'refresh'`.

**Nguyên tắc quan trọng:** không lưu refresh token plaintext trong DB.

Trong TeamHub:
- Khi login/register:
  1) tạo refresh token
  2) hash token (SHA-256) trước khi lưu DB (`token_hash`)
- Khi refresh:
  1) verify JWT signature + exp + `type`
  2) hash token gửi lên và lookup DB row
  3) chỉ chấp nhận nếu token chưa bị revoke và chưa hết hạn
  4) **rotation**: revoke token cũ và cấp token mới

Tại sao rotation quan trọng?
- Nếu refresh token bị leak, attacker chỉ dùng được cho tới khi user refresh lần tiếp theo (token cũ sẽ bị revoke).

---

## 2.3) Flow chuẩn của TeamHub: login → refresh → rotate → revoke (đúng theo code)

Phần này là “đoạn kể chuẩn” để bạn giải thích tự tin trong phỏng vấn. TeamHub đang làm theo hướng:
- **Refresh token lưu trong DB dưới dạng hash** (không lưu plain)
- **Refresh luôn đi kèm rotation** (token cũ bị revoke, token mới được phát)
- **Revoke** khi logout/reset password để cắt phiên từ phía server

### (A) Login / Register
Endpoint:
- `POST /api/auth/login`
- `POST /api/auth/register`

Flow:
1) User gửi email/password.
2) Server verify credentials.
3) Server tạo:
  - Access token (JWT) TTL ngắn.
  - Refresh token (JWT) TTL dài, payload có `type: 'refresh'`.
4) Server **hash refresh token** bằng SHA-256 và lưu DB:
  - `tokenHash = sha256(refreshToken)`
  - `expiresAt` lấy từ claim `exp` trong JWT.
  - Insert vào bảng `refresh_tokens(userId, tokenHash, expiresAt, revokedAt=null)`.
5) Server trả response:
  - Body trả `accessToken` (+ `user`).
  - Refresh token được set vào **httpOnly cookie** (không trả refresh token trong JSON).

Điểm cần nhấn mạnh:
- DB leak không đồng nghĩa account takeover (vì chỉ có hash, không có refresh token raw).
- Refresh token không nằm trong JS runtime (giảm rủi ro XSS đọc token).

### (B) Refresh access token
Endpoint:
- `POST /api/auth/refresh`

Flow:
1) Client gọi refresh khi access token hết hạn.
2) Backend lấy refresh token theo thứ tự:
  - Ưu tiên từ cookie `AUTH_COOKIE_NAME`.
  - Fallback từ body `{ refreshToken }` (để backward compatible).
3) Service verify refresh token:
  - Verify signature + exp bằng `JWT_REFRESH_SECRET`.
  - Verify `payload.type === 'refresh'`.
4) Check server-side validity trong DB:
  - Tính `tokenHash = sha256(refreshToken)`.
  - Tìm row còn hiệu lực: `revokedAt is null` và `expiresAt > now`.
  - Không thấy => coi như đã revoked/không hợp lệ.

### (C) Rotation (diễn ra bên trong refresh)
Nếu refresh token hợp lệ, TeamHub rotate theo kiểu “đổi thẻ”:
1) Tạo `newAccessToken`.
2) Tạo `newRefreshToken`.
3) Revoke token cũ trong DB: set `revokedAt = now`.
4) Hash `newRefreshToken` và insert row mới (`revokedAt=null`).
5) Trả response:
  - Body: `{ accessToken: newAccessToken }`.
  - Set-cookie: refresh token mới (ghi đè cookie cũ).

Tác dụng bạn nên nói:
- Refresh token cũ trở thành **single-use theo thời gian**.
- Nếu token cũ bị lộ, sau khi rotate nó sẽ chết.

### (D) Revoke (logout / reset password)

#### D1) Logout
Endpoint:
- `POST /api/auth/logout`

Flow:
1) Lấy refresh token (cookie hoặc body).
2) Hash và tìm token hợp lệ trong DB.
3) Nếu tồn tại => set `revokedAt = now`.
4) Clear cookie refresh.

Điểm kể hay:
- Dù token có tồn tại hay không, vẫn trả `{ ok: true }` để không leak thông tin.

#### D2) Reset password / đổi password
Endpoint:
- `POST /api/auth/reset-password`

Flow (security-critical):
1) Validate reset token, update password.
2) **Revoke toàn bộ refresh tokens của user** (updateMany `revokedAt=now`).

Ý nghĩa:
- Nếu refresh token bị lộ trước đó, attacker sẽ bị “đá” khỏi toàn bộ phiên khi user đổi/reset password.

---

## 2.4) Nếu refresh token bị lộ thì sao? (phân tích đúng theo rotation/revoke)

### Case 1 — Lộ refresh token raw (nguy hiểm nhất)
- Attacker có refresh token raw có thể gọi `/api/auth/refresh` để lấy access token mới.
- Vì refresh có rotation:
  - Nếu attacker refresh trước, refresh token cũ sẽ bị revoke → user thật dùng token cũ sẽ refresh fail và phải login lại.
  - Nếu user refresh trước, token cũ bị revoke → attacker cầm token cũ sẽ không refresh được nữa.

Thông điệp phỏng vấn:
- Rotation không làm “miễn nhiễm”, nhưng **giảm thời gian token cũ còn dùng được** và tạo cơ chế chặn reuse.

### Case 2 — Chỉ lộ DB (chỉ có tokenHash)
- Vì server yêu cầu client gửi refresh token raw để hash và match DB, attacker không thể dùng `tokenHash` để refresh.

### Case 3 — Redis/logging lộ token
- Nếu vô tình log refresh token raw (hoặc proxy ghi log), attacker có thể lấy và refresh.
- Quy tắc vận hành: **không log Authorization/Cookie**, redaction logs.

---

## 2.5) Cookie checklist (HttpOnly / Secure / SameSite / Path) — nói chắc tay khi phỏng vấn

TeamHub set refresh token vào cookie với các tiêu chí:
1) `HttpOnly: true`
  - JS không đọc được refresh token → giảm rủi ro XSS ăn cắp token.
2) `Secure`
  - Dev có thể `false`.
  - Production bắt buộc `true` (HTTPS) nếu không token sẽ bị gửi qua HTTP (rủi ro sniff).
3) `SameSite`
  - Default hợp lý cho single-origin là `lax`.
  - Nếu cần cross-site cookie (FE/BE khác domain) thì thường phải `none` + `Secure: true`.
4) `Path`
  - TeamHub dùng `path: '/api/auth'` để cookie chỉ gửi lên các endpoint auth (giảm bề mặt tấn công).
5) `Max-Age`
  - Cookie maxAge là “UX/Browser retention”, nhưng server vẫn quyết định bằng `exp` của refresh JWT.

Checklist trả lời nhanh (1 câu):
> Refresh token để trong httpOnly cookie, Secure + SameSite hợp lý, Path scope hẹp, và refresh token luôn rotate + lưu DB dạng hash để revoke được.

---

## 3) Storage token ở client: trade-offs (bạn phải nói được)
TeamHub có thể trình bày 2 phương án (như doc `security.md`):

### Option A (phổ biến đồ án)
- Access token: in-memory (state)
- Refresh token: httpOnly cookie (tốt) hoặc localStorage (dễ nhưng kém an toàn)
- Access expired -> gọi refresh để lấy access mới

### Option B (cookie-based)
- Cả access/refresh lưu cookie httpOnly + SameSite
- Backend set cookie, frontend chỉ gọi API
- Phức tạp hơn (CORS/cookie policy)

Điểm phỏng vấn:
- Nếu dùng localStorage cho refresh: nói thẳng risk XSS.
- Nếu dùng cookie: nói về CSRF và SameSite.

---

## 4) Password reset: không leak email + dùng queue gửi mail

### 4.1 Không leak email tồn tại
Khi user gọi forgot-password:
- Dù email có tồn tại hay không, backend vẫn trả `{ ok: true }`.
- Mục tiêu: tránh user enumeration.

### 4.2 Reset token: random + hash
Flow đề xuất/đang dùng:
1) generate token random đủ dài (vd 256-bit base64url)
2) lưu **hash** token trong DB (giống refresh token)
3) gửi link reset chứa token raw qua email

Reset password:
- validate token
- update password hash
- revoke toàn bộ refresh tokens của user (buộc đăng nhập lại ở mọi thiết bị)

### 4.3 Gửi email qua BullMQ
Tại sao không gửi email trong request?
- Email IO có thể chậm/fail
- Queue cho retry/backoff và không tăng latency

TeamHub:
- Backend enqueue job vào queue `emails`
- Worker thực thi và gửi mail (nodemailer)

---

## 5) Authorization model: workspace → board (cốt lõi TeamHub)
Đây là phần nhà tuyển dụng hay “xoáy” vì nhiều bạn chỉ làm auth mà quên authZ.

### 5.1 Boundary
- Mọi resource (boards/lists/cards/chat/reminders/analytics) thuộc về một workspace.
- Rule nền tảng: user phải là **workspace member** mới truy cập được.

### 5.2 Roles
Theo doc `security.md`:
- Workspace roles: `MEMBER | ADMIN | OWNER`
- Board roles: `MEMBER | ADMIN | OWNER`

Policy quan trọng:
- Write operations trong board (create/update/move list/card, chat…) yêu cầu **board membership**.
- Với board visibility:
  - `WORKSPACE`: workspace member có thể read; nếu không là board member thì read-only
  - `PRIVATE`: chỉ board member read (hoặc có override read-only cho workspace ADMIN/OWNER tuỳ policy)

### 5.3 “Company safety” (điểm kể hay)
Doc có nêu khả năng admin/owner xử lý tình huống xấu (xóa board vi phạm…). Nếu bạn áp dụng override read/delete, nên nói thêm:
- cần audit log (phase sau)

---

## 6) Socket.IO security: auth + join check
Phần này nối trực tiếp với file realtime.

1) Socket handshake verify access JWT
2) Event `board:join` phải check membership trước khi join room
3) Server emits phải scope đúng room `board:{boardId}`

---

## 7) Rate limiting cho auth endpoints
Theo `docs/architecture/rate-limiting.md`:
- `/auth/*`: limit theo IP (stricter)
- forgot/reset password: limiter riêng theo giờ

Reverse proxy note:
- Khi chạy sau Nginx, cần bật `TRUST_PROXY=true` để `req.ip` lấy đúng client IP.

---

## 7.1) Code pointers (đọc theo flow)
- Auth router (mount rate limiters): `backend/src/modules/auth/auth.router.ts`
- Auth service (login/refresh/logout/forgot/reset): `backend/src/modules/auth/auth.service.ts`
- JWT verify middleware cho REST: `backend/src/common/middlewares/authJwt.ts`
- Password hashing utilities (nếu tách module): tìm trong `backend/src/modules/auth/*` hoặc `backend/src/common/*`
- Email queue producer: `backend/src/integrations/queue/emails.queue.ts` (hoặc tương đương)
- Email worker processor: `worker/src/modules/email/email.processor.ts`
- Rate limit middleware: `backend/src/common/middlewares/rateLimit.ts`

---

## 8) Câu hỏi phỏng vấn + câu trả lời mẫu

### Q1: “Vì sao lưu hash refresh token trong DB?”
> Vì refresh token là secret. Nếu DB leak mà lưu plaintext thì attacker dùng ngay được. Hash (SHA-256) giúp DB leak không trực tiếp biến thành account takeover.

### Q2: “Rotation giúp gì?”
> Rotation biến refresh token thành single-use theo thời gian: mỗi lần refresh, token cũ bị revoke. Token bị lộ sẽ nhanh mất tác dụng sau lần refresh kế tiếp.

### Q3: “JWT có nhược điểm gì trong revoke?”
> Access token stateless nên revoke tức thì khó; mình giảm rủi ro bằng TTL ngắn và revoke refresh tokens (logout/reset password) để ngăn cấp access mới.

### Q4: “Socket realtime bảo mật thế nào?”
> Socket phải verify access JWT ở handshake và bắt buộc check membership khi join room. Nếu không, user đoán boardId vẫn join để nghe lén chat/events.

---

## 9) Bộ câu hỏi phỏng vấn “xoáy sâu” cho rotation/revoke/cookie (kèm ý trả lời ngắn)

1) **“Vì sao refresh token phải lưu server-side (DB) chứ không chỉ verify JWT là xong?”**
  - Vì cần **revoke** (logout/reset password) và **rotation**. JWT thuần stateless không cắt phiên được.

2) **“DB leak thì sao? Hash refresh token giúp gì?”**
  - Hash (SHA-256) khiến DB leak không biến thành token usable; attacker không thể refresh nếu không có refresh token raw.

3) **“Rotation giải quyết vấn đề gì mà revoke không giải quyết?”**
  - Rotation làm token cũ thành “single-use theo thời gian”, giảm cửa sổ reuse; revoke là hành động chủ động cắt token.

4) **“Nếu attacker lấy được refresh token, họ làm gì được?”**
  - Có thể gọi `/auth/refresh` để lấy access token mới. Với rotation, attacker refresh trước sẽ khiến user thật refresh fail (bị đá phiên).

5) **“Vì sao login trả refresh token bằng cookie nhưng access token lại trả trong body?”**
  - Refresh token cần bảo vệ khỏi JS (httpOnly), còn access token thường được giữ memory để gọi API (tuỳ chiến lược FE).

6) **“Cookie httpOnly tránh được gì và không tránh được gì?”**
  - Tránh XSS đọc token. Không tự động tránh CSRF nếu cookie được gửi cross-site (cần SameSite/CSRF strategy).

7) **“SameSite=Lax/Strict/None chọn sao?”**
  - Single-origin: Lax thường ổn. Cross-site cookie: None + Secure. Strict có thể làm hỏng một số UX redirect.

8) **“Vì sao set `Path=/api/auth` là một best practice?”**
  - Giới hạn cookie chỉ gửi lên auth endpoints → giảm nguy cơ bị gửi kèm request không cần thiết.

9) **“Logout có cần báo ‘token có tồn tại không’ không?”**
  - Không. Trả `{ ok: true }` để tránh leak thông tin và giữ UX đơn giản.

10) **“Reset password thì vì sao phải revoke tất cả refresh tokens?”**
  - Đây là hành vi security chuẩn: nếu ai đó đã chiếm session trước đó, đổi mật khẩu sẽ cắt toàn bộ session.

11) **“Nếu refresh token bị dùng lại sau khi đã rotate (token reuse) thì bạn làm gì?”**
  - Câu trả lời nâng cao: coi là compromise signal → revoke toàn bộ tokens của user (hoặc token family) và bắt login lại.

12) **“Tại sao refresh endpoint cho phép nhận token từ body (fallback) lại là rủi ro?”**
  - Token trong body dễ bị log/trace hơn; cookie httpOnly an toàn hơn. TeamHub giữ fallback để tương thích, nhưng ưu tiên cookie.
