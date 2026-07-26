# TeamHub — Trello-like Kanban + Chat realtime theo Board + Email Reminder (SMTP)

> Mục tiêu đồ án: Xây dựng một ứng dụng web quản lý công việc kiểu Trello (Kanban) với mức độ giống Trello “nhiều nhất có thể”, có **realtime** (Socket.IO) để đồng bộ thay đổi ngay lập tức giữa nhiều người dùng, có **chat** theo **Board** (mỗi board 1 box chat) để luyện WebSocket/Socket.IO, và có **nhắc nhở qua email** (SMTP) theo **reminder do từng người dùng tự đặt**.

---

## 1. Tổng quan hệ thống

### 1.1. Công nghệ dự kiến
- Frontend: **ReactJS** + **TailwindCSS**
- Backend API: **NodeJS (Express)** + **TypeScript**
- ORM/DB: **Prisma** + **PostgreSQL**
- Realtime: **Socket.IO**
- Cache/đồng bộ realtime nhiều instance (giai đoạn nâng cao): **Redis**
- Message queue / xử lý bất đồng bộ (giai đoạn nâng cao): **BullMQ (Redis-based)**
- Email: **SMTP** (Nodemailer)
- Deploy local: **Docker + docker-compose**

### 1.2. Phạm vi (scope) đã chốt
- Chat: **đơn giản** — mỗi Board có **1 box chat** cho các thành viên của board đó.
- Kanban: tập trung làm **giống Trello** (board/list/card/drag-drop/labels/members/checklists/comments/activity).
- Reminder: **chỉ gửi email cho người dùng nào tự set reminder**, không gửi cho tất cả assignee.

---

## 2. Định nghĩa thuật ngữ
- **Workspace**: không gian làm việc, gồm thành viên và nhiều board.
- **Board**: bảng kanban (Trello board).
- **List**: cột trong board (To Do / Doing / Done…).
- **Card**: thẻ công việc trong list.
- **Position float**: kỹ thuật lưu thứ tự bằng số thực (float) để chèn giữa hai phần tử mà không phải reindex thường xuyên.
- **Archive**: “ẩn khỏi luồng chính” nhưng vẫn giữ dữ liệu (Trello thường archive thay vì xóa).
- **Reminder**: nhắc nhở email tại thời điểm `remindAt` do user tự đặt cho card.

---

## 3. Actors & quyền hạn (Authorization)

### 3.1. Actors
- **Guest**: chưa đăng nhập.
- **User**: đã đăng nhập.
- **Workspace Member**: user thuộc workspace.
- **Workspace Admin/Owner**: có quyền quản lý workspace (mời người, phân quyền…).
- **Worker Service**: tiến trình nền gửi email reminder.

### 3.2. Quyền (tối thiểu)
- Chỉ **member** mới xem/ thao tác dữ liệu trong workspace.
- **Owner/Admin** có quyền:
  - mời thành viên
  - đổi role thành viên (tùy mức bạn làm)
- Board privacy (mô hình “workspace = công ty, board = phòng ban”):
  - Board `PRIVATE`: chỉ **board members** mới xem/ thao tác lists/cards/chat.
  - Board `WORKSPACE`: workspace members có thể **thấy board**, nhưng (khuyến nghị) chat + write vẫn yêu cầu board membership.

---

## 4. Đặc tả chức năng chi tiết (Functional Specification)

> Phần này được viết theo kiểu “đọc là biết phải làm gì”.  
> Mỗi chức năng đều có: Mô tả, Input/Output, Luồng chính, Lỗi/edge cases, Realtime event (nếu có).

### 4.1. Authentication (JWT)

#### 4.1.1. Đăng ký (Register)
- **Mục tiêu**: tạo tài khoản bằng email + mật khẩu.
- **Input**:
  - email (bắt buộc, đúng định dạng)
  - password (bắt buộc, tối thiểu độ dài ví dụ 8)
  - displayName (bắt buộc)
- **Xử lý**:
  1. Kiểm tra email chưa tồn tại.
  2. Hash mật khẩu (bcrypt).
  3. Tạo user.
- **Output**:
  - user info cơ bản (id, email, displayName)
- **Lỗi**:
  - email đã tồn tại
  - password không đủ mạnh (tùy rule)

#### 4.1.2. Đăng nhập (Login)
- **Mục tiêu**: cấp **access token** + **refresh token**.
- **Input**: email, password
- **Xử lý**:
  1. Xác thực password.
  2. Cấp:
     - Access token (ví dụ 15 phút)
     - Refresh token (ví dụ 7–30 ngày), lưu DB dạng hash để revoke.
