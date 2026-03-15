# TeamHub — Full Product Specification for Figma Make (GUI/UX Design)
Ngày: 2026-03-15  
Nguồn tổng hợp: `README.md`, `overview.md`, `endpoints.md`, `errors.md`, `security.md`, `realtime-events.md`, `deployment.md`, `epics.md`, `tasks-*.md`, `schema-notes.md` + các diagram PlantUML.

Mục tiêu của tài liệu này: mô tả **đầy đủ màn hình + luồng + hành vi + trạng thái UI** để Figma Make có thể tạo **GUI design** (wireframe → UI) cho TeamHub.

---

## 0) One-liner, scope & nguyên tắc
**TeamHub** là ứng dụng web quản lý công việc kiểu **Trello-like Kanban** theo **Workspace**, có:
- Kanban: Board / List / Card, drag-drop reorder/move theo **position float**
- **Realtime**: Socket.IO để đồng bộ thay đổi giữa nhiều người dùng
- **Chat chung**: 1 box chat / workspace
- **Email reminder (SMTP)**: mỗi user **tự đặt reminder cho card**, chỉ gửi email cho user đó
- Auth: JWT access token + refresh token (rotate + revoke)

### In-scope (MVP)
- Auth: register/login/refresh/logout, `/me`
- Workspace: create/list/detail, members, invite via email + accept token, role (OWNER/ADMIN/MEMBER)
- Kanban: board detail one-shot payload, CRUD board/list/card, archive board/list/card
- Card detail: members, labels, checklist, comments, reminders
- Realtime: join rooms + events tối thiểu (board + chat)
- Worker: poll reminder_jobs và gửi SMTP
- Error format + codes chuẩn hóa

### Out-of-scope (hoặc Phase 2)
- Redis adapter + cache board detail + rate limit chat
- RabbitMQ event bus
- Advanced permission per-board, multi-room chat, DM
- Full-text search, analytics, billing

### Design principle (UI)
- “Giống Trello”: **board view dạng columns**, card mở **modal** (desktop) / **full page** (mobile)
- Ưu tiên **archive** thay vì delete cứng
- Tất cả thao tác cần phản hồi nhanh: optimistic UI + rollback khi lỗi
- Mọi dữ liệu bị giới hạn theo **workspace boundary** (member mới xem)

---

## 1) Actors, Roles & Permission UI
### Actors
- Guest
- User (đã login)
- Workspace Member
- Workspace Admin/Owner
- Worker Service (không có UI, chỉ background)

### Workspace roles
- OWNER: quản trị workspace + invites + đổi role + remove member
- ADMIN: invites + (tuỳ) đổi role member
- MEMBER: thao tác kanban/chat/reminder

### Permission UX rules
- Nếu user không phải member workspace → redirect sang workspace list + toast “Bạn không có quyền truy cập”
- UI actions theo role:
  - “Members / Invite / Change role” chỉ hiện với OWNER/ADMIN
  - API trả 403 → show “Bạn không có quyền thực hiện hành động này”

---

## 2) App Information Architecture (Sitemap / Navigation)
### Routes (khuyến nghị)
- `/login`
- `/register`
- `/invites/:token` (accept invite flow)
- `/app` (shell)
  - Workspace switcher (dropdown)
  - Workspace home:
    - `/app/workspaces` (list)
    - `/app/workspaces/:workspaceId/boards` (board list)
    - `/app/workspaces/:workspaceId/chat`
    - `/app/workspaces/:workspaceId/members` (admin/owner)
    - `/app/workspaces/:workspaceId/settings` (admin/owner)
  - Board:
    - `/app/boards/:boardId` (kanban)
    - Card detail modal từ board, deep link:
      - `/app/cards/:cardId` (optional route để share/open directly)

### Global layout
- Topbar:
  - Workspace switcher
  - Search (phase 2)
  - User menu (profile/logout)
- Sidebar (optional):
  - Boards
  - Chat
  - Members (if admin/owner)
  - Settings (if admin/owner)

---

## 3) Data model (UI vocabulary)
### Core entities
- User: id, email, displayName, avatar
- Workspace: id, name
- WorkspaceMember: userId, role
- Invite: email, expiresAt, acceptedAt (token-based)
- Board: name, description, archivedAt, position
- List: name, position, archivedAt
- Card: title, description, position, dueAt, archivedAt
- Labels: (scope workspace/board theo bạn; spec hiện dùng “workspace labels” trong endpoints payload)
- CardAssignees (members)
- Checklist + items
- Comments
- ChatMessage
- ReminderJob: remindAt, status (PENDING/SENT/CANCELED/FAILED), attempts, lastError (worker)

