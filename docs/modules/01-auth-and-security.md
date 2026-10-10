# 01 - Module Xác Thực & Bảo Mật Hệ Thống (Auth & Security)

---

## 1. Bản Đồ Tổng Quan Module Auth

Module Xác thực & Bảo mật (Auth) là "cánh cổng" đầu tiên bảo vệ toàn bộ dữ liệu trong TeamHub. Module này được thiết kế theo các tiêu chuẩn bảo mật khắt khe cấp độ Enterprise, bao gồm:

* **Mã hóa mật khẩu:** Sử dụng thuật toán thích ứng **bcrypt** với cấu hình cost factor (`BCRYPT_ROUNDS = 12`).
* **Cơ chế Token kép (Dual-Token Pattern):** Access Token ngắn hạn + Refresh Token dài hạn.
* **Xoay vòng Refresh Token (Refresh Token Rotation - RTR):** Thu hồi và cấp mới token mỗi lần làm mới phiên, triệt tiêu nguy cơ chiếm đoạt phiên.
* **Bảo vệ rò rỉ Database:** Toàn bộ token (Refresh, Reset Password, Email Verify) **KHÔNG BAO GIỜ lưu dạng thô (Raw)** trong DB, mà bắt buộc băm qua **SHA-256**.
* **Chống rò rỉ thông tin người dùng (Anti-User-Enumeration):** Các API quên mật khẩu, đăng xuất không bao giờ để lộ sự tồn tại của email.
* **Email Verification Gate:** Chặn truy cập đăng nhập đối với tài khoản chưa xác thực email.

---

## 2. Mô Hình Dữ Liệu (Database Schema)

