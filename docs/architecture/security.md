# TeamHub — Security Architecture

## 1) Threat model (tối thiểu)
- Token bị leak (access/refresh)
- User cố truy cập workspace/board/card không thuộc về họ
- Socket.IO join room trái phép để nghe event
- Spam chat / abuse
- CSRF (nếu lưu token bằng cookie) hoặc XSS (nếu lưu token localStorage)

MVP ưu tiên:
- Authorization đúng (workspace membership)
- Refresh token revoke/rotate
- Socket auth + room join check

---

## 2) JWT Strategy

### 2.1 Access token
- TTL ngắn: 10–20 phút (ví dụ 15m)
- Payload gợi ý:
  - `sub` = userId
  - `email` (optional)
  - `iat`, `exp`
- Dùng để auth cho REST + Socket handshake.

### 2.2 Refresh token
- TTL dài: 7–30 ngày (tuỳ bạn)
- **Không lưu plain refresh token trong DB**.
- Lưu vào DB: `tokenHash`, `expiresAt`, `revokedAt` (nullable), `userId`.
- Client giữ refresh token để gọi `/auth/refresh`.

### 2.3 Storage on client (khuyến nghị)
Bạn có 2 hướng:

**Option A (đơn giản, phổ biến trong đồ án):**
- Access token: memory (state)
- Refresh token: httpOnly cookie (tốt hơn), hoặc localStorage (dễ nhưng kém an toàn hơn)
- Khi access expired: gọi refresh để lấy access mới.

**Option B (cookie-based):**
- Cả access và refresh lưu cookie httpOnly + SameSite
- Backend set cookie; frontend chỉ gọi API.
- Phức tạp hơn vì CORS/cookie policy.

MVP: bạn có thể làm A trước, sau đó nâng cấp.

---

## 3) Refresh rotation + revoke

### 3.1 Rotation (khuyến nghị)
Luồng:
1. Client gửi refresh token -> `/auth/refresh`
2. Server:
   - verify signature + exp
   - hash token, tìm DB row `refresh_tokens` tương ứng còn hiệu lực
   - tạo refresh token mới
   - revoke token cũ (`revokedAt=now`)
   - insert token mới (hoặc update row)
3. Trả về access mới + refresh mới

Lợi ích: nếu refresh bị lộ, attacker bị "đá" sau lần rotate.

### 3.2 Logout
- `/auth/logout` nhận refresh token hiện tại
- hash và set revokedAt nếu tồn tại
- Nếu bạn dùng cookie: clear cookie

---

## 4) Socket.IO authentication

### 4.1 Handshake auth
Khuyến nghị truyền access token:
- `auth: { token: "<accessToken>" }` khi connect socket
hoặc
- `extraHeaders: Authorization: Bearer ...` (tuỳ client)

Server middleware:
- verify access token
- gắn `socket.data.user = { id, ... }`

### 4.2 Room join authorization (bắt buộc)
Ngay cả khi socket đã auth user, bạn vẫn phải check permission khi join:

- `workspace:join { workspaceId }`
  - check user là member workspace
  - join `workspace:{workspaceId}`

- `board:join { boardId }`
  - resolve board -> workspaceId
  - check membership workspace
  - join `board:{boardId}`

### 4.3 Emit events: scope đúng room
- Board events -> `board:{boardId}`
- Chat -> `workspace:{workspaceId}`
- Không emit global broadcast trừ khi thật sự cần

---

## 5) Authorization rules (permission model)

### 5.1 Workspace boundary
Rule nền tảng:
- Mọi dữ liệu board/list/card/chat/reminder thuộc 1 workspace
- User phải là `workspace_member` mới được:
  - xem board detail
  - tạo/sửa/move card
  - join socket rooms của workspace/board
  - set reminder trên card

### 5.2 Roles
- MEMBER:
  - thao tác kanban + chat + reminder
- ADMIN/OWNER:
  - mời member
  - đổi role (tuỳ triển khai)
- OWNER:
  - đảm bảo workspace luôn còn >= 1 OWNER (constraint logic ở service)

### 5.3 Invite acceptance
- Token hợp lệ và chưa hết hạn, chưa accepted
- Nếu email người nhận đã là member -> conflict

---

## 6) Data validation & output encoding
- Validate input (Zod/Joi)
- Chat content/comment content:
  - backend: enforce length + non-empty
  - frontend: encode/escape khi render (tránh XSS)
- Logging:
  - không log token plain
  - redact Authorization headers

---

## 7) Rate limiting (phase 2)
- REST: rate limit basic (IP/user)
- Chat: rate limit per (userId, workspaceId) qua Redis
- Socket: limit events per second per socket

---

## 8) Checklist Security DoD
- [ ] Access token TTL ngắn
- [ ] Refresh token hashed in DB + revoke on logout
- [ ] Refresh rotation on refresh
- [ ] Socket auth middleware verifies JWT
- [ ] join room checks membership
- [ ] All APIs check workspace membership (service-level)