---

## 4) API contract summary (để thiết kế form + states)
> Convention: Nginx proxy `/api/*` → backend `/*` (backend routes không include `/api`)

### Auth endpoints
- `POST /auth/register` {email,password,displayName}
- `POST /auth/login` {email,password} → {accessToken,refreshToken,user}
- `POST /auth/refresh` {refreshToken} → {accessToken,refreshToken}
- `POST /auth/logout` {refreshToken} → {ok:true}
- `GET /me` (Bearer) → {user}

### Workspace endpoints
- `POST /workspaces` {name}
- `GET /workspaces` → list + role
- `GET /workspaces/:id`
- `GET /workspaces/:id/members`
- `POST /workspaces/:id/invites` {email,expiresAt}
- `POST /invites/:token/accept`

### Chat
- `GET /workspaces/:id/messages?cursor=...` → {messages,nextCursor}

### Kanban
- `POST /workspaces/:wid/boards`
- `GET /boards/:bid` → one-shot payload {board,lists,cards,labels,members}
- `POST /boards/:bid/lists`
- `PATCH /lists/:lid`
- `POST /lists/:lid/cards`
- `PATCH /cards/:cid`
- `POST /cards/:cid/move` {toListId,prevCardId,nextCardId}

### Card detail
- `POST /cards/:cid/comments` {content}

### Reminders
- `PUT /cards/:cid/reminders` {remindAt}
- `DELETE /cards/:cid/reminders/:reminderJobId`
- `GET /cards/:cid/reminders`

---

## 5) Error response & UX mapping
### Standard error response
```json
{
  "error": { "code": "SOME_CODE", "message": "Human readable", "details": {} }
}
```

### UX guidelines by status
- 400/VALIDATION_ERROR: show inline field errors + toast
- 401: redirect login + “Phiên đăng nhập hết hạn”
- 403: toast “Bạn không có quyền”
- 404: show Not Found screen (workspace/board/card)
- 409: show “Đã tồn tại/Conflict” (email exists, already member, reminder duplicate)

### Notable error codes to support in UI
- Auth: `AUTH_INVALID_CREDENTIALS`, `AUTH_EMAIL_EXISTS`, `AUTH_TOKEN_EXPIRED`, `AUTH_REFRESH_REVOKED`
- Workspace: `WORKSPACE_FORBIDDEN`, `WORKSPACE_INVITE_EXPIRED`, `WORKSPACE_ALREADY_MEMBER`, `WORKSPACE_OWNER_REQUIRED`
- Kanban: `POSITION_INVALID_CONTEXT`
- Chat: `CHAT_CONTENT_EMPTY`, `CHAT_RATE_LIMITED`
- Reminder: `REMINDER_TIME_IN_PAST`, `REMINDER_DUPLICATE`, `REMINDER_NOT_FOUND`

---

## 6) Realtime (Socket.IO) — UX behaviors
### Auth & joining rooms
- On socket connect: send JWT access token (handshake)
- Client emits:
  - `workspace:join {workspaceId}`
  - `board:join {boardId}`
- Server checks membership trước khi join room.

### Rooms
- `workspace:{workspaceId}`: chat + (optional) workspace-level events
- `board:{boardId}`: kanban events

### Client → Server
- `workspace:join`
- `board:join`
- `chat:send {workspaceId,content}`

### Server → Client (minimum)
- `chat:new_message {message}`
- `board:list_created {list}`
- `board:list_updated {list}`
- `board:list_reordered {listId,position}`
- `board:card_created {card}`
- `board:card_updated {card}`
- `board:card_moved {cardId,fromListId,toListId,position}`
- `board:comment_added {comment}`
- `board:rebalance_done {listId}` (optional)

### UX rules
- Realtime events update state ngay, không cần refresh.
- Nếu mất sync: show “Reconnecting…” + button “Reload board”.

---

## 7) Position float ordering — UX notes for drag & drop
### Rule (for designer awareness)
- List/Card có `position` float:
  - chèn giữa: `(prev + next)/2`
  - đầu: `next/2`
  - cuối: `prev + 1024`
  - list rỗng: `1024`