- **Output**:
  - accessToken
  - refreshToken
  - user info
- **Lỗi**:
  - sai email/password

#### 4.1.3. Refresh token
- **Mục tiêu**: lấy access token mới khi access token hết hạn.
- **Input**: refreshToken
- **Xử lý**:
  - kiểm tra refresh token còn hạn, chưa bị revoke.
  - (khuyến nghị) rotate refresh token.
- **Output**:
  - accessToken mới (và refreshToken mới nếu rotate)
- **Lỗi**:
  - refresh token hết hạn / không hợp lệ / revoked

#### 4.1.4. Logout
- **Mục tiêu**: đăng xuất bằng cách revoke refresh token.
- **Input**: refreshToken
- **Output**: OK
- **Lỗi**:
  - refresh token không tồn tại

---

### 4.2. Workspace & Membership

#### 4.2.1. Tạo Workspace
- **Input**: name
- **Xử lý**:
  1. Tạo workspace.
  2. Tạo membership cho người tạo với role = OWNER.
- **Output**: workspace object
- **Lỗi**: name rỗng

#### 4.2.2. Xem danh sách Workspace của tôi
- **Input**: access token
- **Output**: list workspace mà user là member

#### 4.2.3. Mời thành viên qua email (Invite)
- **Ai được làm**: OWNER/ADMIN
- **Input**:
  - workspaceId
  - email người được mời
  - expiresAt (ví dụ 7 ngày)
- **Xử lý**:
  1. Kiểm tra quyền.
  2. Nếu email đã là member -> báo đã là thành viên.
  3. Tạo invite token duy nhất.
  4. Gửi email chứa link accept (ví dụ `/invites/{token}`).
- **Output**: invite info (ẩn token nếu muốn)
- **Lỗi/Edge**:
  - email đã là member
  - invite đã tồn tại và còn hạn (có thể resend)

#### 4.2.4. Accept invite
- **Input**: token
- **Xử lý**:
  1. Kiểm tra token tồn tại, chưa hết hạn, chưa accepted.
  2. Nếu user chưa có account -> tùy bạn: yêu cầu đăng ký trước hoặc tạo flow đăng ký.
  3. Tạo WorkspaceMember role = MEMBER.
  4. Set acceptedAt.
- **Output**: workspace info
- **Lỗi**:
  - token không hợp lệ/hết hạn/đã dùng

#### 4.2.5. Quản lý role (tùy mức)
- **Ai được làm**: OWNER (hoặc ADMIN)
- **Input**: memberId, role mới
- **Rule**:
  - Ít nhất phải còn 1 OWNER trong workspace.
- **Output**: member updated

---

### 4.3. Chat realtime theo Workspace (Socket.IO)

#### 4.3.1. Kết nối socket & join workspace room
- **Mục tiêu**: client kết nối socket kèm JWT để xác thực.
- **Luồng**:
  1. Client connect Socket.IO với access token (handshake).
  2. Client emit `workspace:join { workspaceId }`.
  3. Server kiểm tra user có là member workspace không.
  4. Server join room: `workspace:{workspaceId}`.
- **Output**:
  - ack OK hoặc error.
- **Lỗi**:
  - token invalid
  - user không thuộc workspace

#### 4.3.2. Gửi tin nhắn (chat:send)
- **Input**: `workspaceId`, `content`
- **Xử lý**:
  1. Validate content (không rỗng, giới hạn độ dài).
  2. Insert vào bảng WorkspaceMessage.
  3. Emit event tới room workspace.
- **Realtime event**:
  - Server emit `chat:new_message` payload:
    - messageId, workspaceId, senderId, content, createdAt, senderDisplayName
- **Edge**:
  - rate limit (nâng cao: dùng Redis)

#### 4.3.3. Tải lịch sử chat (REST)
- **Input**:
  - workspaceId
  - cursor/offset (khuyến nghị cursor theo createdAt + id)
- **Output**:
  - messages (mới nhất trước hoặc cũ nhất trước tùy UI)
  - nextCursor

---

### 4.4. Kanban (Trello-like)

> Tất cả reorder/move sử dụng **position float**.

#### 4.4.1. Quy tắc `position float` (giống Trello)
- Mỗi List/Card/Checklist/Item có trường `position` kiểu float.
- Khi chèn giữa hai phần tử:
  - `newPos = (prev.position + next.position) / 2`
