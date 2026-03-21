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

## 2) Authentication (JWT)

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

### 5.0 Scope: workspace → board → list/card
Mọi tài nguyên (boards/lists/cards/etc.) đều thuộc về 1 `workspace`.
Authorization được xây theo 2 lớp:

- **Workspace membership**: điều kiện tối thiểu để truy cập bất kỳ board nào trong workspace.
- **Board membership**: điều kiện để thao tác *write* trong board (tạo/sửa/move list/card...), và để truy cập board `PRIVATE` (trừ các ngoại lệ nêu bên dưới).

### 5.1 Workspace boundary
Rule nền tảng:
- Mọi dữ liệu board/list/card/chat/reminder thuộc 1 workspace
- User phải là `workspace_member` mới được:
  - xem board detail
  - tạo/sửa/move card
  - join socket rooms của workspace/board
  - set reminder trên card

> Chính sách hiện tại: chỉ **workspace OWNER/ADMIN** được tạo board mới trong workspace.

### 5.2 Roles

#### Workspace roles
- `workspace_members.role = MEMBER | ADMIN | OWNER`
- **MEMBER**
  - Read workspace data (workspace detail, members list).
  - Read boards theo visibility rules.
  - Không được tạo board.
- **ADMIN**
  - Tạo board trong workspace.
  - Quản lý workspace invites / members (add/remove, change role theo policy).
- **OWNER**
  - Như ADMIN + các quyền nhạy cảm (ví dụ delete workspace) + ràng buộc “không được rời/kick nếu là OWNER cuối cùng”.

#### Board roles
- `board_members.role = MEMBER | ADMIN | OWNER`
- **MEMBER**
  - Thao tác nội dung board (write) *khi là board member*.
  - Có thể rời board.
- **ADMIN**
  - Update board settings, quản lý board members.
  - Quản lý board invites.
- **OWNER**
  - Như ADMIN + ràng buộc “board phải luôn có ít nhất 1 OWNER”.

> Lưu ý: backend hiện đang enforce write-operations của list/card yêu cầu **board membership**.

### 5.3 Board visibility & read-only policies

#### Visibility values
- `boards.visibility = PRIVATE | WORKSPACE`

#### WORKSPACE boards
- Mọi `workspace_member` có thể **read** (get/list/detail).
- Nếu user **không phải** `board_member`:
  - **read-only**: mọi write APIs (create/update/move/delete list/card) bị từ chối với `403 BOARD_FORBIDDEN`.

#### PRIVATE boards
- Mặc định: chỉ `board_member` mới có thể read/detail.
- **Option B (current policy)**: `workspace OWNER/ADMIN` có thể **read-only** PRIVATE boards ngay cả khi không phải `board_member`.
  - Lưu ý: write APIs vẫn yêu cầu `board_member`, do đó admin override chỉ cho *read*.
  - Phạm vi read-only override bao gồm:
    - `GET /boards/:id` / `GET /boards/:id/detail`
    - `GET /lists?boardId=...`, `GET /lists/:id`
    - `GET /cards?listId=...`, `GET /cards/:id`

#### Company safety: delete board
- `workspace OWNER/ADMIN` có thể **xóa/archived** bất kỳ board nào trong workspace (kể cả `PRIVATE` và họ không là board member).
- Mục đích: xử lý tình huống “nổi loạn trong công ty”, dọn dẹp board vi phạm, hoặc incident response.
- Khuyến nghị: bổ sung audit log cho thao tác này (phase sau).

Khuyến nghị vận hành:
- Nếu áp dụng Option B, nên bổ sung **audit log** cho các lần admin đọc PRIVATE board (phase sau).

### 5.3 Invite acceptance

TeamHub có 2 loại invite token:

- `workspace_invites`: mời user vào workspace
- `board_invites`: mời user vào board

**Token là một secret ngẫu nhiên** đại diện cho lời mời (thường được gửi qua email/deep link).

Quy tắc accept (high-level):
- Token hợp lệ, chưa hết hạn, chưa accepted
- User phải đăng nhập (JWT) và **email phải trùng với email trong invite**
- Nếu user đã là member tương ứng → trả conflict

Board invite accept:
- Khi accept board invite, backend đảm bảo user có workspace membership (auto-add MEMBER nếu cần) rồi mới thêm board membership.

### 5.4 Invite UX recommendation (frontend)

Mục tiêu: người dùng click link invite và vào đúng nơi.

Khuyến nghị flow:
1) Link dạng:
  - Board: `/invite/board/:token`
  - Workspace: `/invite/workspace/:token`
2) Nếu chưa login: redirect `/login?next=<inviteUrl>`
3) Sau login: gọi endpoint accept
  - Board: `POST /invites/boards/token/:token/accept`
  - Workspace: `POST /invites/:token/accept`
4) Thành công: invalidate cache + redirect vào board/workspace.

Note về preview invite:
- Hiện tại backend giới hạn các endpoint lookup token (preview) khá chặt. Nếu cần trang preview đẹp “Bạn được mời vào board X”, có thể:
  - thêm endpoint preview public trả về thông tin tối thiểu (không lộ PII), hoặc
  - nới policy read preview cho người đã login (nhưng chưa là member).

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