- Khi gap nhỏ → rebalance (server), UI có thể nhận event `board:rebalance_done`.

### Drag/drop UI requirements
- Placeholder khi kéo
- Auto-scroll khi kéo sát mép
- “Drop indicator” rõ ràng
- Optimistic update: card nhảy sang list mới ngay, nếu API fail thì revert + toast

---

# 8) Screens — Detailed UI Specification (Figma Make input)

## 8.1 Guest / Auth

### Screen A1 — Login
**Purpose:** user login nhận access/refresh tokens.  
**Components:**
- Logo + app name
- Input: Email
- Input: Password (show/hide)
- Button: “Đăng nhập”
- Link: “Chưa có tài khoản? Đăng ký”
**States:**
- Loading: disable button + spinner
- Error:
  - `AUTH_INVALID_CREDENTIALS`: “Email hoặc m��t khẩu không đúng”
  - network: “Không kết nối được máy chủ”
**Success:** redirect `/app/workspaces`.

### Screen A2 — Register
**Fields:**
- Email
- Password (min 8)
- Display name
- CTA: “Tạo tài khoản”
**Errors:**
- `AUTH_EMAIL_EXISTS` (409): “Email đã tồn tại”
- Validation error: highlight field

### Screen A3 — Invite Accept (`/invites/:token`)
**Purpose:** join workspace via token.  
**UI:**
- Card: workspace name (nếu API cho preview) hoặc loading
- CTA: “Chấp nhận lời mời”
**States:**
- Invalid/expired: show error + link login/register
- If not logged-in: prompt login/register then continue accept

---

## 8.2 App Shell (after login)

### Screen S1 — App Shell Layout
**Topbar**
- Workspace switcher dropdown
- (Optional) global quick create button
- User menu: avatar + displayName
  - Logout
**Main content**
- Routed screens: workspace list/boards/board/chat/members/settings

---

## 8.3 Workspace

### Screen W1 — My Workspaces (list)
**Data:** `GET /workspaces`  
**UI:**
- Header: “Workspaces”
- CTA: “Create workspace”
- List/grid cards:
  - name
  - role badge (OWNER/ADMIN/MEMBER)
**Empty state:** “Bạn chưa có workspace nào. Tạo workspace đầu tiên?”

### Screen W2 — Create Workspace (modal/page)
**Fields:**
- Name (required)
**Actions:**
- Create / Cancel
**Errors:**
- Validation: name empty

### Screen W3 — Workspace Boards (board list)
**Data:** boards of workspace (có thể từ endpoint riêng hoặc aggregated trong tương lai)  
**UI:**
- Header: workspace name
- Boards grid:
  - board name
  - archived badge (nếu show)
- CTA: “Create board”
**Empty state:** “Chưa có board nào.”

### Screen W4 — Workspace Members (admin/owner)
**Data:** `GET /workspaces/:id/members`  
**UI components:**
- Table columns: Member (avatar + displayName + email), Role dropdown (if allowed), Actions (remove)
- CTA: “Invite member”
**Invite modal:**
- Email
- ExpiresAt (default 7 days)
- Send invite
**Errors:**
- `WORKSPACE_ALREADY_MEMBER` (409)
- `WORKSPACE_FORBIDDEN` (403)

### Screen W5 — Workspace Chat
**Data:**
- history: `GET /workspaces/:id/messages?cursor=...`
- realtime: socket join + `chat:new_message`
**UI:**
- Messages list (infinite scroll)
- Composer:
  - textarea
  - send button
- Message item:
  - avatar, displayName, timestamp, content
**States:**
- Not member: block + error
- Rate limited (429): show cooldown message

---

## 8.4 Board (Kanban)

### Screen B1 — Board View (Kanban)
**Data:** `GET /boards/:bid` returns `{board,lists,cards,labels,members}`  
**UI:**
- Board header:
  - Board name (editable inline)
  - (Optional) board menu: archive
- Lists horizontal:
  - Each list column:
    - title (editable)
    - list menu: archive
    - cards sorted by `position`
    - “Add card” inline composer
- Button “Add list” at end

**Drag & drop:**
- Reorder lists (client sends reorder event/endpoint - nếu chưa có endpoint, UI vẫn thiết kế)
- Move card:
  - on drop call `POST /cards/:cid/move`
  - optimistic update + rollback on fail (`POSITION_INVALID_CONTEXT`)