- Nếu kéo lên đầu:
  - `newPos = next.position / 2`
- Nếu kéo xuống cuối:
  - `newPos = prev.position + 1024`
- Nếu danh sách rỗng:
  - `newPos = 1024`
- **Rebalance**:
  - Nếu khoảng cách giữa `prev` và `next` quá nhỏ (ví dụ `< 1e-7`) thì chạy rebalance:
    - set lại position theo bước 1024: 1024, 2048, 3072...
  - Rebalance có thể làm async (đẩy job), nhưng MVP có thể làm sync nếu list ít.

---

## 4.4.2. Board

### Tạo Board
- **Input**: workspaceId, name, description?
- **Xử lý**:
  1. check membership
  2. tạo board position mặc định (hoặc theo cuối danh sách)
- **Output**: board
- **Realtime**:
  - emit `board:created` đến workspace room (tùy bạn, hoặc chỉ khi đang mở workspace)

### Xem Board detail
- **Output** (khuyến nghị 1 API trả đủ):
  - board info
  - lists trong board (sorted by position, chưa archived)
  - cards trong từng list (sorted by position, chưa archived)
  - labels workspace (để gán)
  - members workspace (để assign)
- **Gợi ý hiệu năng**:
  - cache board detail bằng Redis (giai đoạn 2)

### Archive Board
- set `archivedAt = now()`

---

## 4.4.3. List

### Tạo List
- **Input**: boardId, name
- **Position**:
  - list mới ở cuối: lấy max position + 1024
- **Realtime event**:
  - `board:list_created` đến room `board:{boardId}`

### Update List (rename)
- **Input**: listId, name
- **Realtime**:
  - `board:list_updated`

### Reorder List (drag)
- **Input**:
  - boardId
  - listId
  - prevListId?, nextListId?
- **Xử lý**:
  - tính `position float` theo prev/next
- **Realtime**:
  - `board:list_reordered`

### Archive List
- set `archivedAt`

---

## 4.4.4. Card

### Tạo Card
- **Input**: listId, title
- **Position**:
  - card mới ở cuối list: max position + 1024
- **Output**: card
- **Realtime**:
  - `board:card_created` (boardId lấy từ list/board)

### Update Card fields
- **Input**: cardId, patch fields
  - title, description, dueAt
  - archivedAt (archive/unarchive)
- **Realtime**:
  - `board:card_updated`

### Move/Reorder Card (xương sống Trello)
- **Input**:
  - cardId
  - toListId
  - prevCardId?, nextCardId?
- **Xử lý**:
  1. check user là member workspace
  2. tính newPosition theo prev/next trong `toListId`
  3. update `card.listId`, `card.position`
  4. nếu gap quá nhỏ -> rebalance list
- **Realtime**:
  - `board:card_moved` payload:
    - cardId, fromListId, toListId, newPosition

### Gán assignees
- **Input**: cardId, userId (member của workspace)
- **Xử lý**: upsert CardAssignee
- **Realtime**: `board:card_updated` hoặc `board:card_assignees_updated`

### Gán labels
- **Input**: cardId, labelId (thuộc workspace)
- **Xử lý**: attach/detach CardLabel
- **Realtime**: `board:card_updated` hoặc `board:card_labels_updated`

### Comments
- **Input**: cardId, content
- **Xử lý**:
  - insert CardComment
- **Realtime**:
  - `board:comment_added`

### Checklist
- Tạo checklist: title, position
- Tạo item: title, position
- Toggle done: `isDone`
- Reorder checklist/items: position float
- **Realtime**:
  - `board:card_updated` hoặc event riêng

---

### 4.5. Activity Log (giống Trello)
- **Mục tiêu**: card/board hiển thị “ai làm gì, lúc nào”.
- **Các event tối thiểu cần log**:
  - card created
  - card moved (from list -> to list)
  - dueAt changed
  - comment added
  - assignee added/removed
  - label added/removed
- **Thiết kế**:
  - Có thể ghi trực tiếp khi xử lý API (MVP)
  - Nâng cao: publish event sang BullMQ, worker ghi activity async.

---

### 4.6. Reminder Email (SMTP) — per-user

#### 4.6.1. Set reminder
- **Ai được làm**: member workspace (có quyền xem card)
- **Input**:
  - cardId
  - remindAt (datetime, phải > now)
