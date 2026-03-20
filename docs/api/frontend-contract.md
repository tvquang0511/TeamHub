# Frontend Contract (MVP)

Tài liệu này là **hợp đồng** giữa Frontend và Backend cho giai đoạn MVP Kanban (Trello-like).

> Base URL mặc định: `/api`

---

## 0) Quy ước chung

### 0.1. Auth
- Tất cả endpoint (trừ health, auth public) dùng header:
  - `Authorization: Bearer <accessToken>`

### 0.2. Error shape (chuẩn)
Backend trả lỗi theo format:

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

### 0.3. Sorting
- `lists`: FE sort theo `position` tăng dần
- `cards`: FE sort theo `position` tăng dần

### 0.4. Position + Move contract
**Move / reorder** dùng cặp anchor `prevId` / `nextId`:
- `prevId = null` nghĩa là đưa lên đầu
- `nextId = null` nghĩa là đưa xuống cuối
- `prevId` và `nextId` đều null: backend sẽ tự chọn position “cuối list” (tùy implement), FE nên tránh.

---

## 1) Workspace

### 1.1. List my workspaces
- `GET /workspaces`

Response:
```json
{
  "workspaces": [
    { "id": "uuid", "name": "My Workspace", "role": "OWNER" }
  ]
}
```

### 1.2. Workspace detail
- `GET /workspaces/:id`

```json
{ "workspace": { "id": "uuid", "name": "My Workspace" } }
```

### 1.3. Workspace members
- `GET /workspaces/:id/members`

```json
{
  "members": [
    { "id": "uuid", "userId": "uuid", "displayName": "Quang", "role": "OWNER" }
  ]
}
```

### 1.4. Workspace member management (OWNER/ADMIN)
- `PATCH /workspaces/:id/members/:userId`

Request:
```json
{ "role": "ADMIN" }
```

Response:
```json
{
  "member": { "id": "uuid", "userId": "uuid", "displayName": "Quang", "role": "ADMIN" }
}
```

- `DELETE /workspaces/:id/members/:userId`

```json
{ "ok": true }
```

- `POST /workspaces/:id/leave`

```json
{ "ok": true }
```

> Rule: luôn phải còn **ít nhất 1 OWNER** trong workspace.

---

## 2) Users (autocomplete)

### 2.1. Search users
- `GET /users/search?q=...&workspaceId=...&limit=10`

Response:
```json
{
  "users": [
    { "id": "uuid", "email": "user@mail.com", "displayName": "User" }
  ]
}
```

- Nếu có `workspaceId`: backend có thể yêu cầu requester là member của workspace.

---

## 3) Invites (centralized)

### 3.1. Workspace invite
- Create: `POST /invites/workspaces/:workspaceId`
- List: `GET /invites/workspaces/:workspaceId`
- Revoke: `DELETE /invites/workspaces/:workspaceId/:inviteId`
- Accept: `POST /invites/:token/accept`

Create response (MVP trả token để test):
```json
{
  "invite": {
    "id": "uuid",
    "email": "invitee@mail.com",
    "token": "token",
    "expiresAt": "2026-12-31T00:00:00.000Z"
  }
}
```

### 3.2. Board invite
- Create: `POST /invites/boards/:boardId` (board ADMIN)
- List: `GET /invites/boards/:boardId` (board ADMIN)
- Revoke: `DELETE /invites/boards/:boardId/:inviteId` (board ADMIN)
- Accept: `POST /invites/boards/token/:token/accept`

Accept board invite response:
```json
{
  "board": { "id": "uuid", "name": "Board A", "workspaceId": "uuid" }
}
```

**Strict policy**:
- Token chỉ hợp lệ nếu email của user đăng nhập **trùng** `invite.email`.

**Workspace membership**:
- Khi accept board invite, backend sẽ đảm bảo user trở thành **workspace member** trước (auto-add MEMBER nếu thiếu).

---

## 4) Boards

### 4.1. List boards by workspace
- `GET /boards?workspaceId=:workspaceId`

### 4.2. Board detail (one-shot for FE)
- `GET /boards/:id/detail`

Response shape (rút gọn):
```json
{
  "board": { "id": "uuid", "name": "Board A", "workspaceId": "uuid" },
  "lists": [ { "id": "uuid", "boardId": "uuid", "name": "Todo", "position": "1024" } ],
  "cards": [ { "id": "uuid", "listId": "uuid", "title": "Card 1", "position": "1024" } ],
  "members": [ { "id": "uuid", "userId": "uuid", "displayName": "Quang", "role": "ADMIN" } ],
  "labels": [ { "id": "uuid", "name": "Bug", "color": "RED" } ]
}
```

> Lưu ý: `position` trong DB là Decimal; backend có thể trả string/number tùy serializer. FE nên treat như string và so sánh bằng `Number()` khi cần sort.

### 4.3. Board members
- `GET /boards/:id/members`
- `POST /boards/:id/members/by-email` (thêm member bằng email)

---

## 5) Lists

### 5.1. Create/list/update
- `GET /lists?boardId=:boardId`
- `POST /lists`
- `PATCH /lists/:id`

### 5.2. Move/reorder
- `POST /lists/:id/move`

Request:
```json
{ "prevId": "uuid|null", "nextId": "uuid|null" }
```

---

## 6) Cards

### 6.1. Create/list/update
- `GET /cards?listId=:listId`
- `POST /cards`
- `PATCH /cards/:id`

### 6.2. Move/reorder (within list hoặc cross-list)
- `POST /cards/:id/move`

Request:
```json
{
  "listId": "uuid (optional - to move to another list)",
  "prevId": "uuid|null",
  "nextId": "uuid|null"
}
```

---

## 7) FE implementation flows (khuyến nghị)

### 7.1. Workspace switch
1. `GET /workspaces`
2. Chọn workspaceId
3. `GET /boards?workspaceId=...`

### 7.2. Open board
1. `GET /boards/:id/detail`
2. Normalize store:
   - `listsById`, `cardsById`
   - `listIdsByBoard`, `cardIdsByList`

### 7.3. Drag & drop card
1. FE compute `{prevId, nextId}` theo UI order mới
2. Call `POST /cards/:id/move` với `listId?` nếu đổi list
3. Optimistic update + rollback nếu backend lỗi

### 7.4. Invite flows
- Workspace invite:
  - Admin tạo invite -> copy token / link
  - Invited user login đúng email -> accept
- Board invite:
  - Board admin tạo invite -> invited user accept

---

## 8) Known limitations (MVP)
- Chưa cover đầy đủ: comments/checklists/assignees/labels toggle endpoints (trừ labels list trong board detail).
- Realtime events có thể implement giai đoạn sau.