Tất cả bảng liên quan nằm trong file [`backend/prisma/schema.prisma`](file:///d:/projects/persional-projects/Teamhub/backend/prisma/schema.prisma):

```
       ┌────────────────────────┐
       │         users          │
       │────────────────────────│
       │ id (UUID, PK)          │
       │ email (Unique)         │
       │ password_hash          │
       │ display_name           │
       │ email_verified_at      │
       └───────────┬────────────┘
                   │ 1:N
       ┌───────────┼────────────────────────┐
       │           │                        │
       ▼           ▼                        ▼
┌──────────────┐ ┌──────────────────────┐ ┌─────────────────────────┐
│refresh_tokens│ │password_reset_tokens │ │email_verification_tokens│
│──────────────│ │──────────────────────│ │─────────────────────────│
│id (PK)       │ │id (PK)               │ │id (PK)                  │
│user_id (FK)  │ │user_id (FK)          │ │user_id (FK)             │
│token_hash    │ │token_hash (Unique)   │ │token_hash (Unique)      │
│expires_at    │ │expires_at            │ │expires_at               │
│revoked_at    │ │used_at               │ │used_at                  │
│              │ │requested_ip          │ │                         │
│              │ │user_agent            │ │                         │
└──────────────┘ └──────────────────────┘ └─────────────────────────┘
```

### Tại sao cần tách thành 3 bảng Token riêng biệt?
1. **Phân tách trách nhiệm (Separation of Concerns):** Mỗi loại token có vòng đời, logic thu hồi và dữ liệu kiểm toán khác nhau (ví dụ: `password_reset_tokens` cần lưu `requested_ip` và `user_agent` để phục vụ audit log).
2. **Hỗ trợ Multi-device (Đăng nhập nhiều thiết bị):** Một User có thể có nhiều bản ghi trong `refresh_tokens`. Khi đăng xuất trên điện thoại thì phiên trên máy tính vẫn hoạt động bình thường.
3. **Cascading Delete an toàn:** Tất cả bảng con đều có ràng buộc `onDelete: Cascade`. Khi xóa User, toàn bộ token liên quan tự động bị hủy sạch, không để lại rác trong DB.

---

## 3. Kiến Trúc Dual-Token & Refresh Token Rotation (RTR)

### 3.1 Cấu trúc Token

#### 1. Access Token (JWT - Stateless)
* **Secret Key:** `JWT_ACCESS_SECRET`
* **Thời gian sống:** Ngắn hạn (Mặc định: `15m` hoặc `1h`).
* **Payload tối giản:**
  ```json
  {
    "sub": "b2c8a06e-5f33-4db6-9e90-2c7b508f7311",
    "email": "user@teamhub.vn"
  }
  ```
* **Mục đích:** Client gửi kèm trong Header `Authorization: Bearer <access_token>` trong mọi request. API server giải mã tức thì bằng CPU mà **không cần truy vấn cơ sở dữ liệu**.

#### 2. Refresh Token (JWT + Stateful DB Tracking)
* **Secret Key:** `JWT_REFRESH_SECRET` (Riêng biệt với secret của Access Token).
* **Thời gian sống:** Dài hạn (Mặc định: `7d` hoặc `30d`).
* **Payload:**
  ```json
  {
    "sub": "b2c8a06e-5f33-4db6-9e90-2c7b508f7311",
    "type": "refresh"
  }
  ```

---

### 3.2 Quy trình Xoay Vòng Token (Rotation Flow)

Đây là cơ chế quan trọng bậc nhất để ngăn chặn kẻ tấn công tái sử dụng Refresh Token bị đánh cắp:

```
[ Client ]                                     [ Backend API ]                           [ PostgreSQL ]
    │                                                 │                                         │
    │───(1. POST /auth/refresh)──────────────────────►│                                         │
    │    body: { refreshToken: "RT_Old" }             │                                         │
    │                                                 │───(2. Băm SHA-256("RT_Old"))───────────►│
    │                                                 │───(3. Tìm tokenHash trong DB)──────────►│
    │                                                 │◄──(4. Trả về bản ghi, revokedAt == null)┤
    │                                                 │                                         │
    │                                                 │───(5. Thu hồi RT_Old ngay lập tức)─────►│
    │                                                 │       UPDATE revoked_at = NOW()         │
    │                                                 │                                         │
    │                                                 │───(6. Tạo RT_New + AT_New)─────────────►│
    │                                                 │       INSERT INTO refresh_tokens        │
    │                                                 │                                         │
    │◄──(7. Trả về cặp Token mới)─────────────────────┤                                         │
    │    { accessToken: AT_New, refreshToken: RT_New }│                                         │
```

#### Mã nguồn triển khai tại [`auth.service.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/auth/auth.service.ts#L143-L183):
```typescript
async refresh(input: { refreshToken: string }) {
  // 1. Kiểm tra tính hợp lệ về mặt chữ ký số và hạn dùng của JWT
  const payload = verify(input.refreshToken, env.JWT_REFRESH_SECRET) as JwtRefreshPayload;
  if (payload.type !== 'refresh') throw new ApiError(401, 'AUTH_TOKEN_INVALID', 'Invalid token');

  // 2. Tìm kiếm trong Database bằng chuỗi băm SHA-256
  const tokenHash = hashToken(input.refreshToken);
  const existing = await authRepo.findValidRefreshToken(tokenHash);
  if (!existing) {
    // Nếu token đã bị thu hồi trước đó -> Từ chối ngay lập tức
    throw new ApiError(401, 'AUTH_REFRESH_REVOKED', 'Refresh token revoked');
  }

  // 3. THỰC HIỆN ROTATION: Thu hồi token cũ
  await authRepo.revokeRefreshToken(existing.id);

  // 4. Ký cặp Token mới và lưu mã băm của Refresh Token mới vào DB
  const user = await authRepo.findUserById(payload.sub);
  const newAccessToken = signAccessToken(user);
  const newRefreshToken = signRefreshToken(user);

  await authRepo.createRefreshToken({
    userId: user.id,
    tokenHash: hashToken(newRefreshToken),
    expiresAt: parseJwtExpiresAt(newRefreshToken),
  });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user: publicUser(user) };
}
```

---

## 4. Kỹ Thuật Bảo Mật Chuyên Sâu

### 4.1 Băm Token Bằng SHA-256 Trước Khi Lưu Database
* **Lỗ hổng thường thấy ở đồ án nghiệp dư:** Lưu chuỗi `refreshToken` hoặc `resetPasswordToken` trực tiếp vào database dưới dạng Plaintext. Nếu hacker thực hiện SQL Injection hoặc dump được DB, họ sở hữu toàn bộ token của người dùng và chiếm đoạt tài khoản ngay lập tức.
* **Chuẩn giải quyết của TeamHub:**
  ```typescript
  function hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
  ```
  Client cầm chuỗi token gốc (Raw Token). Server chỉ lưu chuỗi băm 64 ký tự hex. Khi Client gửi token lên, Server băm chuỗi đó rồi so khớp với DB. Kẻ đọc được DB cũng không thể dịch ngược mã băm để lấy token gốc!

---

### 4.2 Chống Dò Quét Tài Khoản (Anti-User Enumeration)
* **Kịch bản tấn công:** Hacker viết script gửi 10.000 email vào endpoint `/auth/forgot-password`. Nếu server trả về lỗi `404 Email not found`, hacker sẽ lập được danh sách toàn bộ email của nhân viên trong công ty.
* **Cách TeamHub vô hiệu hóa:** Tại [`auth.service.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/auth/auth.service.ts#L204-L213):
  ```typescript
  async forgotPassword(input: { email: string }) {
    const user = await authRepo.findUserByEmail(input.email.toLowerCase());

    // QUY TẮC AN TOÀN: Dù email có tồn tại hay không, LUÔN LUÔN trả về { ok: true }
    if (!user) {
      return { ok: true }; 
    }

    // Chỉ sinh token và gửi mail nếu email thực sự tồn tại
    // ...
    return { ok: true };
  }
  ```
  Kẻ tấn công nhận về kết quả thành công giả lập giống hệt nhau cho mọi email, hoàn toàn không dò đoán được tài khoản.

---

### 4.3 Email Verification Gate (Cổng Kích Hoạt Bắt Buộc)
1. Khi gọi `/auth/register`:
   * Mật khẩu được băm qua bcrypt.
   * Sinh token ngẫu nhiên 256-bit an toàn: `crypto.randomBytes(32).toString('base64url')`.
   * Gửi link kích hoạt tới email người dùng qua BullMQ Queue.
   * **Không trả về Access Token / Refresh Token** tại thời điểm này.
2. Khi gọi `/auth/login`:
   * Server kiểm tra cột `email_verified_at`.
   * Nếu giá trị là `null`, lập tức ném lỗi:
     ```typescript
     if (!user.emailVerifiedAt) {
       throw new ApiError(403, 'AUTH_EMAIL_NOT_VERIFIED', 'Please verify your email before logging in');
     }
     ```
   * Chặn đứng việc tạo tài khoản ảo hàng loạt để quấy phá hệ thống.

---

## 5. Tích Hợp Bảo Vệ Hai Tầng Bằng Redis Rate Limit

Toàn bộ router Auth tại [`auth.router.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/modules/auth/auth.router.ts) được bảo vệ bằng 2 tầng Rate Limiting:

```typescript
// TẦNG 1: Toàn bộ route /auth/* bị giới hạn tối đa 20 request / phút theo IP
router.use(authRateLimit); 

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);

// TẦNG 2: Riêng endpoint Quên mật khẩu & Đặt lại mật khẩu bị siết thêm tầng thứ 2:
// Tối đa 5 lượt / giờ theo IP (chống spam mail server)
router.post('/forgot-password', passwordRateLimit, forgotPassword);
router.post('/reset-password', passwordRateLimit, resetPassword);
```

---

## 6. Middleware Xác Thực Token: `authJwt`

File: [`backend/src/common/middlewares/authJwt.ts`](file:///d:/projects/persional-projects/Teamhub/backend/src/common/middlewares/authJwt.ts)

Đây là middleware gác cổng cho mọi API nghiệp vụ riêng tư của hệ thống:
1. Trích xuất token từ Header: `Authorization: Bearer <token>`.
2. Kiểm tra tính toàn vẹn và hạn dùng bằng `jwt.verify(token, env.JWT_ACCESS_SECRET)`.
3. Nếu hợp lệ: Gắn dữ liệu người dùng vào `req.user = { id: payload.sub, email: payload.email }` và gọi `next()`.
4. Nếu hết hạn: Trả về mã lỗi chuẩn `AUTH_TOKEN_EXPIRED` (HTTP 401) để Frontend bắt sự kiện và tự động kích hoạt luồng gọi API `/auth/refresh` ngầm dưới nền mà người dùng không bị văng ra ngoài.

---

## 🎯 Góc Nhìn Phỏng Vấn (Interview Cheatsheet)

### Câu hỏi 1: "Tại sao hệ thống của bạn cần cơ chế Refresh Token Rotation thay vì chỉ dùng một Access Token dài hạn?"
* **Trả lời:** "Nếu chỉ dùng một Access Token có hạn dùng dài (ví dụ 30 ngày), khi token này bị lộ qua mạng công cộng hoặc mã độc XSS, kẻ tấn công sẽ toàn quyền mạo danh người dùng trong suốt 30 ngày mà server không thể thu hồi được (do JWT là stateless). Do đó, em áp dụng mô hình Dual-Token: Access Token chỉ sống ngắn hạn (15-60 phút). Khi hết hạn, client phải dùng Refresh Token gửi lên để đổi cặp token mới. Với cơ chế **Refresh Token Rotation**, mỗi Refresh Token chỉ được dùng duy nhất 1 lần rồi bị thu hồi ngay lập tức trong database. Nếu kẻ tấn công cố dùng lại một token cũ đã thu hồi, hệ thống sẽ phát hiện dấu hiệu bất thường và khóa toàn bộ phiên."

### Câu hỏi 2: "Bạn lưu trữ Token trong cơ sở dữ liệu như thế nào để đảm bảo an toàn?"
* **Trả lời:** "Em tuyệt đối không lưu token thô (Plaintext) vào database. Trước khi ghi vào PostgreSQL, tất cả Refresh Token, Reset Password Token và Email Verification Token đều được băm bằng thuật toán **SHA-256**. Client là bên duy nhất nắm giữ token gốc. Kỹ thuật này đảm bảo nguyên tắc Zero-Knowledge: ngay cả khi hacker dump được toàn bộ cơ sở dữ liệu hoặc nhân viên quản trị database có quyền xem bảng, họ cũng không thể mạo danh bất kỳ phiên đăng nhập nào của người dùng."

👉 *Bước tiếp theo: Mời bạn mở file [`02-workspaces-and-memberships.md`](./02-workspaces-and-memberships.md) để tìm hiểu cách phân vùng dữ liệu đa người dùng (Multi-tenancy) và ma trận phân quyền RBAC.*