- **Xử lý**:
  1. validate remindAt > now
  2. tạo ReminderJob:
     - cardId, userId, remindAt
     - status = PENDING
- **Output**:
  - reminder job info
- **Edge**:
  - nếu tạo trùng (same cardId,userId,remindAt) -> trả về đã tồn tại
  - nếu user muốn “chỉ có 1 reminder/card” thì implement rule: xóa job cũ trước khi tạo (tùy bạn)

#### 4.6.2. Cancel reminder
- **Input**: reminderJobId (hoặc cardId+remindAt)
- **Xử lý**:
  - set status = CANCELED (không xóa để audit)
- **Output**: OK

#### 4.6.3. Worker gửi email
- **Chu kỳ**: 60 giây
- **Query**: `status=PENDING AND remindAt <= now()` limit N
- **Gửi mail**:
  - To: email user
  - Subject: `[TeamHub] Nh���c nhở: {card.title}`
  - Body:
    - Card title
    - Board name
    - Due date (nếu có)
    - Link tới card trên web app
- **Retry**:
  - nếu lỗi: attempts++, lưu lastError
  - nếu attempts > 5 => FAILED
- **Idempotency**:
  - update status theo transaction để tránh gửi 2 lần khi chạy nhiều worker (nâng cao: lock row hoặc update-where-status).

---

## 5. System Design (kiến trúc tổng thể)

### 5.1. Thành phần (components)
1. **Web App (React)**
   - UI: Workspace, Board, Drag-drop, Card modal, Chat box.
   - Kết nối REST API + Socket.IO.

2. **API Server (Express)**
   - REST endpoints (CRUD + auth).
   - Socket.IO gateway:
     - xác thực JWT khi handshake
     - join rooms theo workspace/board
     - broadcast events

3. **Database (PostgreSQL)**
   - Dữ liệu chính (workspaces, boards, lists, cards, messages, reminders…)

4. **Worker (Node/TS)**
   - Poll reminders đến hạn
   - Gửi email SMTP

5. **Redis (nâng cao)**
   - cache board detail
   - rate-limit chat
   - Socket.IO adapter để scale ngang (nhiều api instance)

6. **BullMQ (nâng cao)**
   - event bus cho activity log/notifications
   - pipeline async (không bắt buộc MVP nhưng có trong thiết kế)

### 5.2. Luồng dữ liệu chính
- **CRUD Kanban**: Web -> REST API -> Postgres -> API emit Socket.IO -> các client cập nhật.
- **Chat**: Web -> Socket.IO -> Postgres -> emit workspace room.
- **Reminder**: Web -> REST -> Postgres (ReminderJob) -> Worker poll -> SMTP gửi mail -> update status.

---

## 6. Use Case (danh sách + mô tả ngắn)

### 6.1. Nhóm Auth
- UC-01: Register
- UC-02: Login
- UC-03: Refresh token
- UC-04: Logout

### 6.2. Nhóm Workspace
- UC-10: Create workspace
- UC-11: Invite member via email
- UC-12: Accept invite
- UC-13: View members

### 6.3. Nhóm Chat
- UC-20: Join workspace chat (socket join)
- UC-21: Send message realtime
- UC-22: View chat history

### 6.4. Nhóm Kanban
- UC-30: Create board
- UC-31: Create list
- UC-32: Reorder list (position float)
- UC-33: Create card
- UC-34: Move/reorder card (position float + rebalance)
- UC-35: Update card details
- UC-36: Comment on card
- UC-37: Checklist management
- UC-38: Assign members / apply labels
- UC-39: View activity

### 6.5. Nhóm Reminder
- UC-50: Set reminder (per-user)
- UC-51: Cancel reminder
- UC-52: Worker send email

---

## 7. Sequence diagram (mô tả luồng theo chữ)

### 7.1. Realtime chat
1. Client kết nối Socket.IO kèm access token.
2. Client join room `workspace:{id}`.
3. Client gửi `chat:send`.
4. Server validate membership + insert message vào DB.
5. Server emit `chat:new_message` tới room.
6. Các client hiển thị message.

### 7.2. Move card (Trello-like)
1. User drag card và thả giữa prev/next.
2. Client gọi REST `POST /cards/:id/move` với `toListId`, `prevCardId`, `nextCardId`.
3. Server đọc position của prev/next, tính `newPosition`.
4. Update DB (card.listId, card.position).
5. Emit `board:card_moved` tới room `board:{boardId}`.
6. Các client cập nhật UI theo event.