**Archived behavior:**
- Default hide archived cards/lists
- Optional “Show archived” in board menu

---

## 8.5 Card Detail (Modal / Page)

### Screen C1 — Card Detail Modal
**Open from:** click card on board.  
**Layout (Trello-like):**
- Header:
  - Editable title
  - Close button
  - (Optional) breadcrumbs
- Main (left):
  1) Description
  2) Checklists
  3) Comments + Activity (tabs recommended)
- Sidebar (right actions):
  - Members
  - Labels
  - Due date (optional)
  - Reminders (required)
  - Archive card

#### Section: Members
- Button “Add member”
- Picker modal:
  - search in workspace members
  - add/remove (toggle)
- On card view show avatars

#### Section: Labels
- Label chips list
- “Edit labels” drawer/modal:
  - list labels + color preview
  - attach/detach label

#### Section: Checklists
- Add checklist (title)
- For each checklist:
  - progress bar (done/total)
  - add item input
  - toggle checkbox
  - (optional) reorder items

#### Section: Comments
- composer
- comment list sorted by time
- On submit call `POST /cards/:cid/comments`
- Realtime: handle `board:comment_added`

#### Section: Reminders (per-user)
**Data:**
- `GET /cards/:cid/reminders` (for current user)
- `PUT /cards/:cid/reminders` (set)
- `DELETE /cards/:cid/reminders/:reminderJobId` (cancel)
**UI:**
- Datetime picker
- CTA “Set reminder”
- List reminders:
  - remindAt
  - status badge (PENDING/SENT/CANCELED/FAILED)
  - action: cancel (only if PENDING)
**Errors:**
- `REMINDER_TIME_IN_PAST` (400)
- `REMINDER_DUPLICATE` (409)
**UX copy:** “Chỉ bạn nhận email nhắc nhở này.”

---

## 8.6 Settings / Profile

### Screen P1 — User Menu / Logout
- Show displayName/email
- Action: logout (calls `/auth/logout` + clear tokens)

---

# 9) UI States Matrix (global)
### Loading states
- Full-screen skeleton for Board detail fetch
- Inline spinners for create list/card, sending message, setting reminder

### Empty states
- No workspace
- No boards
- No lists in board
- No cards in list
- No chat messages
- No comments
- No reminders set yet

### Error states
- Token expired (401): auto refresh; nếu refresh fail → login
- Forbidden (403): show access denied
- Not found (404): workspace/board/card not found
- Conflict (409): show friendly message

---

# 10) Copy & micro-interactions (recommended)
- Toast: “Đã tạo card”, “Đã di chuyển card”, “Đã gửi lời mời”
- Confirm dialog:
  - Archive board/list/card
  - Remove member
- Presence indicator (optional): “Reconnecting…”
- Time formatting: relative (e.g. “2 phút trước”) + hover full timestamp

---

# 11) Security & token storage (for UX constraints)
- Access token TTL ngắn (e.g. 15m)
- Refresh token dài (7–30d), rotate on refresh, revoke on logout
- UI should:
  - silently refresh access token when needed
  - if refresh revoked/expired → show login screen

---

# 12) Deployment constraints affecting UI
- Single origin via Nginx:
  - `/` frontend
  - `/api/*` backend
  - `/socket.io/*` websocket
- UI nên dùng base URL tương đối (relative) để chạy được dev/prod.

---

# 13) Deliverables for Figma Make
Figma Make cần tạo:
1. Auth screens: Login, Register, Invite Accept
2. App shell + Workspace switcher
3. Workspace list + Create workspace modal
4. Workspace boards list + Create board modal
5. Board view (kanban) + Add list + add card + drag states
6. Card detail modal (members, labels, checklist, comments, reminders, archive)
7. Workspace chat screen
8. Members management screen + Invite modal

---

## 14) Appendix — Realtime contract (verbatim)
- `workspace:join { workspaceId }`
- `board:join { boardId }`
- `chat:send { workspaceId, content }`
- `chat:new_message { message }`
- `board:list_created { list }`
- `board:list_updated { list }`
- `board:list_reordered { listId, position }`
- `board:card_created { card }`
- `board:card_updated { card }`
- `board:card_moved { cardId, fromListId, toListId, position }`
- `board:comment_added { comment }`
- `board:rebalance_done { listId }` (optional)