### 7.3. Reminder email
1. User set remindAt => API tạo ReminderJob (PENDING).
2. Worker poll đến hạn, gửi SMTP.
3. Worker update status SENT/FAILED.

---

## 8. Database design (ERD mô tả bằng chữ)

### 8.1. Bảng chính
- **users**
- **refresh_tokens**
- **workspaces**
- **workspace_members** (many-to-many user-workspace)
- **workspace_invites**
- **workspace_messages**
- **boards**
- **lists**
- **cards**
- **card_assignees**
- **labels**
- **card_labels**
- **checklists**
- **checklist_items**
- **card_comments**
- **reminder_jobs**
- (optional) **activities**

### 8.2. Quan hệ quan trọng
- workspaces 1—N boards
- boards 1—N lists
- lists 1—N cards
- cards N—N users (assignees)
- workspaces 1—N labels; cards N—N labels
- cards 1—N checklists; checklists 1—N items
- cards 1—N comments
- workspaces 1—N messages; users 1—N messages
- cards 1—N reminder_jobs; users 1—N reminder_jobs

### 8.3. Index cần có (tối thiểu)
- cards: index `(listId, position)` để render theo thứ tự
- lists: index `(boardId, position)`
- workspace_messages: `(workspaceId, createdAt)`
- reminder_jobs: `(status, remindAt)` để worker query nhanh

---

## 9. Realtime event contract (Socket.IO)

### 9.1. Rooms
- `workspace:{workspaceId}`: chat + (option) workspace-level events
- `board:{boardId}`: board realtime events

### 9.2. Sự kiện tối thiểu
- Client -> Server
  - `workspace:join { workspaceId }`
  - `board:join { boardId }`
  - `chat:send { workspaceId, content }`

- Server -> Client
  - `chat:new_message { message }`
  - `board:list_created { list }`
  - `board:list_updated { list }`
  - `board:list_reordered { listId, position }`
  - `board:card_created { card }`
  - `board:card_updated { card }`
  - `board:card_moved { cardId, fromListId, toListId, position }`
  - `board:comment_added { comment }`
  - `board:rebalance_done { listId }` (nếu implement)

> Gợi ý: dùng 1 kiểu payload chuẩn:
> `{ type, payload, actorId, ts }` để dễ debug.

---

## 10. API design (mức đặc tả)
> Chỉ là blueprint, bạn có thể đổi path theo ý, nhưng nên giữ nhất quán.

> Nếu bạn đang bắt đầu làm Front-end, xem thêm **hợp đồng FE/BE (MVP)** tại: `docs/api/frontend-contract.md`.

### 10.1. Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /me`

### 10.2. Workspace
- `POST /workspaces`
- `GET /workspaces`
- `GET /workspaces/:id`
- `GET /workspaces/:id/members`
- `PATCH /workspaces/:id/members/:userId` (update role ADMIN/MEMBER)
- `DELETE /workspaces/:id/members/:userId` (remove member)
- `POST /workspaces/:id/leave`
- `POST /invites/workspaces/:workspaceId` (create invite)
- `POST /invites/:token/accept` (accept workspace invite)

### 10.2.1. Users
- `GET /users/search?q=...&workspaceId=...&limit=10`

### 10.3. Chat history
- `GET /workspaces/:id/messages?cursor=...`

### 10.4. Board/List/Card
- `POST /workspaces/:wid/boards`
- `GET /boards/:bid` (board basic)
- `GET /boards/:bid/detail` (one-shot payload: board + lists + cards + labels + members)
- `PATCH /boards/:bid`
- `POST /boards/:bid/lists`
- `PATCH /lists/:lid`
- `POST /lists/:lid/cards`
- `PATCH /cards/:cid`
- `POST /cards/:cid/move` (prev/next + toListId)

### 10.4.1. Board membership & invites
- `POST /boards/:bid/members/by-email`
- `POST /invites/boards/:boardId` (create board invite)
- `POST /invites/boards/token/:token/accept` (accept board invite)

### 10.5. Card details
- `POST /cards/:cid/comments`
- `POST /cards/:cid/checklists`
- `POST /checklists/:id/items`
- `PATCH /checklist-items/:id`
- `POST /cards/:cid/assignees/:userId` (toggle hoặc add/remove)
- `POST /cards/:cid/labels/:labelId` (toggle hoặc add/remove)

### 10.6. Reminder
- `PUT /cards/:cid/reminders` (set)
- `DELETE /cards/:cid/reminders/:reminderJobId` (cancel)
- `GET /cards/:cid/reminders` (list của user hiện tại)

---

## 10.7. Front-end contract (MVP)

Mục tiêu: FE có thể dựng UI Kanban mà không phải đoán payload/flow.

### Payload “one-shot” cho Board
- `GET /boards/:id/detail` trả:
  - `board`
  - `lists[]` (sort theo `position`)
  - `cards[]` (sort theo `position`)
  - `members[]`
  - `labels[]`

### Move/Reorder contract (prev/next)
- List: `POST /lists/:id/move` với `{ prevId, nextId }`
- Card: `POST /cards/:id/move` với `{ listId?, prevId, nextId }`

### Invites centralized
- Workspace invite:
  - `POST /invites/workspaces/:workspaceId`
  - `POST /invites/:token/accept`
- Board invite:
  - `POST /invites/boards/:boardId`
  - `POST /invites/boards/token/:token/accept`

**Policy**: accept invite yêu cầu **email user đăng nhập trùng email invite**.

Chi tiết đầy đủ (request/response samples + flows): `docs/api/frontend-contract.md`.

---

## 11. Nâng cao (để áp dụng Redis + BullMQ đúng nghĩa)

### 11.1. Redis (gợi ý triển khai)
- Cache `GET /boards/:bid` (board detail):
  - key: `board:{bid}:view`
  - TTL: 10–30s hoặc invalidate theo events
- Socket.IO scale:
  - dùng `@socket.io/redis-adapter` khi chạy nhiều instance api
- Rate limit chat:
  - key: `rl:chat:{userId}:{workspaceId}`

### 11.2. BullMQ (gợi ý triển khai)
- Dùng Redis làm backend, enqueue job theo loại:
  - `activity.log.write` (phase 2)
  - `notification.send` (tương lai)
  - `reminder.send` (delay đến `remindAt`)
- Worker consume theo queue + concurrency, và đảm bảo idempotency khi update DB.

> MVP có thể chưa cần BullMQ, nhưng nếu đã chọn BullMQ thì Redis là bắt buộc.

---

## 12. Checklist triển khai (gợi ý thứ tự làm)
1. Setup monorepo + docker-compose (postgres/redis)
2. Prisma schema + migrations
3. Auth JWT + refresh token
4. Workspace + membership + invite email
5. Board/List/Card CRUD + position float + move endpoint + rebalance
6. Socket.IO:
   - auth handshake JWT
   - join rooms
   - emit board events
7. Chat:
   - send message
   - history API
8. Reminder:
   - API set/cancel reminder
   - Worker poll + SMTP send
9. (Nâng cao) Redis cache + BullMQ jobs + activity log async

---

## 13. Tiêu chí hoàn thành (Definition of Done)
- 2 user cùng mở 1 board:
  - kéo card ở user A => user B thấy cập nhật gần như ngay lập tức (realtime).
- Workspace chat:
  - gửi tin nhắn => các member online nhận ngay.
- Reminder:
  - user set reminder => đến thời gian nhận email (SMTP) đúng 1 lần (hoặc retry có kiểm soát).
- Position float:
  - reorder/move mượt, có cơ chế rebalance khi cần.

---

## 14. Gợi ý kiểm thử (Test scenarios)
- Auth:
  - login sai mật khẩu
  - refresh token hết hạn / revoked
- Workspace:
  - invite email đã là member
  - accept token hết hạn
- Kanban:
  - move card vào list rỗng
  - move card lên đầu/cuối
  - kéo thả liên tục nhiều lần để test rebalance
- Chat:
  - user không thuộc workspace nhưng cố join room
- Reminder:
  - remindAt trong quá khứ => reject
  - worker restart không mất job (vì job nằm DB)
  - gửi lỗi SMTP => retry và chuyển FAILED đúng rule

---

## 15. Ghi chú quan trọng về “giống Trello”
- Ưu tiên archive hơn delete.
- Card modal nên hiển thị:
  - title, description
  - members, labels
  - due date + reminder
  - checklist
  - comments + activity
- Board view nên tối ưu:
  - load lists + cards theo position
  - drag-drop UX giống Trello (có placeholder khi kéo)

---

Nếu bạn muốn, bước tiếp theo mình có thể viết thêm **tài liệu DB diagram dạng DBML (dbdiagram.io)** và **API contract chi tiết hơn** (request/response JSON mẫu cho từng endpoint + error codes), để bạn cầm README này là code được theo checklist.